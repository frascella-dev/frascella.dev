#!/bin/sh
#
# Brings the container up in the order the app needs: wait for the database,
# apply migrations, make sure there is a dashboard password, then serve.
#
# php-fpm goes to the background and nginx holds PID 1, so a crash in nginx
# stops the container rather than leaving it half-alive.

set -e

say() { printf '\033[1m— %s\033[0m\n' "$1"; }

APP=/srv/site/app

say "php: $(php -r 'echo PHP_VERSION;') · pdo drivers: $(php -r 'echo implode(", ", PDO::getAvailableDrivers());')"

# --- wait for the database --------------------------------------------------
if [ "${DB_DRIVER:-sqlite}" = "mysql" ]; then
    say "waiting for mysql at ${DB_HOST:-db}:${DB_PORT:-3306}"
    i=0
    # Compose's healthcheck already gates startup; this covers the gap between
    # "mysqld answers" and "this user can actually open this schema".
    until php -r '
        $dsn = sprintf("mysql:host=%s;port=%s;dbname=%s", getenv("DB_HOST"), getenv("DB_PORT") ?: 3306, getenv("DB_DATABASE"));
        try { new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD")); exit(0); }
        catch (Throwable $e) { exit(1); }
    '; do
        i=$((i + 1))
        [ "$i" -gt 60 ] && { echo "database never came up" >&2; exit 1; }
        sleep 1
    done
    say "mysql is up"
fi

# --- schema -----------------------------------------------------------------
say "migrate"
php "$APP/bin/migrate.php"

# --- dashboard account ------------------------------------------------------
# Convenience for a throwaway environment only: feeds the interactive `create`
# command from the compose file's variables. On the real server you run it by
# hand, once, and read the TOTP secret off your own terminal instead of out of
# a container log.
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    existing=$(php -r '
        require "/srv/site/app/vendor/autoload.php";
        Api\Db::init("/srv/site/app");
        try { echo Api\AdminUser::count(); } catch (Throwable $e) { echo 0; }
    ' 2>/dev/null || echo 0)

    if [ "$existing" = "0" ]; then
        say "creating $ADMIN_EMAIL — the TOTP secret below is the only copy"
        printf '%s\n%s\n%s\n' "${ADMIN_NAME:-Owner}" "$ADMIN_PASSWORD" "$ADMIN_PASSWORD" \
            | php "$APP/bin/admin-user.php" create "$ADMIN_EMAIL"
    else
        say "$existing account(s) already exist — leaving them alone"
    fi
fi

chown -R www-data:www-data "$APP/var"

say "serving on :80  →  proxy  →  :8080  →  php-fpm"
php-fpm --daemonize
exec nginx -g 'daemon off;'
