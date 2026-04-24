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
    public function __construct(private readonly BruteForceGuard $guard)
    {
    }

    /**
     * Verify the credentials and return the user ready for the 2FA step.
     *
     * Emits a generic "auth.failed" on either unknown email or wrong password
     * so we don't leak which emails exist.
     */
    public function authenticate(string $email, string $password, string $ip): User
    {
        // Pre-flight: throws if either the IP or account is already locked.
        $this->guard->assertAllowed($email, $ip);

        $user = User::where('email', strtolower($email))->first();

        if (!$user || !Hash::check($password, $user->password)) {
            $this->guard->recordFailure('password', $ip, $email, $user);

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (!$user->hasConfirmedTwoFactor()) {
            // Not a credentials failure — don't count it toward lockout, but
            // still refuse the login.
            throw ValidationException::withMessages([
                'email' => 'This account has no 2FA configured. Ask an admin to re-enroll it.',
            ]);
        }

        // Password correct — wipe the IP's failure budget so a legitimate
        // user who mistyped a few times isn't left one miss from lockout.
        $this->guard->clearForIp($ip);

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
