<?php

namespace App\Services\Admin;

use App\Http\Middleware\EnsurePendingTwoFactor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Owns the two-step admin login flow: password → pending-2FA session →
 * OTP verification → full Auth login.
 */
class AdminAuthService
{
    /**
     * Verify the credentials and return the user ready for the 2FA step.
     *
     * Emits a generic "auth.failed" on either unknown email or wrong password
     * so we don't leak which emails exist.
     */
    public function authenticate(string $email, string $password): User
    {
        $user = User::where('email', strtolower($email))->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (!$user->hasConfirmedTwoFactor()) {
            // A user with no 2FA confirmed shouldn't exist in this admin, but
            // we still guard in case an artisan setup was abandoned midway.
            throw ValidationException::withMessages([
                'email' => 'This account has no 2FA configured. Ask an admin to re-enroll it.',
            ]);
        }

        return $user;
    }

    /**
     * After the password step succeeds, park the user id in session so the
     * 2FA challenge route can find it. We deliberately avoid Auth::login()
     * until OTP verification succeeds.
     */
    public function beginTwoFactorChallenge(Request $request, User $user): void
    {
        $request->session()->regenerate();
        $request->session()->put(EnsurePendingTwoFactor::SESSION_KEY, $user->id);
    }

    /**
     * Resolve the user whose OTP challenge is currently pending, or null
     * when the session has drifted (e.g. tampered cookie or deleted user).
     */
    public function pendingUser(Request $request): ?User
    {
        $userId = $request->session()->get(EnsurePendingTwoFactor::SESSION_KEY);
        if (!$userId) {
            return null;
        }

        return User::find($userId);
    }

    /**
     * Promote a pending-2FA user to a real signed-in session. Rotates the
     * session id to prevent fixation and drops the pending marker.
     */
    public function completeTwoFactorChallenge(Request $request, User $user): void
    {
        Auth::login($user);
        $request->session()->forget(EnsurePendingTwoFactor::SESSION_KEY);
        $request->session()->regenerate();
    }

    public function abandonTwoFactorChallenge(Request $request): void
    {
        $request->session()->forget(EnsurePendingTwoFactor::SESSION_KEY);
    }
}
