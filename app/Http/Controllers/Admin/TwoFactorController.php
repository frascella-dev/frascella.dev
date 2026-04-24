<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminAuthService;
use App\Services\Admin\BruteForceGuard;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorController extends Controller
{
    public function __construct(
        private readonly AdminAuthService $auth,
        private readonly TwoFactorService $twoFactor,
        private readonly BruteForceGuard $guard,
    ) {
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

        $user = $this->auth->pendingUser($request);

        if (!$user || !$user->hasConfirmedTwoFactor()) {
            $this->auth->abandonTwoFactorChallenge($request);

            return redirect()->route('admin.login');
        }

        $ip = $request->ip() ?? '';

        // Pre-flight lockout check against the pending user's email + the
        // current IP. Throws ValidationException if either is locked.
        $this->guard->assertAllowed($user->email, $ip);

        if (!$this->twoFactor->verify($user->two_factor_secret, $data['code'])) {
            $this->guard->recordFailure('otp', $ip, $user->email, $user);

            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired. Try again.',
            ]);
        }

        $this->guard->clearForIp($ip);
        $this->auth->completeTwoFactorChallenge($request, $user);

        return redirect()->intended(route('admin.dashboard'));
    }
}
