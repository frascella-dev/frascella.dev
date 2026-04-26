<?php

namespace App\Http\Middleware;

use App\Services\AnalyticsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackPageView
{
    public function __construct(private readonly AnalyticsService $analytics)
    {
    }

    /**
     * Recorded on the response leg so a slow DB write never blocks page
     * delivery — and so we can skip recording on prerender/HEAD/non-2xx.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$this->shouldTrack($request, $response)) {
            return $response;
        }

        try {
            $this->analytics->record($request, [
                'path' => '/' . trim($request->path(), '/'),
            ]);
        } catch (\Throwable $e) {
            // Analytics must never take the page down. Swallow.
            report($e);
        }

        return $response;
    }

    private function shouldTrack(Request $request, Response $response): bool
    {
        if ($request->method() !== 'GET') return false;
        if ($request->isJson() || $request->expectsJson()) return false;
        if ($response->getStatusCode() >= 300) return false;
        // Crude bot filter — we'd rather drop a few real users than poison
        // the dataset with crawler hits.
        $ua = strtolower((string) $request->userAgent());
        if ($ua === '' || preg_match('/(bot|crawl|spider|slurp|curl|wget|monitor|preview|fetch|http|axios|python|java)/', $ua)) {
            return false;
        }
        return true;
    }
}
