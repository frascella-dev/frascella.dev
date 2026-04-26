<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    private const ALLOWED_RANGES = [7, 30, 90];

    public function __construct(private readonly AnalyticsService $analytics)
    {
    }

    public function overview(Request $request): JsonResponse
    {
        $days = $this->days($request);

        return response()->json([
            'range_days' => $days,
            'totals' => $this->analytics->totals($days),
            'time_series' => $this->analytics->timeSeries($days),
            'top_countries' => $this->analytics->breakdown('country_code', $days, 6),
            'top_pages' => $this->topPaths($days, 5),
        ]);
    }

    public function visits(Request $request): JsonResponse
    {
        $days = $this->days($request);

        return response()->json([
            'range_days' => $days,
            'time_series' => $this->analytics->timeSeries($days),
            'totals' => $this->analytics->totals($days),
        ]);
    }

    public function geo(Request $request): JsonResponse
    {
        $days = $this->days($request);

        return response()->json([
            'range_days' => $days,
            'countries' => $this->analytics->breakdown('country_code', $days, 20),
        ]);
    }

    public function devices(Request $request): JsonResponse
    {
        $days = $this->days($request);

        return response()->json([
            'range_days' => $days,
            'devices' => $this->analytics->breakdown('device', $days, 6),
            'browsers' => $this->analytics->breakdown('browser', $days, 8),
            'os' => $this->analytics->breakdown('os', $days, 8),
        ]);
    }

    public function referrers(Request $request): JsonResponse
    {
        $days = $this->days($request);

        return response()->json([
            'range_days' => $days,
            'referrers' => $this->analytics->breakdown('referrer_host', $days, 10),
        ]);
    }

    private function days(Request $request): int
    {
        $raw = (int) $request->query('range', 30);

        return in_array($raw, self::ALLOWED_RANGES, true) ? $raw : 30;
    }

    /**
     * GROUP BY path is a one-shot here — keeps it out of the service
     * because it's only used by this controller.
     *
     * @return array<int, array{label: string, count: int}>
     */
    private function topPaths(int $days, int $limit): array
    {
        $since = \Carbon\CarbonImmutable::now()->subDays($days);

        return \App\Models\AnalyticsEvent::query()
            ->where('created_at', '>=', $since)
            ->whereNotNull('path')
            ->selectRaw('path as label, COUNT(*) as count')
            ->groupBy('label')
            ->orderByDesc('count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->label,
                'count' => (int) $row->count,
            ])
            ->all();
    }
}
