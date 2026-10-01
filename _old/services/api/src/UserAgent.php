<?php

declare(strict_types=1);

namespace Api;

/**
 * Just enough user-agent reading for a dashboard: is this a person, and
 * roughly what were they holding.
 *
 * Deliberately not a UA library. Those carry thousands of regexes and a
 * monthly update cadence to answer questions this site does not ask — the
 * three buckets below are all the dashboard shows, and being wrong about a
 * rare browser costs nothing. What does matter is the bot filter: without
 * it every number is really a number about crawlers.
 */
final class UserAgent
{
    /** Substrings that mark a request as automated. Matched case-insensitively. */
    private const BOTS = [
        'bot', 'crawl', 'spider', 'slurp', 'search', 'fetch', 'monitor', 'scrape',
        'curl', 'wget', 'python-requests', 'httpclient', 'okhttp', 'axios', 'go-http',
        'headless', 'phantomjs', 'puppeteer', 'playwright', 'lighthouse', 'pagespeed',
        'preview', 'validator', 'analyzer', 'uptime', 'pingdom', 'facebookexternalhit',
        'whatsapp', 'telegram', 'slackbot', 'discordbot', 'embedly', 'quora link',
    ];

    public static function isBot(string $ua): bool
    {
        if (trim($ua) === '') {
            return true; // a browser always says something
        }
        $ua = strtolower($ua);
        foreach (self::BOTS as $needle) {
            if (str_contains($ua, $needle)) {
                return true;
            }
        }
        return false;
    }

    /** @return 'mobile'|'tablet'|'desktop' */
    public static function device(string $ua): string
    {
        $ua = strtolower($ua);
        if (str_contains($ua, 'ipad') || (str_contains($ua, 'android') && !str_contains($ua, 'mobile'))) {
            return 'tablet';
        }
        if (
            str_contains($ua, 'mobi') || str_contains($ua, 'iphone')
            || str_contains($ua, 'ipod') || str_contains($ua, 'windows phone')
        ) {
            return 'mobile';
        }
        return 'desktop';
    }

    public static function os(string $ua): string
    {
        $ua = strtolower($ua);
        return match (true) {
            str_contains($ua, 'windows') => 'Windows',
            str_contains($ua, 'iphone'), str_contains($ua, 'ipad'), str_contains($ua, 'ipod') => 'iOS',
            // Order matters: an Android UA also says "linux".
            str_contains($ua, 'android') => 'Android',
            str_contains($ua, 'mac os x'), str_contains($ua, 'macintosh') => 'macOS',
            str_contains($ua, 'cros') => 'ChromeOS',
            str_contains($ua, 'linux') => 'Linux',
            default => 'unknown',
        };
    }

    public static function browser(string $ua): string
    {
        $ua = strtolower($ua);
        // Every Chromium browser claims to be Chrome and Safari, and Safari
        // claims to be everything, so the specific names have to be tried
        // before the generic ones.
        return match (true) {
            str_contains($ua, 'edg/') => 'Edge',
            str_contains($ua, 'opr/'), str_contains($ua, 'opera') => 'Opera',
            str_contains($ua, 'samsungbrowser') => 'Samsung Internet',
            str_contains($ua, 'firefox'), str_contains($ua, 'fxios') => 'Firefox',
            str_contains($ua, 'crios'), str_contains($ua, 'chrome'), str_contains($ua, 'chromium') => 'Chrome',
            str_contains($ua, 'safari') => 'Safari',
            default => 'unknown',
        };
    }
}
