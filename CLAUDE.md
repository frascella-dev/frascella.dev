# CLAUDE.md

Guidance for Claude Code (and any agent) working in this repository.

## What this is

The personal portfolio of **Emanuele Frascella**, backend engineer (Taranto, Italy). A monorepo split into independent services:

| Path              | Stack              | Role                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------- |
| `services/site`| Astro (static) + vanilla TS | **The live portfolio.** Astro renders the whole page at build time; every moving part (WebGL fluid background, splash, GSAP scroll layer, three.js work corridor) is a plain ES module loaded from an Astro `<script>`. No framework runtime on the page. |
| `services/lab`    | React + Vite (SPA) | Standalone three.js experimentation lab (formerly `/lab` inside the site). Dev-only playground, never shipped with the portfolio. |
| `services/api`    | PHP 8 (no framework) | Small stateless API. Its only job is server-side effects — today, sending the contact-form email. One front controller + a few `Api\` classes; PHPMailer is the only dependency. |
| `services/builder` | bash             | `build.sh` packages site + API into one tarball deployable on CloudPanel by extracting it once (see its `DEPLOY.md`). |

There is **no database and no admin panel**. The site is static; the API is a thin server for things the browser can't do safely (SMTP, secrets, rate-limiting). This repo was migrated off a Laravel + Inertia monolith — that stack has been fully removed. Don't reintroduce Laravel, Inertia, an admin area, or a database without an explicit request.

## Architecture & the client/server seam

- The site talks to the API **only** through `services/site/src/lib/api.ts` (axios, base URL `PUBLIC_API_URL`, with `VITE_API_URL` still honored as a fallback).
- The contact form `POST`s `/api/contact`. The API validates, applies a honeypot + throttle + per-email cooldown (flat-file state under `var/state` — PHP-FPM has no memory between requests), and emails the owner via PHPMailer.
- **Error contract (keep both sides in sync):** validation failures return `422` with `{ message, errors: { field: [msg] } }` — Laravel's shape, preserved so the frontend's `fieldErrors()` helper works unchanged.
- All API routes live under the `/api` global prefix. CORS origins come from `CORS_ORIGINS`.

## How `site` is put together

- **Markup is static.** `src/pages/index.astro` composes six components; the served HTML already contains every word on the page. Copy and project data live in `src/data/site.ts` — the single source both the markup and the client scripts read, so the DOM and the canvas can't drift.
- **Motion is layered on top, and gated.** An inline head script in `Base.astro` sets `js` and `motion` on `<html>` before first paint. Anything the CSS hides on the assumption that a timeline will reveal it — the splash, the collapsed accordion, the whole 620vh work stage — is behind `html.motion`. With JS off or reduced motion on, the page is a complete, readable document, and the work section falls back to a real list of the projects.
- **`src/lib/` is the motion layer**: `splash` (intro), `fluid` (GPU fluid background), `corridor` (three.js work scene), `scroll` (all GSAP/ScrollTrigger wiring), `contact` (the form), `main` (entry, lazy-loads the rest). three.js and GSAP are dynamic imports — nothing heavy is in the eager path.

## Running locally

```bash
# API  (http://localhost:3000/api) — logs mail instead of sending when MAIL_HOST is unset
cd services/api && composer install && composer dev

# Public site (http://localhost:5173)
cd services/site && npm install && npm run dev

# three.js lab (http://localhost:5174) — optional, standalone
cd services/lab && npm install && npm run dev
```

Copy each service's `.env.example` to `.env` and fill it in.

## Build / verify

- `services/site`: `npm run build` (Astro; underlying Vite/esbuild does **not** type-gate — types are intentionally loose, `noImplicitAny: false`). `npm run typecheck` (`astro check`) is opt-in.
- `services/lab`: `npm run build` (Vite). Standalone, no API contract.
- `services/api`: `php -l` on touched files (no build step). Smoke-test endpoints with `curl` after changing them.
- **Deploy package:** `services/builder/build.sh` → `dist/portfolio-<ts>.tar.gz` (site built with `PUBLIC_API_URL=""`, same-origin `/api`).

## Working conventions

- **Agents:** specialised subagents live in `.claude/agents/` — `architect` (design/plan, read-only), `frontend` (the SPA; can screenshot and evaluate its own work via Playwright), `backend` (the PHP API). Prefer them for scoped work.
- **`/ship`** — stage + commit all changes with a concise message; `--push` also pushes.
- **`briefs/`** — one markdown brief per feature we plan in chat (`briefs/_template.md`).
- **`docs/`** — living documentation (`docs/_template.md`).
- **Git flow** is in use (AVH edition): features branch off `develop` (`git flow feature start <name>`), `main` is the release branch.
- Match the surrounding code's style. Never commit secrets; update the relevant `.env.example` when adding an env var.

See `AGENTS.md` for the agent roster and division of labour.
