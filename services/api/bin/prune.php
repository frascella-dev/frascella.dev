<?php

/**
 * Drops analytics data past the retention window, and expired admin
 * sessions. Meant for cron — daily is plenty:
 *
 *   0 4 * * *  cd /home/<user>/htdocs/<domain>/app && php bin/prune.php >> var/prune.log 2>&1
 *
 * The window comes from ANALYTICS_RETENTION_DAYS (default 400). Keeping data
 * no longer than it is useful is both the GDPR position and the reason the
 * SQLite file stays small.
 */

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use Api\Env;
use Api\Schema;

$days = max(1, (int) (Env::get('ANALYTICS_RETENTION_DAYS', '400') ?? '400'));

try {
    $removed = Schema::prune($days);
} catch (Throwable $e) {
    fwrite(STDERR, "Prune failed: {$e->getMessage()}\n");
    exit(1);
}

$stamp = date('Y-m-d H:i:s');
$parts = [];
foreach ($removed as $table => $count) {
    $parts[] = "{$table}={$count}";
}
echo "[{$stamp}] retention {$days}d — removed " . implode(' ', $parts) . "\n";
