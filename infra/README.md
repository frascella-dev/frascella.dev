# infra — the deployed shape, on your machine

This is not a development environment. `npm run dev` and `composer dev` are
faster and have hot reload; use those to build things.

This is here to answer a different question: **does the thing we ship actually
work?** The image is the CloudPanel layout — document root and private `app/`
directory side by side, nginx proxying to a PHP server, the API behind
`/api/` — and the compose file puts a real MySQL behind it. Everything the
tarball can get wrong, this gets wrong first.

```bash
docker compose -f infra/docker-compose.yml up --build
```

Then <http://localhost:8080>. The dashboard is at `/admin`, signed in as
`owner@frascella.dev` / `dashboard-please` — the entrypoint creates that
account on first boot if the users table is empty.

Two-factor is required here as it is everywhere, so you also need the TOTP
secret. It is printed once, into the log:

```bash
docker compose -f infra/docker-compose.yml logs app | grep -A1 secret
```

Scan it, or compute a code without an authenticator:

```bash
docker compose -f infra/docker-compose.yml exec app \
    php -r 'require "/srv/site/app/src/Totp.php"; echo Api\Totp::code("<secret>"), PHP_EOL;'
```

## What it reproduces, and why

| Deployment detail | Reproduced here | Why it matters |
| --- | --- | --- |
| `htdocs/` served, `app/` private and one level up | yes | `index.php` finds `vendor/`, `.env` and `var/` by walking up two directories. A layout mistake is invisible until deploy. |
| Two nginx servers, public → `:8080` → php-fpm | yes | Behind that hop the socket peer is loopback, so `Http::clientIp()` has to read `X-Real-IP`. Get it wrong and every visitor shares one rate-limit bucket. |
| `location /api/` in the **PHP** server | yes | In the proxy server it would shadow the proxy pass and serve `index.php` as a static file — source disclosure. |
| `try_files $uri $uri/` | yes | `/privacy` and `/admin` are directory pages; without it they 404. |
| MySQL rather than SQLite | yes | The schema and every query have to run on both. SQLite is the default and gets exercised constantly; MySQL would otherwise only ever be tested in production. |
| TLS, CloudPanel's control panel, the real domain | no | Nothing in the app depends on them. |

## Poking at it

```bash
# the API
curl -i localhost:8080/api/health

# an event batch, with and without consent — both answer 204, only one writes
curl -i -X POST localhost:8080/api/track \
     -H 'Content-Type: text/plain' -b 'pf_consent=granted' \
     -d '{"ctx":{"path":"/"},"events":[{"n":"pageview","t":0}]}'

# what landed
docker compose -f infra/docker-compose.yml exec db \
    mysql -uportfolio -pportfolio portfolio -e 'select name, count(*) from events group by name'

# the CLI jobs, in the layout they run in on the server
docker compose -f infra/docker-compose.yml exec app php /srv/site/app/bin/migrate.php
docker compose -f infra/docker-compose.yml exec app php /srv/site/app/bin/prune.php
```

To try the SQLite path instead, set `DB_DRIVER: sqlite` in the compose file —
the database lands at `/srv/site/app/var/analytics.sqlite`, exactly where it
lands on the server.

## Notes

- `docker compose down -v` throws the database away. Without `-v` it survives.
- The image is built from the **repository root**, not from `infra/`, because
  it compiles both services. `.dockerignore` at the root keeps the context
  small and stops a stale local `node_modules` or `vendor` from leaking in.
- The contact form logs instead of sending: `MAIL_HOST` is empty, and
  `APP_ENV=development` makes that a logged no-op rather than a 503. Watch
  `docker compose logs -f app` to see the message that would have gone out.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` in the compose file are a convenience for a
  throwaway environment, and the only reason a TOTP secret is ever printed to
  a log. On the server there are no such variables: you run
  `bin/admin-user.php create` yourself and nobody but you sees the secret.
