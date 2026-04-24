<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsurePendingTwoFactor;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorController extends Controller
{
    public function __construct(private readonly TwoFactorService $twoFactor)
    {
    }

    public function show(): Response
    {
        return Inertia::render('Admin/TwoFactor');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $userId = $request->session()->get(EnsurePendingTwoFactor::SESSION_KEY);
        $user = User::find($userId);

        if (!$user || !$user->hasConfirmedTwoFactor()) {
            // Session was tampered with or the user was deleted mid-flow.
            $request->session()->forget(EnsurePendingTwoFactor::SESSION_KEY);
            return redirect()->route('admin.login');
        }

        if (!$this->twoFactor->verify($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired. Try again.',
            ]);
        }

        // OTP valid — promote to a full session, drop the pending marker,
        // rotate the session id to prevent fixation.
        Auth::login($user);
        $request->session()->forget(EnsurePendingTwoFactor::SESSION_KEY);
        $request->session()->regenerate();

        return redirect()->intended(route('admin.dashboard'));
    }
}
