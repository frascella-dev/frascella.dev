<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PageVisit;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Window over which all dashboard metrics are computed.
     */
    private const WINDOW_DAYS = 30;

    public function __invoke(Request $request): Response
    {
        $now = Carbon::now();
        $since = $now->copy()->subDays(self::WINDOW_DAYS);
        $sinceToday = $now->copy()->startOfDay();

        return Inertia::render('Admin/Dashboard', [
            'metrics' => [
                'windowDays' => self::WINDOW_DAYS,
                'generatedAt' => $now->toIso8601String(),
                'totals' => [
                    'visits' => $this->humanVisits()
                        ->where('created_at', '>=', $since)
                        ->count(),
                    'uniqueVisitors' => $this->humanVisits()
                        ->where('created_at', '>=', $since)
                        ->distinct('ip_hash')
                        ->count('ip_hash'),
                    'visitsToday' => $this->humanVisits()
                        ->where('created_at', '>=', $sinceToday)
                        ->count(),
                    'uniqueVisitorsToday' => $this->humanVisits()
                        ->where('created_at', '>=', $sinceToday)
                        ->distinct('ip_hash')
                        ->count('ip_hash'),
                    'botHits' => PageVisit::query()
                        ->where('device_type', 'bot')
                        ->where('created_at', '>=', $since)
                        ->count(),
                ],
                'daily' => $this->dailyVisits($since, $now),
                'topPaths' => $this->topBy('path', $since),
                'topReferrers' => $this->topBy('referrer_host', $since),
                'topBrowsers' => $this->topBy('browser', $since),
                'topOs' => $this->topBy('os', $since),
                'topCountries' => $this->topBy('country', $since),
                'topUtmSources' => $this->topBy('utm_source', $since),
                'deviceBreakdown' => $this->humanVisits()
                    ->where('created_at', '>=', $since)
                    ->whereNotNull('device_type')
                    ->select('device_type', DB::raw('COUNT(*) as visits'))
                    ->groupBy('device_type')
                    ->orderByDesc('visits')
                    ->get(),
            ],
        ]);
    }

    /**
     * Base query excluding bot traffic. Human-only metrics use this so the
     * numbers reflect real users rather than crawler noise.
     */
    private function humanVisits(): Builder
    {
        return PageVisit::query()->where(function (Builder $q) {
            $q->where('device_type', '!=', 'bot')->orWhereNull('device_type');
        });
    }

    /**
     * Top N distinct values of $column by visit count, skipping nulls.
     */
    private function topBy(string $column, Carbon $since, int $limit = 5)
    {
        return $this->humanVisits()
            ->where('created_at', '>=', $since)
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->select($column, DB::raw('COUNT(*) as visits'))
            ->groupBy($column)
            ->orderByDesc('visits')
            ->limit($limit)
            ->get();
    }

    /**
     * Per-day visit counts padded with zeros so the dashboard sparkline has
     * one entry per day in the window, even on days with no traffic.
     */
    private function dailyVisits(Carbon $since, Carbon $now): array
    {
        $raw = $this->humanVisits()
            ->where('created_at', '>=', $since)
            ->select(
                DB::raw('DATE(created_at) as day'),
                DB::raw('COUNT(*) as visits'),
            )
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $days = [];
        for ($i = self::WINDOW_DAYS - 1; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i)->format('Y-m-d');
            $days[] = [
                'day' => $day,
                'visits' => (int) ($raw[$day]->visits ?? 0),
            ];
        }

        return $days;
    }
}
