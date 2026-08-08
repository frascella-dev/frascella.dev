<?php

declare(strict_types=1);

namespace Api;

/**
 * Fixed-window rate limiting and cooldowns on the filesystem.
 *
 * The NestJS service kept this state in process memory; PHP-FPM has no
 * memory between requests, so each key lives in a small JSON file under
 * `var/state`, updated under an exclusive flock. No database — the same
 * "no persistence beyond what the job needs" rule the service has always
 * followed.
 */
final class RateLimiter
{
    public function __construct(private readonly string $dir)
    {
        if (!is_dir($this->dir)) {
            @mkdir($this->dir, 0775, true);
        }
    }

    /**
     * Counts one hit against `key`. Returns false when the key is over its
     * limit for the current window.
     */
    public function hit(string $key, int $limit, int $ttlSeconds): bool
    {
        $now = time();
        $allowed = true;

        $this->withFile($key, function (array $state) use ($now, $limit, $ttlSeconds, &$allowed): array {
            if (($state['start'] ?? 0) + $ttlSeconds <= $now) {
                $state = ['start' => $now, 'count' => 0];
            }
            if (($state['count'] ?? 0) >= $limit) {
                $allowed = false;
                return $state;
            }
            $state['count'] = ($state['count'] ?? 0) + 1;
            return $state;
        });

        // Occasionally sweep expired windows so var/state stays small.
        if (random_int(0, 99) === 0) {
            $this->prune();
        }

        return $allowed;
    }

    /**
     * True when `key` was touched less than $ttlSeconds ago. Read-only:
     * arming is a separate, explicit `touch`, because the per-email
     * cooldown must only start once a message actually went out — a failed
     * send should not lock the sender out for the whole window.
     */
    public function isOnCooldown(string $key, int $ttlSeconds): bool
    {
        $active = false;
        $this->withFile($key, function (array $state) use ($ttlSeconds, &$active): array {
            $active = ($state['start'] ?? 0) + $ttlSeconds > time();
            return $state;
        });
        return $active;
    }

    /** Marks `key` as fired now — starts its cooldown window. */
    public function touch(string $key): void
    {
        $this->withFile($key, fn (): array => ['start' => time(), 'count' => 1]);
    }

    /** Read-modify-write of one key's state file, exclusively locked. */
    private function withFile(string $key, callable $update): void
    {
        $path = $this->dir . '/' . hash('sha256', $key) . '.json';
        $fh = fopen($path, 'c+');
        if ($fh === false) {
            return; // storage unavailable — fail open rather than 500
        }
        try {
            flock($fh, LOCK_EX);
            $raw = stream_get_contents($fh) ?: '';
            $state = json_decode($raw, true);
            $state = $update(is_array($state) ? $state : []);
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($state));
        } finally {
            flock($fh, LOCK_UN);
            fclose($fh);
        }
    }

    /** Drops state files old enough to be outside every window in use. */
    private function prune(): void
    {
        $cutoff = time() - 2 * 3600;
        foreach (glob($this->dir . '/*.json') ?: [] as $file) {
            if ((@filemtime($file) ?: PHP_INT_MAX) < $cutoff) {
                @unlink($file);
            }
        }
    }
}
