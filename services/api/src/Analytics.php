<?php

declare(strict_types=1);

namespace Api;

use PDOException;

/**
 * The ingest side: turns one beacon into rows.
 *
 * Three rules shape everything here.
 *
 * 1. **Consent gates the write, not the response.** A batch that arrives
 *    without a granted consent cookie is dropped, and the caller still gets
 *    204 — the client is never told whether it counted, so nothing on the
 *    page can behave differently for a visitor who refused.
 * 2. **No IP address is ever stored.** The address is used for rate limiting,
 *    which lives in flat files that expire in minutes, and for nothing else.
 *    Identity comes from a cookie the visitor agreed to and can delete.
 * 3. **Only known events exist.** VOCABULARY below is the whole language; an
 *    unknown name is discarded rather than written. The endpoint is public,
 *    and a public table you can write arbitrary strings into is a liability.
 */
final class Analytics
{
    public const CONSENT_COOKIE = 'pf_consent';
    public const VISITOR_COOKIE = 'pf_vid';
    public const SESSION_COOKIE = 'pf_sid';

    /** A visit ends after half an hour of silence — the usual convention. */
    private const SESSION_TTL = 1800;
    /** 13 months: the Garante/CNIL ceiling for an analytics identifier. */
    private const VISITOR_TTL = 13 * 30 * 86400;

    private const MAX_EVENTS_PER_BATCH = 50;
    /** A single visit that produces more than this is not a reader. */
    private const MAX_EVENTS_PER_SESSION = 600;

    /**
     * Event name → category. The dashboard groups by category; the API
     * refuses anything not named here.
     *
     * @var array<string, string>
     */
    private const VOCABULARY = [
        'pageview' => 'page',
        'page_exit' => 'page',          // value: ms on the page

        'scroll_depth' => 'scroll',     // value: 25 | 50 | 75 | 100

        'section_view' => 'section',    // label: hero | bio | work | contact
        'section_time' => 'section',    // label: section, value: ms visible

        'bio_open' => 'interaction',    // label: the row that opened
        'work_step' => 'interaction',   // label: project, value: corridor index
        'project_click' => 'interaction',
        'outbound' => 'interaction',    // label: destination host
        'nav_open' => 'interaction',
        'nav_link' => 'interaction',    // label: section jumped to

        'contact_view' => 'contact',
        'contact_start' => 'contact',   // first field touched
        'contact_submit' => 'contact',
        'contact_success' => 'contact',
        'contact_error' => 'contact',   // label: field or reason
    ];

    /** True when this visitor said yes and the cookie still says so. */
    public static function hasConsent(): bool
    {
        return Http::cookie(self::CONSENT_COOKIE) === 'granted';
    }

    /**
     * Writes one batch. Never throws: a beacon is fire-and-forget, and a
     * database problem must not turn into a 500 on a page the visitor is
     * in the middle of reading.
     *
     * @param array<string, mixed> $payload
     */
    public static function ingest(array $payload): void
    {
        if (!self::hasConsent()) {
            return;
        }

        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        if (UserAgent::isBot($ua)) {
            return;
        }

        $events = is_array($payload['events'] ?? null) ? $payload['events'] : [];
        if ($events === []) {
            return;
        }
        $events = array_slice($events, 0, self::MAX_EVENTS_PER_BATCH);

        $ctx = is_array($payload['ctx'] ?? null) ? $payload['ctx'] : [];
        $now = time();

        try {
            $visitorId = self::resolveVisitor($now);
            $session = self::resolveSession($visitorId, $ctx, $ua, $now);
            if ($session === null) {
                return; // over the per-session ceiling
            }
            self::writeEvents($visitorId, $session, $events, $ctx, $now);
        } catch (PDOException $e) {
            error_log('Analytics ingest failed: ' . $e->getMessage());
        }
    }

    /** The visitor row, created on first sight, refreshed on every batch. */
    private static function resolveVisitor(int $now): string
    {
        $id = self::sanitizeId(Http::cookie(self::VISITOR_COOKIE));

        if ($id !== null) {
            $known = Db::value('SELECT id FROM visitors WHERE id = ?', [$id]);
            if ($known !== null) {
                Db::run('UPDATE visitors SET last_seen = ? WHERE id = ?', [$now, $id]);
                // Rolling window: the cookie is re-issued on every visit, so
                // a regular reader is never logged out by the 13-month cap.
                Http::setCookie(self::VISITOR_COOKIE, $id, self::VISITOR_TTL);
                return $id;
            }
        }

        // No cookie, or one pointing at a row that has been pruned away.
        $id = bin2hex(random_bytes(16));
        Db::run(
            'INSERT INTO visitors (id, first_seen, last_seen, first_day, sessions_count, events_count)
             VALUES (?, ?, ?, ?, 0, 0)',
            [$id, $now, $now, self::day($now)],
        );
        Http::setCookie(self::VISITOR_COOKIE, $id, self::VISITOR_TTL);

        return $id;
    }

    /**
     * The session row. A cookie that points at a visit which has gone quiet
     * for longer than SESSION_TTL starts a new one, so "sessions" means
     * visits rather than browser tabs.
     *
     * @param array<string, mixed> $ctx
     * @return array<string, mixed>|null null when the visit is over its ceiling
     */
    private static function resolveSession(string $visitorId, array $ctx, string $ua, int $now): ?array
    {
        $id = self::sanitizeId(Http::cookie(self::SESSION_COOKIE));

        if ($id !== null) {
            $row = Db::first('SELECT * FROM sessions WHERE id = ?', [$id]);
            if ($row !== null && (int) $row['last_seen'] + self::SESSION_TTL > $now) {
                if ((int) $row['events_count'] >= self::MAX_EVENTS_PER_SESSION) {
                    return null;
                }
                Http::setCookie(self::SESSION_COOKIE, $id, self::SESSION_TTL);
                return $row;
            }
        }

        $id = bin2hex(random_bytes(16));
        $path = self::clamp(self::str($ctx['path'] ?? '/') ?: '/', 255);
        $referrer = self::referrer(self::str($ctx['ref'] ?? ''));
        $utm = self::utm($path);

        Db::run(
            'INSERT INTO sessions (
                id, visitor_id, started_at, last_seen, day, hour, entry_path,
                referrer_host, referrer_url, utm_source, utm_medium, utm_campaign,
                device, os, browser, viewport_w, viewport_h, screen_w, screen_h,
                language, timezone, country
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $id, $visitorId, $now, $now, self::day($now), self::hour($now), $path,
                $referrer['host'], $referrer['url'], $utm['source'], $utm['medium'], $utm['campaign'],
                UserAgent::device($ua), UserAgent::os($ua), UserAgent::browser($ua),
                self::int($ctx['vw'] ?? null), self::int($ctx['vh'] ?? null),
                self::int($ctx['sw'] ?? null), self::int($ctx['sh'] ?? null),
                self::clamp(self::str($ctx['lang'] ?? ''), 16) ?: null,
                self::clamp(self::str($ctx['tz'] ?? ''), 64) ?: null,
                self::country(),
            ],
        );
        Db::run('UPDATE visitors SET sessions_count = sessions_count + 1 WHERE id = ?', [$visitorId]);
        Http::setCookie(self::SESSION_COOKIE, $id, self::SESSION_TTL);

        return Db::first('SELECT * FROM sessions WHERE id = ?', [$id]);
    }

    /**
     * @param array<string, mixed> $session
     * @param array<int, mixed> $events
     * @param array<string, mixed> $ctx
     */
    private static function writeEvents(
        string $visitorId,
        array $session,
        array $events,
        array $ctx,
        int $now,
    ): void {
        $sessionId = (string) $session['id'];
        $defaultPath = self::clamp(self::str($ctx['path'] ?? '/') ?: '/', 255);

        $insert = Db::pdo()->prepare(
            'INSERT INTO events (session_id, visitor_id, name, category, label, value, path, created_at, day)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );

        $written = 0;
        $pageviews = 0;
        $maxScroll = (int) $session['max_scroll'];
        $contacted = (int) $session['contacted'];

        Db::pdo()->beginTransaction();
        try {
            foreach ($events as $event) {
                if (!is_array($event)) {
                    continue;
                }
                $name = self::str($event['n'] ?? '');
                $category = self::VOCABULARY[$name] ?? null;
                if ($category === null) {
                    continue;
                }

                // The client stamps each event when it happens and the batch
                // is flushed later, so its clock decides the ordering — but
                // only within a sane window around ours. A skewed clock does
                // not get to write events into next year.
                $at = self::int($event['t'] ?? null);
                $at = $at === null ? $now : intdiv($at, 1000);
                if (abs($at - $now) > 86400) {
                    $at = $now;
                }

                $insert->execute([
                    $sessionId,
                    $visitorId,
                    $name,
                    $category,
                    self::clamp(self::str($event['l'] ?? ''), 190) ?: null,
                    self::int($event['v'] ?? null),
                    self::clamp(self::str($event['p'] ?? '') ?: $defaultPath, 255),
                    $at,
                    self::day($at),
                ]);

                $written++;
                if ($name === 'pageview') {
                    $pageviews++;
                }
                if ($name === 'scroll_depth') {
                    $maxScroll = max($maxScroll, min(100, (int) self::int($event['v'] ?? 0)));
                }
                if ($name === 'contact_success') {
                    $contacted = 1;
                }
            }

            if ($written > 0) {
                Db::run(
                    'UPDATE sessions SET
                        last_seen = ?, events_count = events_count + ?, pageviews = pageviews + ?,
                        max_scroll = ?, contacted = ?, duration_ms = ?
                     WHERE id = ?',
                    [
                        $now, $written, $pageviews, $maxScroll, $contacted,
                        max(0, $now - (int) $session['started_at']) * 1000,
                        $sessionId,
                    ],
                );
                Db::run(
                    'UPDATE visitors SET events_count = events_count + ?, last_seen = ? WHERE id = ?',
                    [$written, $now, $visitorId],
                );
            }

            Db::pdo()->commit();
        } catch (PDOException $e) {
            Db::pdo()->rollBack();
            throw $e;
        }
    }

    // --- small helpers -----------------------------------------------------

    /** Cookie values are attacker-controlled; only our own shape is accepted. */
    private static function sanitizeId(?string $value): ?string
    {
        return $value !== null && preg_match('/^[a-f0-9]{32}$/', $value) === 1 ? $value : null;
    }

    /**
     * Where the visit came from, minus ourselves — a referrer on the same
     * host is an internal navigation, not a source of traffic.
     *
     * @return array{host: ?string, url: ?string}
     */
    private static function referrer(string $ref): array
    {
        if ($ref === '') {
            return ['host' => null, 'url' => null];
        }
        $host = parse_url($ref, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return ['host' => null, 'url' => null];
        }
        $own = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
        if (strcasecmp($host, $own) === 0) {
            return ['host' => null, 'url' => null];
        }
        return [
            'host' => self::clamp(preg_replace('/^www\./i', '', $host) ?? $host, 190),
            'url' => self::clamp($ref, 500),
        ];
    }

    /**
     * Campaign tags off the entry URL's query string.
     *
     * @return array{source: ?string, medium: ?string, campaign: ?string}
     */
    private static function utm(string $path): array
    {
        $query = parse_url($path, PHP_URL_QUERY);
        if (!is_string($query) || $query === '') {
            return ['source' => null, 'medium' => null, 'campaign' => null];
        }
        parse_str($query, $params);
        $pick = static fn (string $key): ?string
            => self::clamp(self::str($params[$key] ?? ''), 120) ?: null;

        return [
            'source' => $pick('utm_source'),
            'medium' => $pick('utm_medium'),
            'campaign' => $pick('utm_campaign'),
        ];
    }

    /**
     * Country, when something in front of the app resolves it — Cloudflare
     * sets CF-IPCountry. There is no GeoIP database here and no plan for
     * one; unknown is an honest answer.
     */
    private static function country(): ?string
    {
        $code = strtoupper(trim(
            $_SERVER['HTTP_CF_IPCOUNTRY'] ?? $_SERVER['HTTP_X_COUNTRY_CODE'] ?? '',
        ));
        return preg_match('/^[A-Z]{2}$/', $code) === 1 && $code !== 'XX' ? $code : null;
    }

    /** Days are the owner's days, not UTC's — the dashboard is read from Italy. */
    public static function day(int $timestamp): string
    {
        return self::zoned($timestamp)->format('Y-m-d');
    }

    public static function hour(int $timestamp): int
    {
        return (int) self::zoned($timestamp)->format('G');
    }

    private static function zoned(int $timestamp): \DateTimeImmutable
    {
        $tz = new \DateTimeZone(Env::get('APP_TIMEZONE', 'Europe/Rome') ?? 'Europe/Rome');
        return (new \DateTimeImmutable('@' . $timestamp))->setTimezone($tz);
    }

    private static function str(mixed $value): string
    {
        return is_string($value) ? trim($value) : (is_scalar($value) ? trim((string) $value) : '');
    }

    private static function int(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private static function clamp(string $value, int $length): string
    {
        return mb_substr($value, 0, $length);
    }
}
