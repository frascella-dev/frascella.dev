<?php

/**
 * Shared preamble for the CLI scripts in this directory: autoloader, .env,
 * and the database root — resolved for both layouts the API runs in (the
 * repo, and the deployed app/ directory next to the document root).
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$appRoot = is_dir(__DIR__ . '/../src')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2) . '/app';

if (!is_file($appRoot . '/vendor/autoload.php')) {
    fwrite(STDERR, "Dependencies are missing. Run, in $appRoot:\n\n    composer install --no-dev --optimize-autoloader\n\n");
    exit(1);
}

require $appRoot . '/vendor/autoload.php';

Api\Env::load($appRoot . '/.env');
Api\Db::init($appRoot);

return $appRoot;
