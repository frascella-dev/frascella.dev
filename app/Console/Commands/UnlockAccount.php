<?php

namespace App\Console\Commands;

use App\Models\AuthFailure;
use App\Models\User;
use Illuminate\Console\Command;

class UnlockAccount extends Command
{
    protected $signature = 'admin:unlock-account {email : Account email to unlock}';

    protected $description = 'Clear an account-level lockout and the recent failure log for the given email.';

    public function handle(): int
    {
        $email = strtolower((string) $this->argument('email'));

        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("No user with email {$email}.");
            return self::FAILURE;
        }

        $wasLocked = $user->locked_until && $user->locked_until->isFuture();

        if ($wasLocked) {
            $user->forceFill(['locked_until' => null])->save();
            $this->info("Account {$email} unlocked.");
        } else {
            $this->info("Account {$email} was not locked.");
        }

        $failures = AuthFailure::where('email', $email)->delete();
        $this->line("Cleared {$failures} recent failure(s) for {$email}.");

        return self::SUCCESS;
    }
}
