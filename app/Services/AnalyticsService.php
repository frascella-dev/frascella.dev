<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Cookieless, GDPR-friendly analytics. Hashes the IP + UA against a
 * daily-rotating salt so we can count unique visitors per day without ever
 * being able to recover the original IP after the salt is gone (48h).
 *
 * Nothing here writes a cookie. Nothing reads or stores PII at rest.
 */
class AnalyticsService
{
    public const RETENTION_DAYS = 90;
    private const SALT_TTL_SECONDS = 60 * 60 * 48;

    /**
     * Record a single page view. Caller passes any extra fields it has —
     * the rest is derived from the request (UA, IP, country header).
     */
    public function record(Request $request, array $extra = []): void
    {
        $ua = (string) $request->userAgent();
        $ip = (string) ($request->ip() ?? '');

        AnalyticsEvent::create(array_merge(
            [
                'referrer_host' => $this->referrerHost($request),
                'country_code' => $this->countryCode($request),
                'device' => $this->deviceClass($ua),
                'browser' => $this->browserFamily($ua),
                'os' => $this->osFamily($ua),
                'visitor_hash' => $this->visitorHash($ip, $ua),
                'created_at' => CarbonImmutable::now(),
            ],
            $extra,
        ));
    }

    /**
     * Day-bucketed page-view counts for the last N days, ready for a
     * line chart.
     *
     * @return array<int, array{date: string, views: int, visitors: int}>
     */
    public function timeSeries(int $days): array
    {
        $since = CarbonImmutable::now()->subDays($days)->startOfDay();

        $rows = AnalyticsEvent::query()
            ->where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->keyBy('d');

        // Fill missing days with zeros so the chart shows continuity.
        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = CarbonImmutable::now()->subDays($i)->format('Y-m-d');
            $row = $rows->get($day);
            $out[] = [
                'date' => $day,
                'views' => (int) ($row->views ?? 0),
                'visitors' => (int) ($row->visitors ?? 0),
            ];
        }
        return $out;
    }

    /**
     * Headline numbers for the last N days vs the prior N (so the dashboard
     * can show a delta).
     *
     * @return array{views: int, visitors: int, prev_views: int, prev_visitors: int}
     */
    public function totals(int $days): array
    {
        $now = CarbonImmutable::now();
        $since = $now->subDays($days);
        $priorSince = $now->subDays($days * 2);

        $cur = AnalyticsEvent::query()
            ->where('created_at', '>=', $since)
            ->selectRaw('COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors')
            ->first();

        $prev = AnalyticsEvent::query()
            ->where('created_at', '>=', $priorSince)
            ->where('created_at', '<', $since)
            ->selectRaw('COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors')
            ->first();

        return [
            'views' => (int) ($cur->views ?? 0),
            'visitors' => (int) ($cur->visitors ?? 0),
            'prev_views' => (int) ($prev->views ?? 0),
            'prev_visitors' => (int) ($prev->visitors ?? 0),
        ];
    }

    /**
     * GROUP BY a dimension (country/device/browser/os/referrer_host),
     * ordered by frequency. Limit caps the slice count for charts.
     *
     * @return array<int, array{label: string, count: int}>
     */
    public function breakdown(string $column, int $days, int $limit = 10): array
    {
        $allowed = ['country_code', 'device', 'browser', 'os', 'referrer_host'];
        if (!in_array($column, $allowed, true)) {
            return [];
        }

        $since = CarbonImmutable::now()->subDays($days);

        return AnalyticsEvent::query()
            ->where('created_at', '>=', $since)
            ->selectRaw("COALESCE($column, '—') as label, COUNT(*) as count")
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

    /**
     * Daily-rotating salt. Stored in the cache backend (DB driver here)
     * with a 48h TTL so old salts naturally fall out and yesterday's
     * visitor hashes can never be recomputed from a fresh IP.
     */
    private function dailySalt(): string
    {
        $key = 'analytics:salt:' . CarbonImmutable::now()->format('Y-m-d');

        return Cache::remember(
            $key,
            self::SALT_TTL_SECONDS,
            fn () => Str::random(64),
        );
    }

    private function visitorHash(string $ip, string $ua): string
    {
        return hash('sha256', $this->dailySalt() . '|' . $ip . '|' . $ua);
    }

    /**
     * Read the country code from CF-IPCountry when behind Cloudflare;
     * silently skip otherwise (no MaxMind dependency).
     */
    private function countryCode(Request $request): ?string
    {
        $cc = $request->header('CF-IPCountry');
        if (!$cc) {
            return null;
        }
        $cc = strtoupper(substr((string) $cc, 0, 2));

        return preg_match('/^[A-Z]{2}$/', $cc) ? $cc : null;
    }

    private function referrerHost(Request $request): ?string
    {
        $ref = $request->headers->get('referer');
        if (!$ref) {
            return null;
        }
        $host = parse_url($ref, PHP_URL_HOST);
        if (!$host) {
            return null;
        }
        $self = parse_url((string) config('app.url'), PHP_URL_HOST);

        // Drop self-referrals (a click within the portfolio shouldn't
        // count as inbound traffic).
        return $self && strcasecmp($host, $self) === 0 ? null : strtolower($host);
    }

    private function deviceClass(string $ua): string
    {
        $u = strtolower($ua);
        if (preg_match('/(ipad|tablet|kindle|playbook|silk)/', $u)) {
            return 'tablet';
        }
        if (preg_match('/(mobile|iphone|ipod|android(?!.*tablet)|webos|blackberry|opera mini|iemobile)/', $u)) {
            return 'mobile';
        }
        if (preg_match('/(windows|macintosh|mac os x|linux|cros|x11)/', $u)) {
            return 'desktop';
        }
        return 'other';
    }

    private function browserFamily(string $ua): string
    {
        $u = strtolower($ua);
        // Order matters: Edge/Chromium-based first because they include
        // 'chrome' in their UA.
        if (str_contains($u, 'edg/')) return 'edge';
        if (str_contains($u, 'opr/') || str_contains($u, 'opera')) return 'opera';
        if (str_contains($u, 'firefox/')) return 'firefox';
        if (str_contains($u, 'chrome/') && !str_contains($u, 'chromium')) return 'chrome';
        if (str_contains($u, 'chromium/')) return 'chromium';
        if (str_contains($u, 'safari/')) return 'safari';
        return 'other';
    }

    private function osFamily(string $ua): string
    {
        $u = strtolower($ua);
        if (str_contains($u, 'iphone') || str_contains($u, 'ipad') || str_contains($u, 'ipod')) return 'ios';
        if (str_contains($u, 'android')) return 'android';
        if (str_contains($u, 'mac os x') || str_contains($u, 'macintosh')) return 'mac';
        if (str_contains($u, 'windows')) return 'win';
        if (str_contains($u, 'linux')) return 'linux';
        if (str_contains($u, 'cros')) return 'cros';
        return 'other';
    }

    /**
     * Drop events older than the retention window. Called by the daily
     * scheduled command.
     */
    public function pruneOldEvents(): int
    {
        $cutoff = CarbonImmutable::now()->subDays(self::RETENTION_DAYS);

        return DB::table('analytics_events')
            ->where('created_at', '<', $cutoff)
            ->delete();
    }
}
