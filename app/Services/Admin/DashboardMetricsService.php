<?php

namespace App\Services\Admin;

use App\Models\AnalyticsEvent;
use App\Models\PageVisit;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates page_visits / analytics_events into the shape the dashboard
 * renders. Controllers stay thin and the complex query logic lives here
 * alongside the domain models it reads.
 */
class DashboardMetricsService
{
    /**
     * Ranges the dashboard lets users pick from. Stored in one place so the
     * select on the frontend, the previous-period math, and validation all
     * stay in sync.
     *
     * @var array<string, array{label:string, minutes:int, grain:string}>
     */
    public const RANGES = [
        '24h' => ['label' => 'Last 24 hours', 'minutes' => 1440, 'grain' => 'hour'],
        '7d' => ['label' => 'Last 7 days', 'minutes' => 10080, 'grain' => 'day'],
        '30d' => ['label' => 'Last 30 days', 'minutes' => 43200, 'grain' => 'day'],
        '90d' => ['label' => 'Last 90 days', 'minutes' => 129600, 'grain' => 'day'],
    ];

    public const DEFAULT_RANGE = '30d';

    public function availableRanges(): array
    {
        return array_map(
            fn (array $cfg, string $key) => [
                'value' => $key,
                'label' => $cfg['label'],
            ],
            self::RANGES,
            array_keys(self::RANGES),
        );
    }

    /**
     * Build the full metrics payload for a given range key.
     */
    public function compute(string $range, bool $includeBots = false): array
    {
        $range = array_key_exists($range, self::RANGES) ? $range : self::DEFAULT_RANGE;
        $cfg = self::RANGES[$range];

        $now = CarbonImmutable::now();
        $since = $now->subMinutes($cfg['minutes']);
        $previousSince = $since->subMinutes($cfg['minutes']);

        return [
            'range' => $range,
            'ranges' => $this->availableRanges(),
            'grain' => $cfg['grain'],
            'label' => $cfg['label'],
            'windowMinutes' => $cfg['minutes'],
            'generatedAt' => $now->toIso8601String(),
            'includeBots' => $includeBots,

            'totals' => $this->totals($since, $previousSince, $now, $includeBots),

            'timeseries' => $cfg['grain'] === 'hour'
                ? $this->hourlyBuckets($since, $now, $includeBots)
                : $this->dailyBuckets($since, $now, $includeBots),

            'hourOfDay' => $this->hourOfDay($since, $now, $includeBots),
            'newVsReturning' => $this->newVsReturning($since, $now, $includeBots),
            'bounceRate' => $this->bounceRate($since, $now, $includeBots),
            'responseTime' => $this->responseTime($since, $now, $includeBots),

            'topPaths' => $this->topBy('path', $since, $now, $includeBots),
            'topReferrers' => $this->topBy('referrer_host', $since, $now, $includeBots),
            'topBrowsers' => $this->topBy('browser', $since, $now, $includeBots),
            'topOs' => $this->topBy('os', $since, $now, $includeBots),
            'topCountries' => $this->topBy('country', $since, $now, $includeBots),
            'topUtmSources' => $this->topBy('utm_source', $since, $now, $includeBots),
            'deviceBreakdown' => $this->deviceBreakdown($since, $now, $includeBots),
            'statusCodes' => $this->statusCodes($since, $now, $includeBots),
            'topEvents' => $this->topEvents($since, $now),
        ];
    }

    private function baseQuery(bool $includeBots): Builder
    {
        $query = PageVisit::query();

        if (!$includeBots) {
            $query->where(function (Builder $q) {
                $q->where('device_type', '!=', 'bot')->orWhereNull('device_type');
            });
        }

        return $query;
    }

    private function within(Builder $query, Carbon|CarbonImmutable $from, Carbon|CarbonImmutable $to): Builder
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    private function totals(
        CarbonImmutable $since,
        CarbonImmutable $previousSince,
        CarbonImmutable $now,
        bool $includeBots,
    ): array {
        $current = $this->slice($since, $now, $includeBots);
        $previous = $this->slice($previousSince, $since, $includeBots);

        $botHits = (clone PageVisit::query())
            ->where('device_type', 'bot')
            ->whereBetween('created_at', [$since, $now])
            ->count();

        return [
            'visits' => $this->withDelta($current['visits'], $previous['visits']),
            'uniqueVisitors' => $this->withDelta(
                $current['uniqueVisitors'],
                $previous['uniqueVisitors'],
            ),
            'avgResponseTimeMs' => $this->withDelta(
                $current['avgResponseTimeMs'],
                $previous['avgResponseTimeMs'],
                // Lower is better for latency — flip the polarity so the UI
                // shows a green arrow when it drops.
                betterWhenLower: true,
            ),
            'botHits' => ['value' => $botHits],
        ];
    }

    /**
     * @return array{visits:int, uniqueVisitors:int, avgResponseTimeMs:?float}
     */
    private function slice(
        CarbonImmutable $from,
        CarbonImmutable $to,
        bool $includeBots,
    ): array {
        $q = $this->within($this->baseQuery($includeBots), $from, $to);

        $row = (clone $q)
            ->selectRaw('COUNT(*) as visits')
            ->selectRaw('COUNT(DISTINCT ip_hash) as unique_visitors')
            ->selectRaw('AVG(response_time_ms) as avg_ms')
            ->first();

        return [
            'visits' => (int) ($row->visits ?? 0),
            'uniqueVisitors' => (int) ($row->unique_visitors ?? 0),
            'avgResponseTimeMs' => $row?->avg_ms !== null
                ? round((float) $row->avg_ms, 1)
                : null,
        ];
    }

    private function withDelta(mixed $current, mixed $previous, bool $betterWhenLower = false): array
    {
        $previousNum = is_numeric($previous) ? (float) $previous : null;
        $currentNum = is_numeric($current) ? (float) $current : null;

        $deltaPct = null;
        if ($previousNum !== null && $previousNum > 0 && $currentNum !== null) {
            $deltaPct = round((($currentNum - $previousNum) / $previousNum) * 100, 1);
        }

        return [
            'value' => $current,
            'previous' => $previous,
            'deltaPct' => $deltaPct,
            'betterWhenLower' => $betterWhenLower,
        ];
    }

    private function hourlyBuckets(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        $rows = $this->within($this->baseQuery($includeBots), $since, $now)
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as bucket")
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->keyBy('bucket');

        $buckets = [];
        $cursor = $since->copy()->startOfHour();
        $end = $now->copy()->startOfHour();
        while ($cursor <= $end) {
            $key = $cursor->format('Y-m-d H:00:00');
            $buckets[] = [
                'bucket' => $cursor->toIso8601String(),
                'label' => $cursor->format('H:00'),
                'visits' => (int) ($rows[$key]->visits ?? 0),
            ];
            $cursor = $cursor->addHour();
        }

        return $buckets;
    }

    private function dailyBuckets(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        $rows = $this->within($this->baseQuery($includeBots), $since, $now)
            ->selectRaw('DATE(created_at) as bucket')
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->keyBy('bucket');

        $buckets = [];
        $cursor = $since->copy()->startOfDay();
        $end = $now->copy()->startOfDay();
        while ($cursor <= $end) {
            $key = $cursor->format('Y-m-d');
            $buckets[] = [
                'bucket' => $cursor->toIso8601String(),
                'label' => $cursor->format('M j'),
                'visits' => (int) ($rows[$key]->visits ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $buckets;
    }

    private function hourOfDay(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        $rows = $this->within($this->baseQuery($includeBots), $since, $now)
            ->selectRaw('HOUR(created_at) as hour')
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('hour')
            ->get()
            ->keyBy('hour');

        return array_map(
            fn (int $hour) => [
                'hour' => $hour,
                'label' => sprintf('%02d:00', $hour),
                'visits' => (int) ($rows[$hour]->visits ?? 0),
            ],
            range(0, 23),
        );
    }

    /**
     * Classifies visitors in the window as "new" (first seen inside the
     * window) or "returning" (seen at least once before it). We lean on the
     * salted ip_hash so the split is privacy-preserving.
     */
    private function newVsReturning(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        $inWindowHashes = $this->within($this->baseQuery($includeBots), $since, $now)
            ->distinct()
            ->pluck('ip_hash');

        if ($inWindowHashes->isEmpty()) {
            return ['new' => 0, 'returning' => 0];
        }

        $returning = (clone $this->baseQuery($includeBots))
            ->whereIn('ip_hash', $inWindowHashes)
            ->where('created_at', '<', $since)
            ->distinct('ip_hash')
            ->count('ip_hash');

        $total = $inWindowHashes->count();

        return [
            'new' => max(0, $total - $returning),
            'returning' => $returning,
        ];
    }

    /**
     * Session-level bounce rate: share of sessions that produced exactly one
     * page visit. Uses session_id, skipping rows where none is recorded.
     */
    private function bounceRate(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        $grouped = $this->within($this->baseQuery($includeBots), $since, $now)
            ->whereNotNull('session_id')
            ->select('session_id', DB::raw('COUNT(*) as hits'))
            ->groupBy('session_id')
            ->get();

        $sessions = $grouped->count();
        if ($sessions === 0) {
            return ['sessions' => 0, 'bounces' => 0, 'rate' => null];
        }

        $bounces = $grouped->where('hits', 1)->count();

        return [
            'sessions' => $sessions,
            'bounces' => $bounces,
            'rate' => round(($bounces / $sessions) * 100, 1),
        ];
    }

    private function responseTime(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        $samples = $this->within($this->baseQuery($includeBots), $since, $now)
            ->whereNotNull('response_time_ms')
            ->orderBy('response_time_ms')
            ->pluck('response_time_ms');

        if ($samples->isEmpty()) {
            return ['avg' => null, 'p95' => null, 'max' => null];
        }

        $avg = round($samples->avg(), 1);
        $index95 = (int) max(0, min(floor($samples->count() * 0.95), $samples->count() - 1));

        return [
            'avg' => $avg,
            'p95' => (int) $samples[$index95],
            'max' => (int) $samples->last(),
        ];
    }

    private function topBy(
        string $column,
        CarbonImmutable $since,
        CarbonImmutable $now,
        bool $includeBots,
        int $limit = 8,
    ): array {
        return $this->within($this->baseQuery($includeBots), $since, $now)
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->select($column, DB::raw('COUNT(*) as visits'))
            ->groupBy($column)
            ->orderByDesc('visits')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    private function deviceBreakdown(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        return $this->within($this->baseQuery($includeBots), $since, $now)
            ->whereNotNull('device_type')
            ->select('device_type', DB::raw('COUNT(*) as visits'))
            ->groupBy('device_type')
            ->orderByDesc('visits')
            ->get()
            ->toArray();
    }

    private function statusCodes(CarbonImmutable $since, CarbonImmutable $now, bool $includeBots): array
    {
        $rows = $this->within($this->baseQuery($includeBots), $since, $now)
            ->whereNotNull('status_code')
            ->selectRaw('FLOOR(status_code / 100) * 100 as bucket')
            ->selectRaw('COUNT(*) as visits')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get();

        return $rows->map(fn ($row) => [
            'bucket' => (int) $row->bucket,
            'label' => $this->statusLabel((int) $row->bucket),
            'visits' => (int) $row->visits,
        ])->toArray();
    }

    private function statusLabel(int $bucket): string
    {
        return match ($bucket) {
            200 => '2xx · OK',
            300 => '3xx · Redirect',
            400 => '4xx · Client error',
            500 => '5xx · Server error',
            default => "{$bucket}xx",
        };
    }

    private function topEvents(CarbonImmutable $since, CarbonImmutable $now, int $limit = 8): array
    {
        return AnalyticsEvent::query()
            ->whereBetween('created_at', [$since, $now])
            ->select('name', DB::raw('COUNT(*) as hits'))
            ->groupBy('name')
            ->orderByDesc('hits')
            ->limit($limit)
            ->get()
            ->toArray();
    }
}
