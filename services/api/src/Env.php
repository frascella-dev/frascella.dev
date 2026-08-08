<?php

declare(strict_types=1);

namespace Api;

/**
 * Minimal .env loader. Real environment variables win over the file, so a
 * host that injects config (CloudPanel, containers) needs no .env at all.
 */
final class Env
{
    /** @var array<string, string> */
    private static array $fileVars = [];

    public static function load(string $path): void
    {
        if (!is_readable($path)) {
            return;
        }
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            // Strip one layer of quotes, the way dotenv tooling does.
            if (preg_match('/^(["\'])(.*)\1$/s', $value, $m)) {
                $value = $m[2];
            }
            self::$fileVars[$key] = $value;
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $real = getenv($key);
        if ($real !== false && $real !== '') {
            return $real;
        }
        $fromFile = self::$fileVars[$key] ?? null;
        if ($fromFile !== null && $fromFile !== '') {
            return $fromFile;
        }
        return $default;
    }
}
