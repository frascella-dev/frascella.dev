<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Console\Command;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\error;
use function Laravel\Prompts\info;
use function Laravel\Prompts\text;

class ResetTwoFactor extends Command
{
    protected $signature = 'admin:reset-2fa';

    protected $description = 'Reset and re-enroll 2FA for an existing user interactively.';

    public function handle(TwoFactorService $twoFactor): int
    {
        $email = text(
            label: 'Email of the user whose 2FA should be reset',
            required: true,
        );
        $email = strtolower(trim($email));

        $user = User::where('email', $email)->first();
        if (!$user) {
            error("No user found with email {$email}.");
            return self::FAILURE;
        }

        info("Resetting 2FA for {$user->name} <{$user->email}>.");

        if (!confirm(
            label: 'This will invalidate the current authenticator. Continue?',
            default: false,
        )) {
            info('Aborted. 2FA not changed.');
            return self::SUCCESS;
        }

        $secret = $twoFactor->generateSecret();
        $otpauthUri = $twoFactor->buildOtpauthUri($user, $secret);

        $this->newLine();
        info('Scan this NEW QR code with your authenticator app:');
        $this->newLine();
        $this->line($twoFactor->renderQrForTerminal($otpauthUri));
        $this->newLine();
        $this->line("  <fg=gray>Manual entry secret:</>");
        $this->line("  <fg=cyan>{$secret}</>");
        $this->newLine();

        while (true) {
            $code = text(
                label: 'Enter the 6-digit code from your authenticator',
                required: true,
                validate: fn ($v) => preg_match('/^\d{6}$/', trim($v)) ? null : 'Code must be exactly 6 digits.',
            );

            if ($twoFactor->verify($secret, $code)) {
                break;
            }

            error('Invalid code. Try again.');

            if (!confirm('Retry?', default: true)) {
                info('Aborted. 2FA was NOT updated — the old authenticator still works.');
                return self::FAILURE;
            }
        }

        // Only after confirmation do we persist the new secret. This way a
        // failed reset leaves the account's existing 2FA intact.
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ])->save();

        $this->newLine();
        info("✓ 2FA reset for {$user->email}. Old authenticator tokens will no longer work.");
        return self::SUCCESS;
    }
}
