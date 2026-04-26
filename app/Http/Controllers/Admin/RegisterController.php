<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminInvitationService;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RegisterController extends Controller
{
    public function __construct(
        private readonly AdminInvitationService $invitations,
        private readonly TwoFactorService $twoFactor,
    ) {
    }

    public function show(string $token): Response|RedirectResponse
    {
        $invitation = $this->invitations->findOpen($token);

        if (!$invitation) {
            return Inertia::render('Admin/RegisterInvalid');
        }

        $invitation = $this->invitations->ensureSecret($invitation);
        $uri = $this->twoFactor->buildOtpauthUri(
            // The User model is overkill just to compose an otpauth URI —
            // Google2FA only reads name + email. We pass a fluent stand-in.
            new \App\Models\User([
                'name' => 'Admin',
                'email' => $invitation->email,
            ]),
            $invitation->two_factor_secret,
        );

        return Inertia::render('Admin/Register', [
            'token' => $token,
            'email' => $invitation->email,
            'twoFactor' => [
                'qr' => $this->twoFactor->renderQrForBrowser($uri),
                'uri' => $uri,
            ],
            'expiresAt' => $invitation->expires_at->toIso8601String(),
            'minPasswordLength' => AdminInvitationService::MIN_PASSWORD_LENGTH,
        ]);
    }
}
