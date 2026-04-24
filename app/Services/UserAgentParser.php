<?php

namespace App\Services;

/**
 * Minimal user-agent fingerprinter.
 *
 * Intentionally regex-based rather than pulling a heavy UA database — we only
 * need coarse buckets (device_type + browser + os) to drive dashboard GROUP BY
 * queries, not per-version precision.
 */
class UserAgentParser
{
    private const BOT_PATTERN = '/(bot|crawl|spider|slurp|wget|curl|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|slackbot|preview|lighthouse|headless|ahrefs|semrush)/i';

    /**
     * @return array{device_type: ?string, browser: ?string, os: ?string}
     */
    public static function parse(?string $ua): array
    {
        if (!$ua) {
            return ['device_type' => null, 'browser' => null, 'os' => null];
        }

        if (preg_match(self::BOT_PATTERN, $ua)) {
            return ['device_type' => 'bot', 'browser' => null, 'os' => null];
        }

        // Tablet check first — iPad and "Android Tablet" otherwise fall under
        // Mobile below because they both match /Mobile|Android/.
        $device = 'desktop';
        if (preg_match('/iPad|Tablet/i', $ua)) {
            $device = 'tablet';
        } elseif (preg_match('/Mobile|Android|iPhone|iPod/i', $ua)) {
            $device = 'mobile';
        }

        // Order matters: Edge contains "Chrome", Opera contains "Chrome",
        // Chromium contains "Chrome" — check the specific ones first.
        $browser = match (true) {
            (bool) preg_match('/Edg\//i', $ua) => 'Edge',
            (bool) preg_match('/OPR\//i', $ua), (bool) preg_match('/Opera/i', $ua) => 'Opera',
            (bool) preg_match('/SamsungBrowser/i', $ua) => 'Samsung Internet',
            (bool) preg_match('/Chrome\//i', $ua) && !preg_match('/Chromium/i', $ua) => 'Chrome',
            (bool) preg_match('/Firefox\//i', $ua) => 'Firefox',
            (bool) preg_match('/Safari\//i', $ua) => 'Safari',
            default => 'Other',
        };

        $os = match (true) {
            (bool) preg_match('/Windows/i', $ua) => 'Windows',
            (bool) preg_match('/iPhone|iPad|iPod|iOS/', $ua) => 'iOS',
            (bool) preg_match('/Mac OS X|macOS/i', $ua) => 'macOS',
            (bool) preg_match('/Android/i', $ua) => 'Android',
            (bool) preg_match('/Linux/i', $ua) => 'Linux',
            default => 'Other',
        };

        return [
            'device_type' => $device,
            'browser' => $browser,
            'os' => $os,
        ];
    }
}
