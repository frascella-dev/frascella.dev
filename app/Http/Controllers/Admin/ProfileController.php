<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AvatarService;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactor,
        private readonly AvatarService $avatars,
    ) {
    }

    public function show(Request $request): Response
    {
        $user = $request->user();

        $twoFactor = [
            'confirmed_at' => $user->two_factor_confirmed_at?->toIso8601String(),
            'pending' => null,
        ];

        // Mid-rotation: surface the QR + otpauth URI so the UI can render a
        // re-enrollment flow without a second round-trip.
        if ($user->hasPendingTwoFactorRotation()) {
            $uri = $this->twoFactor->buildOtpauthUri(
                $user,
                $user->two_factor_secret_pending,
            );
            $twoFactor['pending'] = [
                'qr' => $this->twoFactor->renderQrForBrowser($uri),
                'uri' => $uri,
            ];
        }

        return Inertia::render('Admin/Profile', [
            'twoFactor' => $twoFactor,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        $user->fill($data)->save();

        return redirect()->route('admin.profile.show');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        return redirect()->route('admin.profile.show');
    }

    /**
     * Begin a 2FA device rotation. Generates a new secret and stores it in
     * the pending slot — the currently active secret stays usable for login
     * until the user scans the new QR and confirms below.
     */
    public function resetTwoFactor(Request $request): RedirectResponse
    {
        $user = $request->user();

        $user->forceFill([
            'two_factor_secret_pending' => $this->twoFactor->generateSecret(),
        ])->save();

        return redirect()->route('admin.profile.show');
    }

    public function confirmTwoFactor(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        if (!$user->hasPendingTwoFactorRotation()) {
            // Nothing to confirm — either the flow was abandoned or someone
            // is replaying an old form submission.
            return redirect()->route('admin.profile.show');
        }

        if (!$this->twoFactor->verify($user->two_factor_secret_pending, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired. Try again.',
            ]);
        }

        $user->forceFill([
            'two_factor_secret' => $user->two_factor_secret_pending,
            'two_factor_secret_pending' => null,
            'two_factor_confirmed_at' => now(),
        ])->save();

        return redirect()->route('admin.profile.show');
    }

    public function cancelTwoFactor(Request $request): RedirectResponse
    {
        $user = $request->user();

        $user->forceFill(['two_factor_secret_pending' => null])->save();

        return redirect()->route('admin.profile.show');
    }

    public function uploadAvatar(Request $request): RedirectResponse
    {
        $data = $request->validate([
            // 5 MB ceiling — avatars don't need more and we're not resizing.
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,avif,gif', 'max:5120'],
        ]);

        $this->avatars->set($request->user(), $data['avatar']);

        return redirect()->route('admin.profile.show');
    }

    public function deleteAvatar(Request $request): RedirectResponse
    {
        $this->avatars->remove($request->user());

        return redirect()->route('admin.profile.show');
    }
}
