<?php

declare(strict_types=1);

namespace Api;

/** Request/response plumbing shared by every route. */
final class Http
{
    /**
     * The visitor's address, for rate-limiting. Behind CloudPanel's own
     * proxy hop (public 443 server → PHP server on 8080) the socket peer is
     * loopback and the real address travels in X-Real-IP / X-Forwarded-For.
     * Those headers are only believed when the peer actually *is* loopback —
     * a direct client cannot spoof its way into someone else's bucket.
     */
    public static function clientIp(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (in_array($ip, ['127.0.0.1', '::1'], true)) {
            $forwarded = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0];
            $real = trim($_SERVER['HTTP_X_REAL_IP'] ?? $forwarded);
            if (filter_var($real, FILTER_VALIDATE_IP) !== false) {
                return $real;
            }
        }
        return $ip;
    }

    /**
     * CORS, matching what the NestJS service allowed: origins from the
     * CORS_ORIGINS env (comma-separated, "*" allows any), GET and POST only.
     * The allowed origin is echoed rather than "*" so the header stays
     * correct with credentials enabled.
     *
     * Credentials are only granted to an origin named *explicitly*. Under a
     * `*` policy the request still works, but without cookies — "any origin
     * may read this, with the caller's cookies attached" is how a third-party
     * page reads someone's admin dashboard. In the deployed layout the site
     * and the API are same-origin and none of this applies; it exists for
     * `npm run dev` on :5173 talking to :3000.
     */
    public static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin === '') {
            return; // same-origin or non-browser call — nothing to declare
        }

        $allowed = array_filter(array_map('trim', explode(',', Env::get('CORS_ORIGINS', '*') ?? '*')));
        $named = in_array($origin, $allowed, true);
        if (!$named && !in_array('*', $allowed, true)) {
            return; // not allowed: no CORS headers, the browser blocks it
        }

        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header(
            'Access-Control-Allow-Headers: '
                . ($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? 'Content-Type, Accept, X-Requested-With'),
        );
        header('Access-Control-Max-Age: 3600');
        if ($named) {
            header('Access-Control-Allow-Credentials: true');
        }
    }

    /** True when the request reached us over TLS, proxy hop included. */
    public static function isSecure(): bool
    {
        if (($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? 'off') !== 'off') {
            return true;
        }
        return strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    }

    /**
     * True when the caller's origin is a different site from ours — the dev
     * setup (:5173 → :3000), never the deployed one. Cookies have to be
     * SameSite=None there or the browser drops them on the floor.
     */
    public static function isCrossSite(): bool
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin === '') {
            return false;
        }
        $originHost = parse_url($origin, PHP_URL_HOST);
        $host = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
        return $originHost !== null && $originHost !== $host;
    }

    /** One cookie, with the SameSite/Secure pair the context actually allows. */
    public static function setCookie(
        string $name,
        string $value,
        int $maxAgeSeconds,
        bool $httpOnly = false,
    ): void {
        $crossSite = self::isCrossSite();
        setcookie($name, $value, [
            // 0 means "until the browser closes"; a negative age is a
            // deletion and has to land in the past, not at zero.
            'expires' => $maxAgeSeconds === 0 ? 0 : time() + $maxAgeSeconds,
            'path' => '/',
            // SameSite=None is only honoured on a secure connection; on
            // http://localhost browsers count that as secure, which is what
            // makes the cross-port dev setup work at all.
            'secure' => $crossSite || self::isSecure(),
            'httponly' => $httpOnly,
            'samesite' => $crossSite ? 'None' : 'Lax',
        ]);
    }

    public static function cookie(string $name): ?string
    {
        $value = $_COOKIE[$name] ?? null;
        return is_string($value) && $value !== '' ? $value : null;
    }

    public static function clearCookie(string $name): void
    {
        self::setCookie($name, '', -3600, true);
    }

    /** Sends a JSON response and stops — every route ends here. */
    public static function json(int $status, array $body): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /** Sends a bodyless response and stops. */
    public static function noContent(int $status = 204): never
    {
        http_response_code($status);
        exit;
    }

    /**
     * The contact form posts JSON; the tracker posts JSON labelled
     * `text/plain`, because that is a CORS-safelisted content type and so
     * never triggers a preflight — which `sendBeacon` cannot answer. A
     * form-encoded body is accepted too, so the endpoints stay curl-friendly.
     * Anything unparseable is an empty submission and fails downstream.
     *
     * @return array<string, mixed>
     */
    public static function readJsonBody(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        if ($raw !== '' && (str_starts_with(ltrim($raw), '{') || str_starts_with(ltrim($raw), '['))) {
            $data = json_decode($raw, true);
            return is_array($data) ? $data : [];
        }
        return $_POST;
    }
}
