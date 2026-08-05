<?php

/**
 * Front controller — the only file the web server executes.
 *
 * Converted from the NestJS service; the HTTP contract is unchanged so the
 * site's `fieldErrors()` helper and the contact form keep working as they
 * are:
 *
 *   GET  /api/health   → 200 {"status":"ok"}            (never throttled)
 *   POST /api/contact  → 200 {"status":"ok", ...}
 *                      → 422 {message, errors:{field:[msg]}}  (Laravel shape)
 *                      → 429 on the rate limits, 503 when mail is down in prod
 *
 * Works both under nginx/PHP-FPM (CloudPanel — route /api/* here) and under
 * the CLI server for local dev: `composer dev` → http://localhost:3000/api.
 */

declare(strict_types=1);

use Api\Contact;
use Api\Env;
use Api\Http;
use Api\RateLimiter;
use Api\Validator;

// Two layouts, one file. In the repo this lives at services/api/public/ with
// vendor/ one level up; deployed (see services/builder) it lives at
// htdocs/api/ and everything private — vendor, src, .env, var — sits in
// app/ next to htdocs, outside the document root.
$appRoot = is_dir(__DIR__ . '/../vendor')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2) . '/app';

require $appRoot . '/vendor/autoload.php';

Env::load($appRoot . '/.env');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');

Http::cors();
if ($method === 'OPTIONS') {
    // Preflight — CORS headers are already out, nothing else to say.
    http_response_code(204);
    exit;
}

if ($path === '/api/health' && $method === 'GET') {
    Http::json(200, ['status' => 'ok']);
}

if ($path === '/api/contact' && $method === 'POST') {
    $limiter = new RateLimiter($appRoot . '/var/state');
    $ip = Http::clientIp();

    // The same two windows the NestJS throttler enforced: a global baseline
    // and a much tighter one for actual submissions.
    if (
        !$limiter->hit("ip:$ip", limit: 30, ttlSeconds: 60)
        || !$limiter->hit("contact:$ip", limit: 5, ttlSeconds: 3600)
    ) {
        Http::json(429, ['message' => 'Too many requests — please try again later.']);
    }

    $input = Http::readJsonBody();
    $errors = Validator::contact($input);
    if ($errors !== []) {
        $first = current($errors)[0] ?? 'Validation failed.';
        Http::json(422, ['message' => $first, 'errors' => $errors]);
    }

    $result = Contact::submit(
        name: trim((string) $input['name']),
        email: strtolower(trim((string) $input['email'])),
        body: trim((string) $input['message']),
        limiter: $limiter,
    );

    if ($result !== 'ok') {
        if ($result === 'mail_not_configured') {
            Http::json(503, [
                'status' => 'error',
                'message' => 'Mail is not configured on the server.',
            ]);
        }
        $message = $result === 'cooldown'
            ? 'You sent a message recently — please wait a bit before sending another.'
            : 'Could not deliver your message right now.';
        Http::json(422, ['message' => $message, 'errors' => ['message' => [$message]]]);
    }

    Http::json(200, ['status' => 'ok', 'message' => 'Message sent.']);
}

Http::json(404, ['message' => 'Not found.']);
