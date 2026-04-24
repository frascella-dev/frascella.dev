<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\error;
use function Laravel\Prompts\info;
use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

class CreateAdminUser extends Command
{
    protected $signature = 'admin:create-user';

    protected $description = 'Create an admin user interactively with 2FA enrollment.';

    public function handle(TwoFactorService $twoFactor): int
    {
        info('Creating a new admin user.');

        $name = text(
            label: 'Name',
            required: true,
            hint: 'Mario Rossi',
            validate: fn($v) => strlen(trim($v)) < 2 ? 'Name must be at least 2 characters.' : null,
        );

        $email = text(
            label: 'Email',
            required: true,
            hint: 'mario@example.com',
            validate: function ($v) {
                $v = strtolower(trim($v));
                $validator = Validator::make(['email' => $v], ['email' => 'required|email']);
                if ($validator->fails()) {
                    return 'Invalid email address.';
                }
                if (User::where('email', $v)->exists()) {
                    return 'A user with this email already exists.';
                }
                return null;
            },
        );
        $email = strtolower(trim($email));

        $passwordValue = password(
            label: 'Password',
            required: true,
            validate: fn($v) => strlen($v) < 12 ? 'Password must be at least 12 characters.' : null,
        );

        $passwordConfirm = password(label: 'Confirm password', required: true);
        if ($passwordValue !== $passwordConfirm) {
            error('Passwords do not match. Aborting.');
            return self::FAILURE;
        }

        // Generate the 2FA secret BEFORE persisting the user so we never
        // leave a half-configured row in the database.
        $secret = $twoFactor->generateSecret();

        // Build a temporary User instance just to compose the otpauth URI
        // (email-bound). No DB writes yet.
        $pendingUser = new User(['name' => $name, 'email' => $email]);
        $otpauthUri = $twoFactor->buildOtpauthUri($pendingUser, $secret);

        $this->newLine();
        info('Scan this QR code with your authenticator app (Google Authenticator, 1Password, Authy, …):');
        $this->newLine();
        $this->line($twoFactor->renderQrForTerminal($otpauthUri));
        $this->newLine();
        $this->line("  <fg=gray>If you can't scan, enter the secret manually:</>");
        $this->line("  <fg=cyan>{$secret}</>");
        $this->newLine();

        // Loop until confirmation or abort
        while (true) {
            $code = text(
                label: 'Enter the 6-digit code shown in your authenticator',
                required: true,
                validate: fn($v) => preg_match('/^\d{6}$/', trim($v)) ? null : 'Code must be exactly 6 digits.',
            );

            if ($twoFactor->verify($secret, $code)) {
                break;
            }

            error('Invalid code. Try again.');

            if (!confirm('Retry?', default: true)) {
                info('Aborted. No user was created.');
                return self::FAILURE;
            }
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($passwordValue),
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->newLine();
        info("✓ Admin user created — id: {$user->id}, email: {$user->email}");
        return self::SUCCESS;
    }
}
