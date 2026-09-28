<?php

declare(strict_types=1);

namespace Api;

/**
 * Sessions for the dashboard.
 *
 * Signing in is two steps and one cookie. The password mints a session that
 * is deliberately useless — `mfa_pending`, five minutes to live, and every
 * guarded route refuses it — and answering the second factor is what turns
 * it into a real one. There is no separate "half-logged-in" token to keep
 * track of, and closing the tab between the two steps leaves nothing behind
 * that expires later than the coffee it took to make.
 *
 * Sessions are rows rather than signed cookies so that signing out, disabling
 * an account, or clearing the table actually revokes them. Only the SHA-256
 * of the token is stored: a dump of the database hands over nothing that can
 * be pasted into a browser.
 */
final class Admin
{
    public const COOKIE = 'pf_admin';

    /** A week, refreshed on use: long enough not to be a chore, short enough. */
    private const SESSION_TTL = 7 * 86400;

    /** How long the password buys you to produce a code. */
    private const MFA_GRACE = 300;

    /** True when there is anybody to sign in as. */
    public static function isEnabled(): bool
    {
        try {
            return AdminUser::count() > 0;
        } catch (\PDOException) {
            return false;
        }
    }

    /**
     * Opens a session for a user who has just proved their password. The
     * session cannot read anything until `completeMfa()` succeeds.
     *
     * @return string the raw token, already set as a cookie
     */
    public static function start(int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $now = time();

        Db::run(
            'INSERT INTO admin_sessions (token_hash, user_id, mfa_pending, created_at, expires_at, ip, user_agent)
             VALUES (?, ?, 1, ?, ?, ?, ?)',
            [
                hash('sha256', $token),
                $userId,
                $now,
                $now + self::MFA_GRACE,
                mb_substr(Http::clientIp(), 0, 45),
                mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
            ],
        );

        // Housekeeping is cheap here and nowhere else: the table only grows
        // when somebody signs in.
        Db::run('DELETE FROM admin_sessions WHERE expires_at < ?', [$now]);

        // A session cookie, not a persistent one: the row's expiry is the
        // real lifetime, and there is no reason for the browser to keep a
        // token after it closes.
        Http::setCookie(self::COOKIE, $token, self::SESSION_TTL, httpOnly: true);

        return $token;
    }

    /**
     * The live session row, pending or not, or null.
     *
     * @return array<string, mixed>|null
     */
    public static function session(): ?array
    {
        $token = Http::cookie(self::COOKIE);
        if ($token === null || preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return null;
        }

        try {
            $row = Db::first(
                'SELECT s.*, u.email, u.name, u.disabled_at
                 FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
                 WHERE s.token_hash = ?',
                [hash('sha256', $token)],
            );
        } catch (\PDOException $e) {
            // A database that is missing, unmigrated or down means "not
            // signed in", not a 500.
            error_log('Admin session lookup failed: ' . $e->getMessage());
            return null;
        }

        if ($row === null || (int) $row['expires_at'] <= time() || $row['disabled_at'] !== null) {
            return null;
        }

        return $row;
    }

    /** True when the request carries a session that has cleared both steps. */
    public static function check(): bool
    {
        $session = self::session();
        if ($session === null || (int) $session['mfa_pending'] === 1) {
            return false;
        }

        // Sliding expiry, written at most once an hour so reading the
        // dashboard is not an UPDATE per request.
        $now = time();
        if ((int) $session['expires_at'] - $now < self::SESSION_TTL - 3600) {
            Db::run(
                'UPDATE admin_sessions SET expires_at = ? WHERE token_hash = ?',
                [$now + self::SESSION_TTL, $session['token_hash']],
            );
        }

        return true;
    }

    /** @return array<string, mixed>|null the signed-in user, both steps cleared */
    public static function currentUser(): ?array
    {
        $session = self::session();
        if ($session === null || (int) $session['mfa_pending'] === 1) {
            return null;
        }

        return AdminUser::find((int) $session['user_id']);
    }

    /**
     * Answers the second factor for the pending session: a TOTP code, or one
     * of the account's recovery codes.
     *
     * @return array{ok: bool, usedRecovery: bool, recoveryLeft: int}
     */
    public static function completeMfa(string $code): array
    {
        $session = self::session();
        if ($session === null || (int) $session['mfa_pending'] === 0) {
            return ['ok' => false, 'usedRecovery' => false, 'recoveryLeft' => 0];
        }

        $userId = (int) $session['user_id'];
        $usedRecovery = false;

        if (!AdminUser::verifyTotp($userId, $code)) {
            if (!AdminUser::consumeRecoveryCode($userId, $code)) {
                return ['ok' => false, 'usedRecovery' => false, 'recoveryLeft' => 0];
            }
            $usedRecovery = true;
        }

        Db::run(
            'UPDATE admin_sessions SET mfa_pending = 0, expires_at = ? WHERE token_hash = ?',
            [time() + self::SESSION_TTL, $session['token_hash']],
        );
        AdminUser::noteLogin($userId);

        return [
            'ok' => true,
            'usedRecovery' => $usedRecovery,
            'recoveryLeft' => AdminUser::unusedRecoveryCodes($userId),
        ];
    }

    /** Ends this session and clears the cookie. */
    public static function logout(): void
    {
        $token = Http::cookie(self::COOKIE);
        if ($token !== null && preg_match('/^[a-f0-9]{64}$/', $token) === 1) {
            try {
                Db::run('DELETE FROM admin_sessions WHERE token_hash = ?', [hash('sha256', $token)]);
            } catch (\PDOException $e) {
                // The cookie still goes; the row expires on its own.
                error_log('Admin logout failed: ' . $e->getMessage());
            }
        }
        Http::clearCookie(self::COOKIE);
    }

    /** Guard for every /api/admin route past sign-in. Ends the request on failure. */
    public static function requireSession(): void
    {
        if (!self::check()) {
            Http::json(401, ['message' => 'Not signed in.']);
        }
    }
}
