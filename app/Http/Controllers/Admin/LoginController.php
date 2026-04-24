<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminAuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    public function __construct(private readonly AdminAuthService $auth)
    {
    }

    public function show(): Response
    {
        return Inertia::render('Admin/Login');
    }

    public function store(Request $request): RedirectResponse
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

        return redirect()->route('admin.two-factor.show');
    }
}
