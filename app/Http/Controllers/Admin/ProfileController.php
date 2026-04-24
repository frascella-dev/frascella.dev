<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\ProfileService;
use App\Services\AvatarService;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(
        private readonly ProfileService $profiles,
        private readonly TwoFactorService $twoFactor,
        private readonly AvatarService $avatars,
    ) {
    }

    public function show(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Admin/Profile', [
            'twoFactor' => [
                'confirmed_at' => $user->two_factor_confirmed_at?->toIso8601String(),
                'pending' => $this->twoFactor->pendingRotationPayload($user),
            ],
            'avatarUploadLimitKb' => self::uploadLimitKb(),
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

        $this->profiles->updateProfile($user, $data);

        return redirect()->route('admin.profile.show');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $this->profiles->changePassword(
            $request->user(),
            $data['current_password'],
            $data['password'],
        );

        return redirect()->route('admin.profile.show');
    }

    public function resetTwoFactor(Request $request): RedirectResponse
    {
        $this->twoFactor->beginRotation($request->user());

        return redirect()->route('admin.profile.show');
    }

    public function confirmTwoFactor(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $confirmed = $this->twoFactor->confirmRotation($request->user(), $data['code']);

        if (!$confirmed) {
            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired. Try again.',
            ]);
        }

        return redirect()->route('admin.profile.show');
    }

    public function cancelTwoFactor(Request $request): RedirectResponse
    {
        $this->twoFactor->cancelRotation($request->user());

        return redirect()->route('admin.profile.show');
    }

    public function uploadAvatar(Request $request): RedirectResponse
    {
        $data = $request->validate([
            // Cap to whatever the current PHP build actually accepts — using
            // a higher limit than the ini just surfaces as a silent
            // UPLOAD_ERR_INI_SIZE with the confusing "field is required"
            // fallback message, because $_FILES never gets populated.
            'avatar' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp,avif,gif',
                'max:' . self::uploadLimitKb(),
            ],
        ]);

        $this->avatars->set($request->user(), $data['avatar']);

        return redirect()->route('admin.profile.show');
    }

    public function deleteAvatar(Request $request): RedirectResponse
    {
        $this->avatars->remove($request->user());

        return redirect()->route('admin.profile.show');
    }

    /**
     * The largest single-file upload the running PHP config accepts, in KB,
     * with a small safety margin so multipart overhead doesn't push the
     * whole request past post_max_size.
     */
    public static function uploadLimitKb(): int
    {
        $bytes = min(
            self::parseIniBytes((string) ini_get('upload_max_filesize')),
            self::parseIniBytes((string) ini_get('post_max_size')),
        );

        return max(256, (int) floor(($bytes - 2048) / 1024));
    }

    private static function parseIniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (int) $value;

        return match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
