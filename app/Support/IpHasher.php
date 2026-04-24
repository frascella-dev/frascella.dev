<?php

namespace App\Support;

/**
 * Single source of truth for the IP-to-hash function used by analytics and
 * the brute-force guard. Keeping both callers on the same salted sha256 means
 * a lockout by IP is consistent with the visit rows attributed to that IP.
 */
class IpHasher
{
    public static function hash(string $ip): string
    {
        return hash('sha256', $ip . config('app.key'));
    }
}
