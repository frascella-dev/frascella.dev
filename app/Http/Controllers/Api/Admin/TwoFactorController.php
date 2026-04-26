<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminAuthService;
use App\Services\Admin\BruteForceGuard;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    public function __construct(
        private readonly AdminAuthService $auth,
        private readonly TwoFactorService $twoFactor,
        private readonly BruteForceGuard $guard,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $this->auth->pendingUser($request);

        if (!$user || !$user->hasConfirmedTwoFactor()) {
            $this->auth->abandonTwoFactorChallenge($request);

            return response()->json([
                'status' => 'challenge_expired',
                'next' => route('admin.login'),
            ], 410);
        }

        $ip = $request->ip() ?? '';

        $this->guard->assertAllowed($user->email, $ip);

        if (!$this->twoFactor->verify($user->two_factor_secret, $data['code'])) {
            $this->guard->recordFailure('otp', $ip, $user->email, $user);

            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired. Try again.',
            ]);
        }

        $this->guard->clearForIp($ip);
        $this->auth->completeTwoFactorChallenge($request, $user);

        return response()->json([
            'status' => 'authenticated',
            'next' => route('admin.dashboard'),
        ]);
    }
}
