# Deploying to CloudPanel

The tarball is the whole portfolio — static site plus PHP contact API — laid
out to be extracted once into the site's directory:

```
htdocs/      ← document root (static site + api/index.php)
app/         ← private: PHP sources, vendor/, .env, var/ (rate-limit state)
DEPLOY.md    ← this file
```

`app/` sits **next to** the document root on purpose: nothing in it is ever
served, and `htdocs/api/index.php` finds it by walking up two directories.

## Steps

1. **Create the site** in CloudPanel: *Add Site → Create a PHP Site*
   (any PHP ≥ 8.1 version), domain e.g. `frascella.dev`.

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

4. **Configure mail**: copy the example env and fill in SMTP:

   ```bash
   cp app/.env.example app/.env
   nano app/.env      # APP_ENV=production, MAIL_*, CORS_ORIGINS
   ```

   With `APP_ENV=production` and no mail configured, the API answers 503
   rather than silently dropping messages. `CORS_ORIGINS` can stay
   restrictive — the site calls the API same-origin, so CORS is only needed
   if something else must call it.

5. **Route `/api` to PHP** — in CloudPanel: *Sites → your site → Vhost*.
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

6. **Check**:

   ```bash
   curl https://<domain>/api/health          # → {"status":"ok"}
   ```

   Then send a message from the site's contact form.

## Notes

- `app/var/state` holds the rate-limit and cooldown counters (flat JSON
  files, pruned automatically). It must stay writable by the PHP-FPM user —
  extracting as the site user makes that true by default.
- No database, no cron, no queue: the API's only job is validating the
  contact form and sending one email.
- To rebuild: `services/builder/build.sh` in the repo produces a fresh
  tarball; extraction over an existing deployment only touches `htdocs` and
  `app` (your `app/.env` is not in the archive and survives... unless you
  delete the directory first — keep a copy of `.env`).
