# CLAUDE.md

Guidance for Claude Code (and any agent) working in this repository.

## What this is

The personal portfolio of **Emanuele Frascella**, backend engineer (Taranto, Italy). A monorepo split into independent services:

| Path              | Stack              | Role                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------- |
| `services/site`| Astro (static) + vanilla TS | **The live portfolio.** Astro renders the whole page at build time; every moving part (WebGL fluid background, splash, GSAP scroll layer, three.js work corridor) is a plain ES module loaded from an Astro `<script>`. No framework runtime on the page. |
| `services/lab`    | React + Vite (SPA) | Standalone three.js experimentation lab (formerly `/lab` inside the site). Dev-only playground, never shipped with the portfolio. |
| `services/api`    | PHP 8 (no framework) | Server-side effects: the contact-form email, and first-party analytics (ingest + the dashboard's queries). One front controller + a handful of `Api\` classes; PHPMailer and PDO are the only dependencies. |
| `services/builder` | bash             | `build.sh` packages site + API into one tarball deployable on CloudPanel by extracting it once (see its `DEPLOY.md`). |
| `infra`           | Docker            | The deployed shape on your machine: one image with the CloudPanel layout (docroot + private `app/`, nginx proxying to a PHP server) and a MySQL beside it. Not a dev environment — it is where deployment assumptions get tested. |

The site is static and ships **no framework runtime**. This repo was migrated off a Laravel + Inertia monolith — that stack has been fully removed; don't reintroduce Laravel or Inertia.

There is a database, and it is **only** for analytics. Everything the portfolio itself renders comes from `src/data/site.ts` at build time, and the contact form still writes nothing — it sends an email and forgets. Nothing else should acquire persistence without an explicit request.

## Architecture & the client/server seam

- The site talks to the API **only** through `services/site/src/lib/api.ts` (axios, base URL `PUBLIC_API_URL`, with `VITE_API_URL` still honored as a fallback). The one exception is the analytics beacon, which needs `fetch(keepalive)`/`sendBeacon` and so uses the exported `apiBase` directly.
- The contact form `POST`s `/api/contact`. The API validates, applies a honeypot + throttle + per-email cooldown (flat-file state under `var/state` — PHP-FPM has no memory between requests), and emails the owner via PHPMailer.
- **Error contract (keep both sides in sync):** validation failures return `422` with `{ message, errors: { field: [msg] } }` — Laravel's shape, preserved so the frontend's `fieldErrors()` helper works unchanged.
- All API routes live under the `/api` global prefix. CORS origins come from `CORS_ORIGINS`; **cookies are only granted to an origin named explicitly there**, never under `*`.

### Analytics

- `POST /api/track` takes a batch of events as JSON labelled `text/plain` — a CORS-safelisted content type, so the request never preflights, which `sendBeacon` could not answer. It always answers `204`, whether or not it wrote anything.
- **Consent gates the write, not the response.** `Analytics::ingest()` drops the batch unless the `pf_consent` cookie says `granted`. On the client the same rule is enforced twice over: `lib/track.ts` buffers into nothing, and `lib/analytics.ts` is a dynamic import that a declining visitor never downloads.
- **No IP address is ever stored.** It is used for rate limiting (flat files that expire in minutes) and nothing else. Identity is `pf_vid`/`pf_sid`, cookies the visitor agreed to.
- Only names in `Analytics::VOCABULARY` exist; anything else is discarded. Adding an event means adding it there *and* in the tracker.
- `src/Db.php` picks SQLite or MySQL from `DB_DRIVER`. All grouping is by the `day`/`hour` columns written at ingest, so no query calls a date function and the same SQL runs on both. Migrations are in `src/Schema.php`, applied by `php bin/migrate.php` — never edit a shipped migration, add the next number.
- `/admin` is accounts (`admin_users`) plus **mandatory TOTP two-factor**, created by `bin/admin-user.php create`. Sign-in is two steps and one cookie: the password mints a session with `mfa_pending = 1` and five minutes to live, and only `POST /api/admin/mfa` makes it usable. `Totp` is RFC 6238 in eighty lines of plain PHP; `totp_last_counter` makes each code single-use. Recovery codes are hashed and single-use. The page is a static file with nothing in it; the API returns 401 without the cookie.

### Privacy, in one line

`/privacy` describes exactly what the code does. **If you change what is collected, change that page in the same commit** — it is the whole basis for asking.

## How `site` is put together

- **Markup is static.** `src/pages/index.astro` composes the portfolio's components; the served HTML already contains every word on the page. Copy and project data live in `src/data/site.ts` — the single source both the markup and the client scripts read, so the DOM and the canvas can't drift.
- **Motion is layered on top, and gated.** An inline head script in `Base.astro` sets `js` and `motion` on `<html>` before first paint. Anything the CSS hides on the assumption that a timeline will reveal it — the splash, the collapsed accordion, the whole 620vh work stage — is behind `html.motion`. With JS off or reduced motion on, the page is a complete, readable document, and the work section falls back to a real list of the projects.
- **Three pages, two kinds.** `index.astro` is the portfolio. `privacy.astro` and `admin.astro` pass `bare` to `Base`, which skips `motion` and `splash-open` — the first because `html.motion` hides the system cursor on the assumption something is drawing a replacement, the second because `splash-open` locks scrolling until a splash that isn't there lifts it. `admin` also passes `noindex`.
- **`src/lib/` is the motion layer**: `splash` (intro), `fluid` (GPU fluid background), `corridor` (three.js work scene), `scroll` (all GSAP/ScrollTrigger wiring), `contact` (the form), `main` (entry, lazy-loads the rest). three.js and GSAP are dynamic imports — nothing heavy is in the eager path.
- **…and the measured layer**: `track` (the buffer every module calls into), `consent` (the gate and the banner), `analytics` (loaded only on consent), `privacy` (the withdraw controls), `admin` (the dashboard).

## Running locally

```bash
# API  (http://localhost:3000/api) — logs mail instead of sending when MAIL_HOST is unset
cd services/api && composer install && composer migrate && composer dev
# needs a PDO driver: php-sqlite3 (default) or php-mysql
# dashboard account:   composer admin-user create you@example.com

# Public site (http://localhost:5173)
cd services/site && npm install && npm run dev

# three.js lab (http://localhost:5174) — optional, standalone
cd services/lab && npm install && npm run dev
```

Copy each service's `.env.example` to `.env` and fill it in.

## Build / verify

- `services/site`: `npm run build` (Astro; underlying Vite/esbuild does **not** type-gate — types are intentionally loose, `noImplicitAny: false`). `npm run typecheck` (`astro check`) is opt-in.
- `services/lab`: `npm run build` (Vite). Standalone, no API contract.
- `services/api`: `php -l` on touched files (no build step). Smoke-test endpoints with `curl` after changing them. A schema change also means `php bin/migrate.php` against **both** drivers before it ships.
- **Deploy package:** `services/builder/build.sh` → `dist/portfolio-<ts>.tar.gz` (site built with `PUBLIC_API_URL=""`, same-origin `/api`).
- **The deployed shape:** `docker compose -f infra/docker-compose.yml up --build` → <http://localhost:8080>. Use it before shipping anything that touches the layout, the nginx routing, the proxy hop, or MySQL — those are the four things a local `npm run dev` cannot be wrong about, and therefore cannot check.

## Working conventions

- **Agents:** specialised subagents live in `.claude/agents/` — `architect` (design/plan, read-only), `frontend` (the SPA; can screenshot and evaluate its own work via Playwright), `backend` (the PHP API). Prefer them for scoped work.
- **`/ship`** — stage + commit all changes with a concise message; `--push` also pushes.
- **`briefs/`** — one markdown brief per feature we plan in chat (`briefs/_template.md`).
- **`docs/`** — living documentation (`docs/_template.md`).
- **Git flow** is in use (AVH edition): features branch off `develop` (`git flow feature start <name>`), `main` is the release branch.
- Match the surrounding code's style. Never commit secrets; update the relevant `.env.example` when adding an env var.

See `AGENTS.md` for the agent roster and division of labour.
