<?php

namespace App\Services\Admin;

use App\Models\AdminInvitation;
use App\Models\User;
use App\Notifications\AdminInvitationNotification;
use App\Services\TwoFactorService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class AdminInvitationService
{
    public const EXPIRY_HOURS = 72;
    public const MIN_PASSWORD_LENGTH = 12;

    public function __construct(private readonly TwoFactorService $twoFactor)
    {
    }

    /**
     * Issue a fresh invitation for an email and email the registration link.
     * Wipes any prior pending invitation for the same address so the latest
     * one is always the canonical link.
     *
     * @return array{invitation: AdminInvitation, url: string}
     */
    public function invite(string $email): array
    {
        $email = strtolower(trim($email));
        $token = Str::random(48);

        $invitation = DB::transaction(function () use ($email, $token) {
            AdminInvitation::where('email', $email)
                ->whereNull('used_at')
                ->delete();

            return AdminInvitation::create([
                'email' => $email,
                'token_hash' => AdminInvitation::hashToken($token),
                'expires_at' => CarbonImmutable::now()
                    ->addHours(self::EXPIRY_HOURS),
            ]);
        });

        $url = url('/admin/register/' . $token);

        Notification::route('mail', $email)
            ->notify(new AdminInvitationNotification($url, $invitation->expires_at));

        return ['invitation' => $invitation, 'url' => $url];
    }

    /**
     * Resolve a raw token to an open invitation, or null when missing,
     * expired, or already used.
     */
    public function findOpen(string $token): ?AdminInvitation
    {
        $invitation = AdminInvitation::where(
            'token_hash',
            AdminInvitation::hashToken($token),
        )->first();

        if (!$invitation || !$invitation->isOpen()) {
            return null;
        }

        return $invitation;
    }

    /**
     * Lazily attach a fresh 2FA secret on the first GET of the register
     * page — keeps the QR stable across reloads while the invitation is
     * still open.
     */
    public function ensureSecret(AdminInvitation $invitation): AdminInvitation
    {
        if ($invitation->two_factor_secret !== null) {
            return $invitation;
        }

        $invitation->forceFill([
            'two_factor_secret' => $this->twoFactor->generateSecret(),
        ])->save();

        return $invitation->refresh();
    }

    /**
     * Final step of the web flow: turn an open invitation + verified OTP
     * into a real admin user, then mark the invitation consumed.
     */
    public function consume(
        AdminInvitation $invitation,
        string $name,
        string $password,
    ): User {
        return DB::transaction(function () use ($invitation, $name, $password) {
            $user = User::create([
                'name' => $name,
                'email' => $invitation->email,
                'password' => Hash::make($password),
                'two_factor_secret' => $invitation->two_factor_secret,
                'two_factor_confirmed_at' => CarbonImmutable::now(),
            ]);

            $invitation->markUsed();

            return $user;
        });
    }
}
