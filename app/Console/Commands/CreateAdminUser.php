<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Admin\AdminInvitationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\error;
use function Laravel\Prompts\info;
use function Laravel\Prompts\text;

class CreateAdminUser extends Command
{
    protected $signature = 'admin:create-user {--email=}';

    protected $description = 'Email an invitation link so a new admin can self-enroll (password + 2FA) via the web.';

    public function handle(AdminInvitationService $invitations): int
    {
        $email = $this->option('email')
            ?: text(
                label: 'Admin email',
                required: true,
                hint: 'mario@example.com',
            );

        $email = strtolower(trim($email));

        $validator = Validator::make(
            ['email' => $email],
            ['email' => 'required|email'],
        );
        if ($validator->fails()) {
            error('Invalid email address.');
            return self::FAILURE;
        }

        if (User::where('email', $email)->exists()) {
            error('A user with this email already exists.');
            return self::FAILURE;
        }

        $result = $invitations->invite($email);

        info("Invitation sent to {$email}.");
        $this->line('  <fg=gray>Registration link (for fallback):</>');
        $this->line("  <fg=cyan>{$result['url']}</>");
        $this->line('  <fg=gray>Expires: '
            . $result['invitation']->expires_at->format('Y-m-d H:i') . ' UTC</>');

        return self::SUCCESS;
    }
}
