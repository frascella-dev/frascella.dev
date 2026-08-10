<?php

/**
 * Front controller — the only file the web server executes.
 *
 * Two jobs, kept apart on purpose:
 *
 *   the contact form   stateless, and stays that way. If the database is
 *                      down, /api/contact still sends mail.
 *   analytics          the only stateful part of the service: an ingest
 *                      endpoint the site beacons to, and the admin routes
 *                      that read it back.
 *
 * Routes:
 *
 *   GET  /api/health         → 200 {"status":"ok", …}          (never throttled)
 *   POST /api/contact        → 200 {"status":"ok", …}
 *                            → 422 {message, errors:{field:[msg]}}  (Laravel shape)
 *                            → 429 on the rate limits, 503 when mail is down in prod
 *   POST /api/track          → 204 always (consent decides whether it counted)
 *   POST /api/admin/login    → 200 {"ok":true,"mfa":true} + pending session, or 401
 *   POST /api/admin/mfa      → 200 {"ok":true} — the session becomes usable, or 401
 *   POST /api/admin/logout   → 204
 *   GET  /api/admin/me       → 200 {"authenticated":bool,"mfaPending":bool,…}
 *   GET  /api/admin/stats    → 200 {…the dashboard…}, or 401
 *
 * Works both under nginx/PHP-FPM (CloudPanel — route /api/* here) and under
 * the CLI server for local dev: `composer dev` → http://localhost:3000/api.
 */

declare(strict_types=1);

use Api\Admin;
use Api\AdminUser;
use Api\Analytics;
use Api\Contact;
use Api\Db;
use Api\Env;
use Api\Http;
use Api\RateLimiter;
use Api\Stats;
use Api\Validator;

// Two layouts, one file. In the repo this lives at services/api/public/ with
// vendor/ one level up; deployed (see services/builder) it lives at
// htdocs/api/ and everything private — vendor, src, .env, var — sits in
// app/ next to htdocs, outside the document root.
$appRoot = is_dir(__DIR__ . '/../src')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2) . '/app';

// The tarball ships composer.json and composer.lock, not vendor/ — so a
// deployment that skipped `composer install` fails here, and it should fail
// legibly rather than as a blank 500 with a `require` in the log.
if (!is_file($appRoot . '/vendor/autoload.php')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'Dependencies are not installed on this server.']);
    error_log("Missing $appRoot/vendor/autoload.php — run composer install --no-dev in $appRoot");
    exit;
}

require $appRoot . '/vendor/autoload.php';

Env::load($appRoot . '/.env');
Db::init($appRoot);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');
$state = $appRoot . '/var/state';

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
    $limiter = new RateLimiter($state);
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

    // Which language the form was filled in — used for the two messages below
    // that the visitor reads, and carried into the notification so a reply
    // goes out in the language the message arrived in.
    $locale = Validator::locale($input['locale'] ?? null);

    $result = Contact::submit(
        name: trim((string) $input['name']),
        email: strtolower(trim((string) $input['email'])),
        body: trim((string) $input['message']),
        limiter: $limiter,
        locale: $locale,
    );

    if ($result !== 'ok') {
        if ($result === 'mail_not_configured') {
            // Never rendered — the site turns any non-422 into its own
            // sentence — so this one stays English, for a log or a curl.
            Http::json(503, [
                'status' => 'error',
                'message' => 'Mail is not configured on the server.',
            ]);
        }
        $message = Validator::say(
            $locale,
            $result === 'cooldown' ? 'contact.cooldown' : 'contact.undelivered',
        );
        Http::json(422, ['message' => $message, 'errors' => ['message' => [$message]]]);
    }

    Http::json(200, ['status' => 'ok', 'message' => 'Message sent.']);
}

// --- analytics ingest -------------------------------------------------------

if ($path === '/api/track' && $method === 'POST') {
    // A batch every few seconds from a reader, far more from anything that
    // is not one. The window is generous because losing a real visitor's
    // events matters more than counting a flooder's.
    $limiter = new RateLimiter($state);
    if (!$limiter->hit('track:' . Http::clientIp(), limit: 240, ttlSeconds: 60)) {
        Http::noContent(429);
    }

    // Ingest swallows its own failures; 204 either way, so nothing on the
    // page can infer whether it was counted.
    Analytics::ingest(Http::readJsonBody());
    Http::noContent();
}

// --- admin ------------------------------------------------------------------

if ($path === '/api/admin/login' && $method === 'POST') {
    if (!Db::isReady()) {
        // Accounts and sessions both live in the database; without the schema
        // a correct password would still fail, and confusingly.
        Http::json(503, ['message' => 'The database has not been migrated yet.']);
    }
    if (!Admin::isEnabled()) {
        Http::json(503, ['message' => 'No account exists yet — run bin/admin-user.php create.']);
    }

    // Five tries a quarter hour. This is the front door to a database of
    // other people's browsing, so the window is much tighter than the rest.
    $limiter = new RateLimiter($state);
    if (!$limiter->hit('admin:' . Http::clientIp(), limit: 5, ttlSeconds: 900)) {
        Http::json(429, ['message' => 'Too many attempts — try again later.']);
    }

    $input = Http::readJsonBody();
    $errors = Validator::adminLogin($input);
    if ($errors !== []) {
        $first = current($errors)[0] ?? 'Validation failed.';
        Http::json(422, ['message' => $first, 'errors' => $errors]);
    }

    $user = AdminUser::findByEmail((string) $input['email']);
    if (!AdminUser::verifyPassword($user, (string) $input['password'])) {
        // Deliberately slow, and deliberately vague about which half was
        // wrong — an account that exists should not answer differently.
        usleep(300_000);
        Http::json(401, ['message' => 'Wrong email or password.']);
    }

    Admin::start((int) $user['id']);

    // The password alone gets you nowhere: the session is pending until the
    // code lands. `mfa` is always true — every account has a second factor.
    Http::json(200, ['ok' => true, 'mfa' => true]);
}

if ($path === '/api/admin/mfa' && $method === 'POST') {
    // Looser than the password window — a code expires on its own every
    // thirty seconds — but still far from unlimited.
    $limiter = new RateLimiter($state);
    if (!$limiter->hit('admin-mfa:' . Http::clientIp(), limit: 10, ttlSeconds: 900)) {
        Http::json(429, ['message' => 'Too many attempts — try again later.']);
    }

    $input = Http::readJsonBody();
    $code = is_string($input['code'] ?? null) ? trim($input['code']) : '';
    if ($code === '') {
        Http::json(422, [
            'message' => 'Enter the code from your authenticator.',
            'errors' => ['code' => ['Enter the code from your authenticator.']],
        ]);
    }

    $result = Admin::completeMfa($code);
    if (!$result['ok']) {
        usleep(300_000);
        Http::json(401, ['message' => 'That code is not right, or it has expired.']);
    }

    Http::json(200, [
        'ok' => true,
        'usedRecovery' => $result['usedRecovery'],
        'recoveryLeft' => $result['recoveryLeft'],
    ]);
}

if ($path === '/api/admin/logout' && $method === 'POST') {
    Admin::logout();
    Http::noContent();
}

if ($path === '/api/admin/me' && $method === 'GET') {
    $session = Admin::session();
    $user = Admin::currentUser();

    Http::json(200, [
        'authenticated' => $user !== null,
        // The password step is done but the code is not — the sign-in form
        // uses this to come back to the second step after a reload.
        'mfaPending' => $session !== null && (int) $session['mfa_pending'] === 1,
        'configured' => Admin::isEnabled(),
        'user' => $user === null ? null : ['name' => $user['name'], 'email' => $user['email']],
    ]);
}

if ($path === '/api/admin/stats' && $method === 'GET') {
    Admin::requireSession();

    if (!Db::isReady()) {
        Http::json(503, ['message' => 'The database has not been migrated yet.']);
    }

    $today = Analytics::day(time());
    $to = Validator::day($_GET['to'] ?? null) ?? $today;
    $from = Validator::day($_GET['from'] ?? null)
        ?? Analytics::day(time() - 29 * 86400);

    if ($from > $to) {
        [$from, $to] = [$to, $from];
    }
    // A year and a bit is the retention ceiling; asking for more is a typo.
    $earliest = Analytics::day(strtotime("$to -400 days") ?: time());
    if ($from < $earliest) {
        $from = $earliest;
    }

    Http::json(200, Stats::overview($from, $to));
}

Http::json(404, ['message' => 'Not found.']);
