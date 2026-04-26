<?php

namespace App\Console\Commands;

use App\Services\AnalyticsService;
use Illuminate\Console\Command;

class PruneAnalytics extends Command
{
    protected $signature = 'analytics:prune';

    protected $description = 'Drop analytics events older than the retention window (90 days).';

    public function handle(AnalyticsService $analytics): int
    {
        $deleted = $analytics->pruneOldEvents();

        $this->info("Pruned {$deleted} analytics events older than "
            . AnalyticsService::RETENTION_DAYS . ' days.');

        return self::SUCCESS;
    }
}
