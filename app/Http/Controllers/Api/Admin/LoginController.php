<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoginController extends Controller
{
    public function __construct(private readonly AdminAuthService $auth)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = $this->auth->authenticate(
            $credentials['email'],
            $credentials['password'],
            $request->ip() ?? '',
        );
        $this->auth->beginTwoFactorChallenge($request, $user);

        return response()->json([
            'status' => 'two_factor_required',
            'next' => route('admin.two-factor.show'),
        ]);
    }
}
