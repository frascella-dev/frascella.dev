<?php

declare(strict_types=1);

namespace Api;

/**
 * The schema, and the tiny runner that applies it.
 *
 * Migrations are numbered statements, recorded in `schema_migrations`, and
 * applied in order — so `php bin/migrate.php` is safe to run on every deploy
 * and does nothing on the second run.
 *
 * Only two things differ between SQLite and MySQL at this size: how an
 * auto-increment primary key is spelled, and the table options MySQL wants.
 * Both are behind helpers below. Everything else — including the day and
 * hour columns that let the dashboard group without a single date function —
 * is plain portable SQL.
 */
final class Schema
{
    /**
     * Ordered. Never edit a shipped one; add the next number instead.
     *
     * @return array<string, list<string>>
     */
    private static function migrations(): array
    {
        $mysql = self::isMysql();
        $id = $mysql
            ? 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY'
            : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $opts = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';

        return [
            '0001_visitors' => [
                "CREATE TABLE IF NOT EXISTS visitors (
                    id VARCHAR(32) NOT NULL PRIMARY KEY,
                    first_seen INTEGER NOT NULL,
                    last_seen INTEGER NOT NULL,
                    first_day CHAR(10) NOT NULL,
                    sessions_count INTEGER NOT NULL DEFAULT 0,
                    events_count INTEGER NOT NULL DEFAULT 0
                )$opts",
                'CREATE INDEX idx_visitors_last_seen ON visitors (last_seen)',
            ],

            '0002_sessions' => [
                // One row per visit. The counters (events, pageviews, max
                // scroll, contacted) are rolled up here as events land, so
                // the dashboard's headline numbers never scan the event
                // table — the expensive question is asked once, at write.
                "CREATE TABLE IF NOT EXISTS sessions (
                    id VARCHAR(32) NOT NULL PRIMARY KEY,
                    visitor_id VARCHAR(32) NOT NULL,
                    started_at INTEGER NOT NULL,
                    last_seen INTEGER NOT NULL,
                    day CHAR(10) NOT NULL,
                    hour SMALLINT NOT NULL DEFAULT 0,
                    entry_path VARCHAR(255) NOT NULL DEFAULT '/',
                    referrer_host VARCHAR(190) NULL,
                    referrer_url VARCHAR(500) NULL,
                    utm_source VARCHAR(120) NULL,
                    utm_medium VARCHAR(120) NULL,
                    utm_campaign VARCHAR(120) NULL,
                    device VARCHAR(16) NOT NULL DEFAULT 'unknown',
                    os VARCHAR(40) NOT NULL DEFAULT 'unknown',
                    browser VARCHAR(40) NOT NULL DEFAULT 'unknown',
                    viewport_w INTEGER NULL,
                    viewport_h INTEGER NULL,
                    screen_w INTEGER NULL,
                    screen_h INTEGER NULL,
                    language VARCHAR(16) NULL,
                    timezone VARCHAR(64) NULL,
                    country VARCHAR(2) NULL,
                    events_count INTEGER NOT NULL DEFAULT 0,
                    pageviews INTEGER NOT NULL DEFAULT 0,
                    max_scroll SMALLINT NOT NULL DEFAULT 0,
                    duration_ms INTEGER NOT NULL DEFAULT 0,
                    contacted SMALLINT NOT NULL DEFAULT 0
                )$opts",
                'CREATE INDEX idx_sessions_day ON sessions (day)',
                'CREATE INDEX idx_sessions_visitor ON sessions (visitor_id)',
                'CREATE INDEX idx_sessions_started ON sessions (started_at)',
            ],

            '0003_events' => [
                "CREATE TABLE IF NOT EXISTS events (
                    id $id,
                    session_id VARCHAR(32) NOT NULL,
                    visitor_id VARCHAR(32) NOT NULL,
                    name VARCHAR(48) NOT NULL,
                    category VARCHAR(24) NOT NULL,
                    label VARCHAR(190) NULL,
                    value INTEGER NULL,
                    path VARCHAR(255) NOT NULL DEFAULT '/',
                    created_at INTEGER NOT NULL,
                    day CHAR(10) NOT NULL
                )$opts",
                'CREATE INDEX idx_events_day ON events (day)',
                'CREATE INDEX idx_events_session ON events (session_id)',
                'CREATE INDEX idx_events_name_day ON events (name, day)',
                'CREATE INDEX idx_events_created ON events (created_at)',
            ],

            '0004_admin_sessions' => [
                // Only the hash is stored: a stolen database does not hand
                // over a usable admin cookie.
                "CREATE TABLE IF NOT EXISTS admin_sessions (
                    token_hash VARCHAR(64) NOT NULL PRIMARY KEY,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    ip VARCHAR(45) NULL,
                    user_agent VARCHAR(255) NULL
                )$opts",
                'CREATE INDEX idx_admin_sessions_expires ON admin_sessions (expires_at)',
            ],

            '0005_admin_users' => [
                // The dashboard grew from one password in .env to accounts,
                // so that signing in identifies *who* and revoking one person
                // does not mean rotating a shared secret.
                //
                // `totp_last_counter` is what makes a code single-use: see
                // Totp::verify(). Without it a code stays good for its whole
                // acceptance window, which is up to ninety seconds.
                "CREATE TABLE IF NOT EXISTS admin_users (
                    id $id,
                    email VARCHAR(190) NOT NULL,
                    name VARCHAR(120) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    totp_secret VARCHAR(64) NULL,
                    totp_confirmed_at INTEGER NULL,
                    totp_last_counter INTEGER NULL,
                    created_at INTEGER NOT NULL,
                    last_login_at INTEGER NULL,
                    disabled_at INTEGER NULL
                )$opts",
                'CREATE UNIQUE INDEX idx_admin_users_email ON admin_users (email)',

                // Single-use, hashed, and the only way back in when the phone
                // holding the TOTP secret is lost.
                "CREATE TABLE IF NOT EXISTS admin_recovery_codes (
                    id $id,
                    user_id INTEGER NOT NULL,
                    code_hash VARCHAR(64) NOT NULL,
                    created_at INTEGER NOT NULL,
                    used_at INTEGER NULL
                )$opts",
                'CREATE INDEX idx_admin_recovery_user ON admin_recovery_codes (user_id)',
                'CREATE UNIQUE INDEX idx_admin_recovery_hash ON admin_recovery_codes (code_hash)',
            ],

            '0006_admin_sessions_users' => [
                // A session now belongs to somebody, and is only good for
                // reading once the second factor has been answered.
                'ALTER TABLE admin_sessions ADD COLUMN user_id INTEGER NULL',
                'ALTER TABLE admin_sessions ADD COLUMN mfa_pending SMALLINT NOT NULL DEFAULT 1',
                // Sessions minted under the old shared-password scheme have
                // no owner and must not survive the change.
                'DELETE FROM admin_sessions',
            ],
        ];
    }

    private static function isMysql(): bool
    {
        return Db::driver() === 'mysql';
    }

    /**
     * Applies whatever has not run yet.
     *
     * @return list<string> the versions applied by this call
     */
    public static function migrate(): array
    {
        $opts = self::isMysql() ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
        Db::pdo()->exec(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(64) NOT NULL PRIMARY KEY,
                ran_at INTEGER NOT NULL
            )$opts",
        );

        $done = [];
        foreach (Db::all('SELECT version FROM schema_migrations') as $row) {
            $done[(string) $row['version']] = true;
        }

        $applied = [];
        foreach (self::migrations() as $version => $statements) {
            if (isset($done[$version])) {
                continue;
            }
            foreach ($statements as $sql) {
                Db::pdo()->exec($sql);
            }
            Db::run(
                'INSERT INTO schema_migrations (version, ran_at) VALUES (?, ?)',
                [$version, time()],
            );
            $applied[] = $version;
        }

        return $applied;
    }

    /**
     * Drops data past the retention window and expired admin sessions.
     * Called from bin/prune.php (cron) — never from a request.
     *
     * @return array<string, int> rows removed, per table
     */
    public static function prune(int $retentionDays): array
    {
        $cutoff = time() - $retentionDays * 86400;

        $events = Db::run('DELETE FROM events WHERE created_at < ?', [$cutoff])->rowCount();
        $sessions = Db::run('DELETE FROM sessions WHERE last_seen < ?', [$cutoff])->rowCount();
        // A visitor with no sessions left is just an identifier with nothing
        // attached to it.
        $visitors = Db::run(
            'DELETE FROM visitors WHERE last_seen < ?
             AND id NOT IN (SELECT visitor_id FROM sessions)',
            [$cutoff],
        )->rowCount();
        $admin = Db::run('DELETE FROM admin_sessions WHERE expires_at < ?', [time()])->rowCount();

        return [
            'events' => $events,
            'sessions' => $sessions,
            'visitors' => $visitors,
            'admin_sessions' => $admin,
        ];
    }
}
