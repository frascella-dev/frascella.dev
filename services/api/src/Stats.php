<?php

declare(strict_types=1);

namespace Api;

/**
 * Everything the dashboard shows, in one query set.
 *
 * The whole dashboard is one request on purpose: at this scale the round
 * trips cost more than the queries, and a single payload means the panels
 * can never disagree about which window they are describing.
 *
 * All grouping is by the `day` and `hour` columns written at ingest, so not
 * one query here calls a date function — which is what keeps the same SQL
 * running unchanged on SQLite and MySQL.
 */
final class Stats
{
    /**
     * A visit that never got a quarter of the way down and lasted under
     * fifteen seconds. On a one-page site "one pageview" says nothing —
     * every visit is one pageview — so depth and dwell define it instead.
     */
    private const BOUNCE_SCROLL = 25;
    private const BOUNCE_MS = 15000;

    /** @return array<string, mixed> */
    public static function overview(string $from, string $to): array
    {
        $days = self::daysBetween($from, $to);
        [$prevFrom, $prevTo] = self::previousWindow($from, $to);

        return [
            'range' => ['from' => $from, 'to' => $to, 'days' => count($days)],
            'totals' => self::totals($from, $to),
            'previous' => self::totals($prevFrom, $prevTo),
            'series' => self::series($from, $to, $days),
            'hours' => self::hours($from, $to),
            'referrers' => self::breakdown('referrer_host', $from, $to, 'direct'),
            'devices' => self::breakdown('device', $from, $to, 'unknown'),
            'browsers' => self::breakdown('browser', $from, $to, 'unknown'),
            'systems' => self::breakdown('os', $from, $to, 'unknown'),
            'countries' => self::breakdown('country', $from, $to, 'unknown'),
            'languages' => self::breakdown('language', $from, $to, 'unknown'),
            'scroll' => self::scroll($from, $to),
            'sections' => self::sections($from, $to),
            'interactions' => self::interactions($from, $to),
            'funnel' => self::funnel($from, $to),
            'recent' => self::recent($from, $to),
        ];
    }

    /** @return array<string, int|float> */
    private static function totals(string $from, string $to): array
    {
        $row = Db::first(
            'SELECT
                COUNT(*) AS sessions,
                COUNT(DISTINCT visitor_id) AS visitors,
                COALESCE(SUM(pageviews), 0) AS pageviews,
                COALESCE(SUM(events_count), 0) AS events,
                COALESCE(SUM(contacted), 0) AS contacts,
                COALESCE(AVG(duration_ms), 0) AS avg_duration_ms,
                COALESCE(AVG(max_scroll), 0) AS avg_scroll,
                COALESCE(SUM(CASE WHEN max_scroll < ? AND duration_ms < ? THEN 1 ELSE 0 END), 0) AS bounces
             FROM sessions WHERE day >= ? AND day <= ?',
            [self::BOUNCE_SCROLL, self::BOUNCE_MS, $from, $to],
        ) ?? [];

        $sessions = (int) ($row['sessions'] ?? 0);
        $newVisitors = (int) Db::value(
            'SELECT COUNT(*) FROM visitors WHERE first_day >= ? AND first_day <= ?',
            [$from, $to],
        );

        return [
            'sessions' => $sessions,
            'visitors' => (int) ($row['visitors'] ?? 0),
            'newVisitors' => $newVisitors,
            'pageviews' => (int) ($row['pageviews'] ?? 0),
            'events' => (int) ($row['events'] ?? 0),
            'contacts' => (int) ($row['contacts'] ?? 0),
            'avgDurationSec' => round(((float) ($row['avg_duration_ms'] ?? 0)) / 1000, 1),
            'avgScroll' => round((float) ($row['avg_scroll'] ?? 0), 1),
            'bounceRate' => $sessions > 0 ? round(100 * (int) $row['bounces'] / $sessions, 1) : 0.0,
            'contactRate' => $sessions > 0 ? round(100 * (int) $row['contacts'] / $sessions, 1) : 0.0,
        ];
    }

    /**
     * One point per day in the window, including the days nobody came —
     * a gap in a line chart should read as zero, not as missing.
     *
     * @param list<string> $days
     * @return list<array<string, mixed>>
     */
    private static function series(string $from, string $to, array $days): array
    {
        $rows = Db::all(
            'SELECT day,
                    COUNT(*) AS sessions,
                    COUNT(DISTINCT visitor_id) AS visitors,
                    COALESCE(SUM(pageviews), 0) AS pageviews,
                    COALESCE(SUM(contacted), 0) AS contacts
             FROM sessions WHERE day >= ? AND day <= ?
             GROUP BY day',
            [$from, $to],
        );

        $byDay = [];
        foreach ($rows as $row) {
            $byDay[(string) $row['day']] = $row;
        }

        $series = [];
        foreach ($days as $day) {
            $row = $byDay[$day] ?? null;
            $series[] = [
                'day' => $day,
                'sessions' => (int) ($row['sessions'] ?? 0),
                'visitors' => (int) ($row['visitors'] ?? 0),
                'pageviews' => (int) ($row['pageviews'] ?? 0),
                'contacts' => (int) ($row['contacts'] ?? 0),
            ];
        }

        return $series;
    }

    /** @return list<array<string, int>> 24 buckets, always all of them */
    private static function hours(string $from, string $to): array
    {
        $rows = Db::all(
            'SELECT hour, COUNT(*) AS sessions FROM sessions
             WHERE day >= ? AND day <= ? GROUP BY hour',
            [$from, $to],
        );
        $byHour = [];
        foreach ($rows as $row) {
            $byHour[(int) $row['hour']] = (int) $row['sessions'];
        }

        $out = [];
        for ($h = 0; $h < 24; $h++) {
            $out[] = ['hour' => $h, 'sessions' => $byHour[$h] ?? 0];
        }
        return $out;
    }

    /**
     * Session counts grouped by one session column. The column name is not
     * user input — it comes from the fixed list in `overview()` — but it is
     * checked against the schema anyway, because a string reaching SQL
     * outside a placeholder deserves one.
     *
     * @return list<array<string, mixed>>
     */
    private static function breakdown(string $column, string $from, string $to, string $nullLabel): array
    {
        $allowed = ['referrer_host', 'device', 'browser', 'os', 'country', 'language', 'utm_source'];
        if (!in_array($column, $allowed, true)) {
            return [];
        }

        $rows = Db::all(
            "SELECT $column AS label, COUNT(*) AS sessions,
                    COALESCE(SUM(contacted), 0) AS contacts
             FROM sessions WHERE day >= ? AND day <= ?
             GROUP BY $column ORDER BY sessions DESC LIMIT 20",
            [$from, $to],
        );

        return array_map(
            static fn (array $row): array => [
                'label' => ($row['label'] ?? null) === null || $row['label'] === ''
                    ? $nullLabel
                    : (string) $row['label'],
                'sessions' => (int) $row['sessions'],
                'contacts' => (int) $row['contacts'],
            ],
            $rows,
        );
    }

    /**
     * How many visits reached each depth. Cumulative by construction: the
     * client only fires a milestone once, so a visit that reached 75 also
     * fired 25 and 50.
     *
     * @return list<array<string, int>>
     */
    private static function scroll(string $from, string $to): array
    {
        $rows = Db::all(
            "SELECT value AS depth, COUNT(DISTINCT session_id) AS sessions
             FROM events WHERE name = 'scroll_depth' AND day >= ? AND day <= ?
             GROUP BY value",
            [$from, $to],
        );
        $byDepth = [];
        foreach ($rows as $row) {
            $byDepth[(int) $row['depth']] = (int) $row['sessions'];
        }

        $out = [];
        foreach ([25, 50, 75, 100] as $depth) {
            $out[] = ['depth' => $depth, 'sessions' => $byDepth[$depth] ?? 0];
        }
        return $out;
    }

    /**
     * Which sections were seen, and for how long on average.
     *
     * @return list<array<string, mixed>>
     */
    private static function sections(string $from, string $to): array
    {
        $views = Db::all(
            "SELECT label, COUNT(DISTINCT session_id) AS sessions
             FROM events WHERE name = 'section_view' AND day >= ? AND day <= ? AND label IS NOT NULL
             GROUP BY label",
            [$from, $to],
        );
        $times = Db::all(
            "SELECT label, COALESCE(SUM(value), 0) AS total_ms, COUNT(DISTINCT session_id) AS sessions
             FROM events WHERE name = 'section_time' AND day >= ? AND day <= ? AND label IS NOT NULL
             GROUP BY label",
            [$from, $to],
        );

        $dwell = [];
        foreach ($times as $row) {
            $sessions = max(1, (int) $row['sessions']);
            $dwell[(string) $row['label']] = round(((int) $row['total_ms']) / $sessions / 1000, 1);
        }

        $out = [];
        foreach ($views as $row) {
            $label = (string) $row['label'];
            $out[] = [
                'label' => $label,
                'sessions' => (int) $row['sessions'],
                'avgSeconds' => $dwell[$label] ?? 0.0,
            ];
        }
        usort($out, static fn (array $a, array $b): int => $b['sessions'] <=> $a['sessions']);

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private static function interactions(string $from, string $to): array
    {
        return array_map(
            static fn (array $row): array => [
                'name' => (string) $row['name'],
                'label' => ($row['label'] ?? null) === null ? '' : (string) $row['label'],
                'count' => (int) $row['total'],
                'sessions' => (int) $row['sessions'],
            ],
            Db::all(
                "SELECT name, label, COUNT(*) AS total, COUNT(DISTINCT session_id) AS sessions
                 FROM events WHERE category = 'interaction' AND day >= ? AND day <= ?
                 GROUP BY name, label ORDER BY total DESC LIMIT 30",
                [$from, $to],
            ),
        );
    }

    /**
     * The contact funnel, in sessions rather than events — "how many people
     * got this far", not "how many times it happened".
     *
     * @return list<array<string, mixed>>
     */
    private static function funnel(string $from, string $to): array
    {
        $steps = [
            'contact_view' => 'saw the form',
            'contact_start' => 'started typing',
            'contact_submit' => 'pressed send',
            'contact_success' => 'message sent',
        ];

        $rows = Db::all(
            "SELECT name, COUNT(DISTINCT session_id) AS sessions
             FROM events WHERE category = 'contact' AND day >= ? AND day <= ?
             GROUP BY name",
            [$from, $to],
        );
        $byName = [];
        foreach ($rows as $row) {
            $byName[(string) $row['name']] = (int) $row['sessions'];
        }

        $out = [];
        $first = null;
        foreach ($steps as $name => $label) {
            $count = $byName[$name] ?? 0;
            $first ??= $count;
            $out[] = [
                'step' => $name,
                'label' => $label,
                'sessions' => $count,
                'share' => $first > 0 ? round(100 * $count / $first, 1) : 0.0,
            ];
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private static function recent(string $from, string $to): array
    {
        return array_map(
            static fn (array $row): array => [
                'id' => substr((string) $row['id'], 0, 8),
                'startedAt' => (int) $row['started_at'],
                'device' => (string) $row['device'],
                'browser' => (string) $row['browser'],
                'os' => (string) $row['os'],
                'country' => $row['country'] === null ? '' : (string) $row['country'],
                'referrer' => $row['referrer_host'] === null ? 'direct' : (string) $row['referrer_host'],
                'durationSec' => (int) round(((int) $row['duration_ms']) / 1000),
                'maxScroll' => (int) $row['max_scroll'],
                'events' => (int) $row['events_count'],
                'contacted' => ((int) $row['contacted']) === 1,
            ],
            Db::all(
                'SELECT id, started_at, device, browser, os, country, referrer_host,
                        duration_ms, max_scroll, events_count, contacted
                 FROM sessions WHERE day >= ? AND day <= ?
                 ORDER BY started_at DESC LIMIT 30',
                [$from, $to],
            ),
        );
    }

    // --- window arithmetic -------------------------------------------------

    /** @return list<string> */
    private static function daysBetween(string $from, string $to): array
    {
        $start = new \DateTimeImmutable($from);
        $end = new \DateTimeImmutable($to);
        $days = [];
        // A guard, not a policy: the route already caps the window, and an
        // unbounded loop here would be the one place a bad date could hurt.
        for ($d = $start, $i = 0; $d <= $end && $i < 400; $d = $d->modify('+1 day'), $i++) {
            $days[] = $d->format('Y-m-d');
        }
        return $days;
    }

    /** @return array{0: string, 1: string} the equally long window before this one */
    private static function previousWindow(string $from, string $to): array
    {
        $start = new \DateTimeImmutable($from);
        $end = new \DateTimeImmutable($to);
        $length = max(1, (int) $start->diff($end)->days + 1);

        return [
            $start->modify("-$length days")->format('Y-m-d'),
            $start->modify('-1 day')->format('Y-m-d'),
        ];
    }
}
