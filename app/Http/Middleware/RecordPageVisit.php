<?php

namespace App\Http\Middleware;

use App\Models\PageVisit;
use App\Services\UserAgentParser;
use App\Support\IpHasher;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Append-only request logger for the public side.
 *
 * We lean on Laravel's terminable-middleware protocol so the write happens
 * *after* the response has been flushed to the client — an analytics insert
 * should never slow down TTFB. On any failure we swallow the exception and
 * hand the pipeline back unchanged; missing a visit row is better than 500ing
 * a page that the user already sees.
 */
class RecordPageVisit
{
    private const START_ATTR = 'app.visit_started_at';

    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set(self::START_ATTR, microtime(true));

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if ($this->shouldSkip($request)) {
            return;
        }

        try {
            $this->record($request, $response);
        } catch (Throwable $e) {
            report($e);
        }
    }

    private function record(Request $request, Response $response): void
    {
        $startedAt = (float) $request->attributes->get(self::START_ATTR, microtime(true));
        $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);

        $ua = $request->userAgent();
        $parsed = UserAgentParser::parse($ua);

        $referrer = $request->headers->get('referer');
        $referrerHost = null;
        if ($referrer) {
            $host = parse_url($referrer, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $referrerHost = mb_substr($host, 0, 255);
            }
        }

        $ipHash = IpHasher::hash($request->ip() ?? '');

        PageVisit::create([
            'path' => mb_substr($request->path(), 0, 2048),
            'query_string' => $request->getQueryString(),
            'method' => $request->method(),
            'status_code' => $response->getStatusCode(),
            'response_time_ms' => $elapsedMs,
            'referrer' => $referrer,
            'referrer_host' => $referrerHost,
            'user_agent' => $ua,
            'device_type' => $parsed['device_type'],
            'browser' => $parsed['browser'],
            'os' => $parsed['os'],
            'ip_hash' => $ipHash,
            'utm_source' => $this->truncate($request->query('utm_source')),
            'utm_medium' => $this->truncate($request->query('utm_medium')),
            'utm_campaign' => $this->truncate($request->query('utm_campaign')),
            'utm_content' => $this->truncate($request->query('utm_content')),
            'utm_term' => $this->truncate($request->query('utm_term')),
            'session_id' => $this->safeSessionId($request),
            'user_id' => $request->user()?->id,
            'created_at' => now(),
        ]);
    }

    private function shouldSkip(Request $request): bool
    {
        $path = $request->path();

        if ($path === 'admin' || str_starts_with($path, 'admin/')) {
            return true;
        }

        if (in_array($path, ['up', 'favicon.ico', 'robots.txt', 'sitemap.xml'], true)) {
            return true;
        }

        // Framework internals (_debugbar, _ignition, Livewire, etc.)
        if (str_starts_with($path, '_')) {
            return true;
        }

        if (preg_match('/\.(css|js|map|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|eot)$/i', $path)) {
            return true;
        }

        // Analytics is about pageviews — ignore form posts and API calls that
        // happen to ride the web middleware group.
        if ($request->method() !== 'GET') {
            return true;
        }

        return false;
    }

    private function truncate(mixed $value): ?string
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        return mb_substr($value, 0, 255);
    }

    private function safeSessionId(Request $request): ?string
    {
        try {
            return $request->hasSession() ? $request->session()->getId() : null;
        } catch (Throwable) {
            return null;
        }
    }
}
