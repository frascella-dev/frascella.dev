<?php

declare(strict_types=1);

namespace Api;

use PDO;
use PDOException;

/**
 * The one connection, opened lazily.
 *
 * The API was stateless by design and stayed that way for everything the
 * contact form needs — this exists only for the analytics side, and nothing
 * else in the service is allowed to depend on it. If the database is down,
 * `POST /api/contact` must still send mail.
 *
 * Two drivers, chosen by `DB_DRIVER`:
 *
 *   sqlite  a single file under `var/` — the default, and the right answer
 *           for one site's traffic. No server to run, no credentials, and
 *           the whole dataset backs up by copying one file.
 *   mysql   for a host that already has one. Same schema, same queries.
 *
 * Everything downstream speaks portable SQL; the two places where the
 * dialects genuinely differ (auto-increment keys, table options) are in
 * Schema, and date bucketing is avoided entirely by storing the day
 * alongside the timestamp — see Analytics.
 */
final class Db
{
    private static ?PDO $pdo = null;
    private static string $appRoot = '';

    /** Called once by the front controller, before anything touches the DB. */
    public static function init(string $appRoot): void
    {
        self::$appRoot = $appRoot;
    }

    public static function driver(): string
    {
        $driver = strtolower(Env::get('DB_DRIVER', 'sqlite') ?? 'sqlite');
        return in_array($driver, ['sqlite', 'mysql'], true) ? $driver : 'sqlite';
    }

    /**
     * Absolute path of the SQLite file. Relative `DB_DATABASE` values are
     * resolved against the app root, so the same .env works in the repo and
     * in the deployed layout where app/ sits outside the document root.
     */
    public static function sqlitePath(): string
    {
        $path = Env::get('DB_DATABASE', 'var/analytics.sqlite') ?? 'var/analytics.sqlite';
        if (!str_starts_with($path, '/')) {
            $path = self::$appRoot . '/' . $path;
        }
        return $path;
    }

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Real prepared statements: placeholders stay typed, and the
            // driver — not a string mangler in PHP — does the quoting.
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        if (self::driver() === 'mysql') {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                Env::get('DB_HOST', '127.0.0.1'),
                Env::get('DB_PORT', '3306'),
                Env::get('DB_DATABASE', 'portfolio'),
            );
            self::$pdo = new PDO(
                $dsn,
                Env::get('DB_USERNAME', 'root'),
                Env::get('DB_PASSWORD', '') ?? '',
                $options,
            );
            return self::$pdo;
        }

        $path = self::sqlitePath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        self::$pdo = new PDO('sqlite:' . $path, null, null, $options);
        // WAL lets the dashboard read while a beacon is writing, which on a
        // default-journal SQLite would block. The busy timeout covers the
        // brief exclusive locks a checkpoint still takes.
        self::$pdo->exec('PRAGMA journal_mode = WAL');
        self::$pdo->exec('PRAGMA busy_timeout = 5000');
        self::$pdo->exec('PRAGMA foreign_keys = ON');
        // Durability traded for throughput: a crash can lose the last few
        // events. They are pageviews, and the alternative is an fsync per
        // beacon.
        self::$pdo->exec('PRAGMA synchronous = NORMAL');

        return self::$pdo;
    }

    /**
     * True when the connection opens and the schema has been migrated.
     * Used to answer honestly on /api/health and to fail the ingest fast
     * instead of throwing a PDOException into a beacon.
     */
    public static function isReady(): bool
    {
        try {
            self::pdo()->query('SELECT 1 FROM events LIMIT 1');
            return true;
        } catch (PDOException) {
            return false;
        }
    }

    /** @param array<string|int, mixed> $params */
    public static function run(string $sql, array $params = []): \PDOStatement
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * @param array<string|int, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    /**
     * @param array<string|int, mixed> $params
     * @return array<string, mixed>|null
     */
    public static function first(string $sql, array $params = []): ?array
    {
        $row = self::run($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    /** @param array<string|int, mixed> $params */
    public static function value(string $sql, array $params = []): mixed
    {
        $value = self::run($sql, $params)->fetchColumn();
        return $value === false ? null : $value;
    }
}
