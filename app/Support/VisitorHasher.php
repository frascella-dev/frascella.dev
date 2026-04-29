<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Cookieless, GDPR-friendly visitor identifier. The salt rotates every
 * calendar day and is dropped from the cache 48h later, so a visitor_hash
 * older than that window can no longer be recomputed from a fresh IP+UA —
 * the original PII is effectively unrecoverable.
 *
 * Used by analytics for unique-visitor counts, and by the contact form to
 * cap abuse without storing raw IPs.
 */
class VisitorHasher
{
    public const SALT_TTL_SECONDS = 60 * 60 * 48;

    public static function hash(string $ip, string $ua): string
    {
        return hash('sha256', self::dailySalt() . '|' . $ip . '|' . $ua);
    }

    /**
     * Daily-rotating salt cached so today's hash stays stable for ~24h and
     * yesterday's becomes uncomputable after 48h.
     */
    public static function dailySalt(): string
    {
        $key = 'visitor:salt:' . CarbonImmutable::now()->format('Y-m-d');

        return Cache::remember(
            $key,
            self::SALT_TTL_SECONDS,
            fn () => Str::random(64),
        );
    }
}
