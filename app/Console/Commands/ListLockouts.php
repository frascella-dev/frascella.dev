<?php

namespace App\Console\Commands;

use App\Models\IpLockout;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ListLockouts extends Command
{
    protected $signature = 'admin:list-lockouts';

    protected $description = 'List active account and IP lockouts.';

    public function handle(): int
    {
        $now = Carbon::now();

        $accounts = User::query()
            ->whereNotNull('locked_until')
            ->where('locked_until', '>', $now)
            ->orderBy('locked_until')
            ->get(['email', 'locked_until']);

        $this->newLine();
        $this->components->twoColumnDetail('<fg=cyan>Locked accounts</>', (string) $accounts->count());

        if ($accounts->isNotEmpty()) {
            $this->table(
                ['Email', 'Locked until', 'In'],
                $accounts->map(fn ($u) => [
                    $u->email,
                    $u->locked_until->toDayDateTimeString(),
                    $u->locked_until->diffForHumans(null, true),
                ])->toArray(),
            );
        }

        $ips = IpLockout::query()
            ->where('locked_until', '>', $now)
            ->orderBy('locked_until')
            ->get();

        $this->newLine();
        $this->components->twoColumnDetail('<fg=cyan>Locked IPs</>', (string) $ips->count());

        if ($ips->isNotEmpty()) {
            $this->table(
                ['IP hash (prefix)', 'Locked until', 'In', 'Reason'],
                $ips->map(fn ($l) => [
                    substr($l->ip_hash, 0, 12) . '…',
                    $l->locked_until->toDayDateTimeString(),
                    $l->locked_until->diffForHumans(null, true),
                    $l->reason ?? '—',
                ])->toArray(),
            );
            $this->line('  Use `admin:unlock-ip {ip}` with the raw IP (the hash is one-way).');
        }

        $this->newLine();

        return self::SUCCESS;
    }
}
