<?php

namespace App\Console\Commands;

use App\Models\AuthFailure;
use App\Models\IpLockout;
use App\Support\IpHasher;
use Illuminate\Console\Command;

class UnlockIp extends Command
{
    protected $signature = 'admin:unlock-ip {ip : IP address to unlock (raw, not hashed)}';

    protected $description = 'Clear an IP-level lockout and the recent failure log for the given IP.';

    public function handle(): int
    {
        $ip = (string) $this->argument('ip');

        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            $this->error("Not a valid IP address: {$ip}");
            return self::FAILURE;
        }

        $hash = IpHasher::hash($ip);

        $lockouts = IpLockout::where('ip_hash', $hash)->delete();
        $failures = AuthFailure::where('ip_hash', $hash)->delete();

        if ($lockouts > 0) {
            $this->info("IP {$ip} unlocked.");
        } else {
            $this->info("IP {$ip} was not locked.");
        }
        $this->line("Cleared {$failures} recent failure(s) from {$ip}.");

        return self::SUCCESS;
    }
}
