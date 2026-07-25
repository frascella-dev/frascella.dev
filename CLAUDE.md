# CLAUDE.md

Guidance for Claude Code (and any agent) working in this repository.

## What this is

The personal portfolio of **Emanuele Frascella**, backend engineer (Taranto, Italy). A monorepo split into independent services:

| Path              | Stack              | Role                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------- |
| `services/site`   | Astro + React islands | The public portfolio site. Astro owns the shell/routes/build; the React app mounts as a `client:only` island — still a client-rendered SPA, no SSR. |
| `services/lab`    | React + Vite (SPA) | Standalone three.js experimentation lab (formerly `/lab` inside the site). Dev-only playground, never shipped with the portfolio. |
| `services/api`    | NestJS (Node)      | Small stateless API. Its only job is server-side effects — today, sending the contact-form email. |

There is **no database and no admin panel**. The site is static-ish; the API is a thin server for things the browser can't do safely (SMTP, secrets, rate-limiting). This repo was migrated off a Laravel + Inertia monolith — that stack has been fully removed. Don't reintroduce Laravel, Inertia, an admin area, or a database without an explicit request.

## Architecture & the client/server seam

- The SPA talks to the API **only** through `services/site/src/lib/api.ts` (axios, base URL `PUBLIC_API_URL`, with `VITE_API_URL` still honored as a fallback).
- The contact form `POST`s `/api/contact`. The API validates, applies a honeypot + throttle + per-email cooldown, and emails the owner via nodemailer.
- **Error contract (keep both sides in sync):** validation failures return `422` with `{ message, errors: { field: [msg] } }` — Laravel's shape, preserved so the frontend's `fieldErrors()` helper works unchanged.
- All API routes live under the `/api` global prefix. CORS origins come from `CORS_ORIGINS`.

## Running locally

```bash
# API  (http://localhost:3000/api) — logs mail instead of sending when MAIL_HOST is unset
cd services/api && npm install && npm run dev

# Public site (http://localhost:5173)
cd services/site && npm install && npm run dev

# three.js lab (http://localhost:5174) — optional, standalone
cd services/lab && npm install && npm run dev
```

Copy each service's `.env.example` to `.env` and fill it in. The devcontainers (`.devcontainer/`) run the two as separate `client` and `server` containers.

## Build / verify

- `services/site`: `npm run build` (Astro; underlying Vite/esbuild does **not** type-gate — types are intentionally loose, `noImplicitAny: false`). `npm run typecheck` (`astro check`) is opt-in.
- `services/lab`: `npm run build` (Vite). Standalone, no API contract.
- `services/api`: `npm run build` (`nest build`, real `tsc`). Smoke-test endpoints with `curl` after changing them.

## Working conventions

- **Agents:** specialised subagents live in `.claude/agents/` — `architect` (design/plan, read-only), `frontend` (the SPA; can screenshot and evaluate its own work via Playwright), `backend` (the NestJS API). Prefer them for scoped work.
- **`/ship`** — stage + commit all changes with a concise message; `--push` also pushes.
- **`briefs/`** — one markdown brief per feature we plan in chat (`briefs/_template.md`).
- **`docs/`** — living documentation (`docs/_template.md`).
- **Git flow** is in use (AVH edition): features branch off `develop` (`git flow feature start <name>`), `main` is the release branch.
- Match the surrounding code's style. Never commit secrets; update the relevant `.env.example` when adding an env var.

See `AGENTS.md` for the agent roster and division of labour.
