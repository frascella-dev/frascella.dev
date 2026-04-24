<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePendingTwoFactor
{
    public const SESSION_KEY = 'auth.two_factor.pending_user_id';

    /**
     * Gate the 2FA challenge screen to users who already cleared
     * email/password. Without a pending id in session, we bounce
     * them back to the login form.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->session()->has(self::SESSION_KEY)) {
            return redirect()->route('admin.login');
        }

        return $next($request);
    }
}
