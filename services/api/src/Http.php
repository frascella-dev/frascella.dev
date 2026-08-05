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
     * correct if credentials are ever enabled.
     */
    public static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin === '') {
            return; // same-origin or non-browser call — nothing to declare
        }

        $allowed = array_filter(array_map('trim', explode(',', Env::get('CORS_ORIGINS', '*') ?? '*')));
        if (!in_array('*', $allowed, true) && !in_array($origin, $allowed, true)) {
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
    }

    /** Sends a JSON response and stops — every route ends here. */
    public static function json(int $status, array $body): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * The contact form posts JSON; a form-encoded body is accepted too so
     * the endpoint stays curl-friendly. Anything unparseable is just an
     * empty submission and fails validation downstream.
     *
     * @return array<string, mixed>
     */
    public static function readJsonBody(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $type = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains($type, 'application/json')) {
            $data = json_decode($raw, true);
            return is_array($data) ? $data : [];
        }
        return $_POST;
    }
}
