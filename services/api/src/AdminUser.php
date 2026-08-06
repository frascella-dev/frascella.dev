<?php

declare(strict_types=1);

namespace Api;

/**
 * The dashboard's accounts.
 *
 * Not a user system in the usual sense: nobody signs themselves up, there is
 * no password reset by email and no roles. Accounts exist so that signing in
 * identifies a person rather than proving knowledge of a shared secret, and
 * so that removing someone's access is a row rather than a rotation.
 *
 * Two-factor is not optional. Every account is created with a TOTP secret
 * already generated, because the thing behind this login is a database of
 * other people's browsing, and a password that leaks is otherwise the whole
 * story. The escape hatch is a set of single-use recovery codes, shown once
 * at creation and stored only as hashes.
 */
final class AdminUser
{
    private const RECOVERY_CODES = 8;

    /**
     * Creates an account and returns the two things that are only ever
     * shown once: the TOTP secret, and the recovery codes.
     *
     * @return array{id: int, secret: string, recovery: list<string>}
     */
    public static function create(string $email, string $name, string $password): array
    {
        $email = self::normalizeEmail($email);
        $secret = Totp::secret();
        $now = time();

        Db::run(
            'INSERT INTO admin_users (email, name, password_hash, totp_secret, created_at)
             VALUES (?, ?, ?, ?, ?)',
            [$email, $name, password_hash($password, PASSWORD_DEFAULT), $secret, $now],
        );

        $id = (int) Db::value('SELECT id FROM admin_users WHERE email = ?', [$email]);

        return ['id' => $id, 'secret' => $secret, 'recovery' => self::issueRecoveryCodes($id)];
    }

    /** @return array<string, mixed>|null */
    public static function findByEmail(string $email): ?array
    {
        return Db::first('SELECT * FROM admin_users WHERE email = ?', [self::normalizeEmail($email)]);
    }

    /** @return array<string, mixed>|null */
    public static function find(int $id): ?array
    {
        return Db::first('SELECT * FROM admin_users WHERE id = ?', [$id]);
    }

    /** @return list<array<string, mixed>> */
    public static function all(): array
    {
        return Db::all('SELECT * FROM admin_users ORDER BY created_at');
    }

    /**
     * How many accounts exist at all, disabled ones included.
     *
     * Counting only the enabled ones would be the intuitive thing and it is
     * wrong: `Admin::isEnabled()` uses this to decide whether the dashboard
     * has ever been set up, and a lone disabled account would make the login
     * route answer "no account exists — run bin/admin-user.php create" to
     * somebody whose account exists and has been revoked. Being disabled is
     * `verifyPassword`'s business, and it answers 401 like any other refusal.
     */
    public static function count(): int
    {
        return (int) Db::value('SELECT COUNT(*) FROM admin_users');
    }

    /**
     * Password check that takes the same time whether or not the account
     * exists — otherwise the response time alone enumerates addresses.
     *
     * @param array<string, mixed>|null $user
     */
    public static function verifyPassword(?array $user, string $password): bool
    {
        // A real bcrypt hash of a value nothing can match, so the miss path
        // does the same work as the hit path.
        $hash = is_array($user)
            ? (string) $user['password_hash']
            : '$2y$12$usesomesillystringfoeghijklmnopqrstuvwxyzabcdefghijklmnopqr';

        $ok = password_verify($password, $hash);

        return $ok && is_array($user) && $user['disabled_at'] === null;
    }

    public static function setPassword(int $id, string $password): void
    {
        Db::run(
            'UPDATE admin_users SET password_hash = ? WHERE id = ?',
            [password_hash($password, PASSWORD_DEFAULT), $id],
        );
    }

    /**
     * A new secret and a new set of recovery codes — for a lost phone, and
     * the only way to re-enrol.
     *
     * @return array{secret: string, recovery: list<string>}
     */
    public static function resetMfa(int $id): array
    {
        $secret = Totp::secret();
        Db::run(
            'UPDATE admin_users SET totp_secret = ?, totp_confirmed_at = NULL, totp_last_counter = NULL
             WHERE id = ?',
            [$secret, $id],
        );

        return ['secret' => $secret, 'recovery' => self::issueRecoveryCodes($id)];
    }

    public static function setDisabled(int $id, bool $disabled): void
    {
        Db::run(
            'UPDATE admin_users SET disabled_at = ? WHERE id = ?',
            [$disabled ? time() : null, $id],
        );
        if ($disabled) {
            // Disabling somebody has to end the session they are holding.
            Db::run('DELETE FROM admin_sessions WHERE user_id = ?', [$id]);
        }
    }

    public static function delete(int $id): void
    {
        Db::run('DELETE FROM admin_sessions WHERE user_id = ?', [$id]);
        Db::run('DELETE FROM admin_recovery_codes WHERE user_id = ?', [$id]);
        Db::run('DELETE FROM admin_users WHERE id = ?', [$id]);
    }

    /**
     * Checks a TOTP code and burns the counter it used, so the same six
     * digits cannot be presented twice.
     */
    public static function verifyTotp(int $id, string $code): bool
    {
        $user = self::find($id);
        $secret = $user['totp_secret'] ?? null;
        if (!is_string($secret) || $secret === '') {
            return false;
        }

        $last = $user['totp_last_counter'] === null ? null : (int) $user['totp_last_counter'];
        $counter = Totp::verify($secret, $code, $last);
        if ($counter === null) {
            return false;
        }

        Db::run(
            'UPDATE admin_users SET totp_last_counter = ?, totp_confirmed_at = COALESCE(totp_confirmed_at, ?)
             WHERE id = ?',
            [$counter, time(), $id],
        );

        return true;
    }

    /** Spends a recovery code. Each one works exactly once. */
    public static function consumeRecoveryCode(int $id, string $code): bool
    {
        $hash = hash('sha256', self::normalizeRecoveryCode($code));
        $row = Db::first(
            'SELECT id FROM admin_recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL',
            [$id, $hash],
        );
        if ($row === null) {
            return false;
        }

        Db::run('UPDATE admin_recovery_codes SET used_at = ? WHERE id = ?', [time(), $row['id']]);

        return true;
    }

    public static function unusedRecoveryCodes(int $id): int
    {
        return (int) Db::value(
            'SELECT COUNT(*) FROM admin_recovery_codes WHERE user_id = ? AND used_at IS NULL',
            [$id],
        );
    }

    public static function noteLogin(int $id): void
    {
        Db::run('UPDATE admin_users SET last_login_at = ? WHERE id = ?', [time(), $id]);
    }

    /**
     * Replaces the account's recovery codes and returns the plaintext, which
     * is the only moment it exists.
     *
     * @return list<string>
     */
    private static function issueRecoveryCodes(int $id): array
    {
        Db::run('DELETE FROM admin_recovery_codes WHERE user_id = ?', [$id]);

        $now = time();
        $codes = [];
        for ($i = 0; $i < self::RECOVERY_CODES; $i++) {
            // Grouped in fours so it can be read off paper without losing
            // your place. The dashes are cosmetic — see normalizeRecoveryCode.
            $raw = strtolower(bin2hex(random_bytes(5)));
            $code = substr($raw, 0, 5) . '-' . substr($raw, 5, 5);
            $codes[] = $code;
            Db::run(
                'INSERT INTO admin_recovery_codes (user_id, code_hash, created_at) VALUES (?, ?, ?)',
                [$id, hash('sha256', self::normalizeRecoveryCode($code)), $now],
            );
        }

        return $codes;
    }

    private static function normalizeEmail(string $email): string
    {
        return mb_substr(strtolower(trim($email)), 0, 190);
    }

    /** Case, spaces and dashes are presentation; the code is the hex. */
    private static function normalizeRecoveryCode(string $code): string
    {
        return strtolower(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
    }
}
