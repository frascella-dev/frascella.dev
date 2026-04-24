<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsurePendingTwoFactor;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
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

        $user = User::where('email', strtolower($credentials['email']))->first();

        // Generic failure message for both unknown email and wrong password —
        // avoids leaking which emails exist.
        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // Accounts without confirmed 2FA can't log in — this project mandates
        // it, and admin enrolment happens via the artisan command.
        if (!$user->hasConfirmedTwoFactor()) {
            throw ValidationException::withMessages([
                'email' => 'This account has no 2FA configured. Ask an admin to re-enroll it.',
            ]);
        }

        // Credentials valid — park the user id in session and move to step 2.
        // We deliberately DO NOT call Auth::login() yet.
        $request->session()->regenerate();
        $request->session()->put(EnsurePendingTwoFactor::SESSION_KEY, $user->id);

        return redirect()->route('admin.two-factor.show');
    }
}
