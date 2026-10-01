# Deploying to CloudPanel

The tarball is the whole portfolio — static site plus PHP API — laid out to be
extracted once into the site's directory:

```
htdocs/      ← document root (static site + api/index.php)
app/         ← private: PHP sources, bin/, composer.*, .env, var/ (state + database)
DEPLOY.md    ← this file
```

`vendor/` is **not** in the archive. It is fully reproducible from
`composer.lock`, it is the heaviest thing in the tarball by a wide margin, and
installing it on the server means it is built against the server's PHP rather
than whatever machine cut the release. Step 4 below is not optional.

`app/` sits **next to** the document root on purpose: nothing in it is ever
served, and `htdocs/api/index.php` finds it by walking up two directories.

## Steps

1. **Create the site** in CloudPanel: *Add Site → Create a PHP Site*
   (any PHP ≥ 8.1 version), domain e.g. `frascella.dev`.

   The API needs `pdo_sqlite` (the default) or `pdo_mysql`. CloudPanel's PHP
   builds ship both; `php -m | grep pdo` confirms it.

2. **Upload and extract** the tarball into the domain directory CloudPanel
   created (which is also its default document root):

   ```bash
   cd /home/<site-user>/htdocs/<domain>
   rm -rf ./*                                # CloudPanel's placeholder index
   tar -xzf /path/to/portfolio-<timestamp>.tar.gz
   ```

   This yields `<domain>/htdocs` (the real docroot) and `<domain>/app`
   (private) side by side.

3. **Move the document root one level down** — *Sites → your site →
   Settings → Root Directory*: append `/htdocs` to the existing value:

   ```
   /home/<site-user>/htdocs/<domain>/htdocs
   ```

   The vhost's `root {{root}};` is a template placeholder that this field
   fills in — leave it as it is. One-time change: every later deploy is
   just re-extracting the tarball into the same directory.

4. **Install the dependencies and configure the app.**

   ```bash
   cd /home/<site-user>/htdocs/<domain>/app
   composer install --no-dev --optimize-autoloader

   cp .env.example .env
   nano .env      # APP_ENV=production, MAIL_*, DB_*, CORS_ORIGINS
   ```

   Until `composer install` has run, every API route answers 503 with
   "Dependencies are not installed on this server." — deliberately, so the
   cause is in the response rather than only in the error log. CloudPanel
   ships composer; if it is missing, `curl -sS https://getcomposer.org/installer | php`
   in the same directory and use `php composer.phar` instead.

   With `APP_ENV=production` and no mail configured, the API answers 503
   rather than silently dropping messages. `CORS_ORIGINS` can stay
   restrictive — the site calls the API same-origin, so CORS is only needed
   if something else must call it.

   Leave `DB_DRIVER=sqlite` unless there is already a MySQL database worth
   using; for one site's traffic the file is faster and there is nothing to
   administer. For MySQL, create the database in CloudPanel first and fill in
   `DB_HOST` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD`.

5. **Create the schema, and your account:**

   ```bash
   php bin/migrate.php                             # idempotent — safe on every deploy
   php bin/admin-user.php create you@example.com   # prompts for name and password
   ```

   The second command prints a TOTP secret, a QR code if `qrencode` is
   installed, and eight single-use recovery codes. **That is the only time
   any of it is shown** — the database keeps the secret and the codes'
   hashes, nothing you can read back. Scan the QR now and put the recovery
   codes somewhere that is not this server.

   Two-factor is required and there is no flag to skip it. The first code you
   enter at sign-in confirms the enrolment. If you lose the authenticator, a
   recovery code gets you in; if you lose both, `php bin/admin-user.php
   reset-mfa <email>` from a shell is the way back.

   With no account, `/admin` loads but cannot be signed into — the login
   route answers 503.

6. **Route `/api` to PHP** — in CloudPanel: *Sites → your site → Vhost*.
   The template has several `server { … }` blocks; add this to the one
   that **listens on 8080** and already contains `location ~ \.php$`
   (that's the server that actually executes PHP — the 443 one only
   proxies to it):

   ```nginx
   location /api/ {
       try_files $uri /api/index.php?$query_string;
   }
   ```

   Do **not** put it in the 443/proxy server block: there it would shadow
   the proxy pass and, having no PHP handler, serve `index.php` as a
   plain file — source disclosure. Save; CloudPanel reloads nginx.

   While you are in there, check that the static side resolves directory
   pages — `/privacy` and `/admin` are built as `privacy/index.html` and
   `admin/index.html`, so the location that serves the site needs
   `try_files $uri $uri/ =404;` (CloudPanel's template already has it).

7. **Schedule the retention job** — *Sites → your site → Cron Jobs*, or
   `crontab -e` as the site user:

   ```
   0 4 * * * cd /home/<site-user>/htdocs/<domain>/app && php bin/prune.php >> var/prune.log 2>&1
   ```

   It deletes analytics rows past `ANALYTICS_RETENTION_DAYS` (400 by
   default) and expired admin sessions. Skipping it is not fatal — it means
   keeping data longer than the privacy page promises.

8. **Check**:

   ```bash
   curl https://<domain>/api/health          # → {"status":"ok"}
   ```

   Then, in a browser: send a message from the contact form, accept the
   cookie banner, scroll the page, and open `https://<domain>/admin`. The
   visit should be in the dashboard within a few seconds of the beacon.

## Notes

- `app/var/state` holds the rate-limit and cooldown counters (flat JSON
  files, pruned automatically) and, under SQLite, `analytics.sqlite` sits in
  `app/var`. Both must stay writable by the PHP-FPM user — extracting as the
  site user makes that true by default.
- **Back up `app/var/analytics.sqlite`.** It is the only copy of the
  analytics data, and re-extracting the tarball does not touch it (the
  archive ships `var/` empty).
- To rebuild: `services/builder/build.sh` in the repo produces a fresh
  tarball; extraction over an existing deployment only touches `htdocs` and
  `app` (your `app/.env` and `app/vendor` are not in the archive and survive...
  unless you delete the directory first — keep a copy of `.env`).
- **Every deploy runs two commands**, both idempotent and both cheap:

  ```bash
  cd /home/<site-user>/htdocs/<domain>/app
  composer install --no-dev --optimize-autoloader
  php bin/migrate.php
  ```

  The first because `vendor/` is not shipped; the second because a new
  release must not query tables that do not exist yet.
