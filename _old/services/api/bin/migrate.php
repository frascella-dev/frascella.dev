<?php

/**
 * Applies any migration that has not run yet, then stops.
 *
 * Safe on every deploy: already-applied versions are recorded in
 * `schema_migrations` and skipped, so a second run prints "nothing to do".
 *
 *   php bin/migrate.php
 */

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use Api\Db;
use Api\Schema;

try {
    $applied = Schema::migrate();
} catch (Throwable $e) {
    fwrite(STDERR, "Migration failed: {$e->getMessage()}\n");
    exit(1);
}

$where = Db::driver() === 'sqlite' ? Db::sqlitePath() : 'mysql:' . getenv('DB_HOST');
echo "database: " . Db::driver() . " ({$where})\n";

if ($applied === []) {
    echo "nothing to do — schema is up to date.\n";
    exit(0);
}

foreach ($applied as $version) {
    echo "applied {$version}\n";
}
echo count($applied) . " migration(s) applied.\n";
