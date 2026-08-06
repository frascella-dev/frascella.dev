# frascella.dev — portfolio monorepo

Personal portfolio of **Emanuele Frascella**, backend engineer (Taranto, Italy).

Independent services:

| Path              | Stack              | Role                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------- |
| `services/site`| Astro (static) + vanilla TS | The public portfolio site. Static HTML; WebGL, three.js and GSAP layered on as plain ES modules. |
| `services/lab`    | React + Vite (SPA) | Standalone three.js experimentation lab (dev playground).           |
| `services/api`    | PHP 8 (no framework) | Contact email, plus first-party analytics (SQLite or MySQL).        |
| `services/builder` | bash              | Packages site + API into one CloudPanel-ready tarball.              |

No framework runtime on the page. The portfolio posts the contact form to
`/api/contact` and — only once the visitor has accepted the cookie banner —
beacons events to `/api/track`; `/admin` reads them back behind a password.
Same-origin in the deployed layout, CORS in dev.

Nothing is shared with a third party: there is no analytics vendor, no
advertising network, and no IP address is ever stored. `/privacy` says so in
detail, and is meant to stay true — change what is collected, change that page.

## Quick start

Run each service in its own terminal:

```bash
# API — http://localhost:3000/api  (needs php-sqlite3, or php-mysql)
cd services/api    && cp .env.example .env && composer install && composer migrate && composer dev

# Public site — http://localhost:5173
cd services/site && cp .env.example .env && npm install && npm run dev

# three.js lab — http://localhost:5174 (optional, standalone)
cd services/lab    && npm install && npm run dev
```

The API logs contact messages to the console instead of sending them until
`MAIL_HOST` is configured, so the form works end-to-end with no mail server.
For the dashboard at `/admin`, run `composer admin-user create you@example.com`.
It prints a TOTP secret and eight recovery codes, once — two-factor is required
and cannot be skipped.

## Build

```bash
cd services/site && npm run build       # static site → dist/
services/builder/build.sh               # full deploy tarball for CloudPanel

# the deployed shape, running: CloudPanel layout + nginx proxy hop + MySQL
docker compose -f infra/docker-compose.yml up --build     # → localhost:8080
```

## Layout

```
services/site     Astro static site + vanilla TS motion layer (portfolio)
services/lab      React + Vite SPA (three.js lab)
services/api      PHP API (contact email + analytics; bin/ holds the CLI jobs)
services/builder  build.sh → CloudPanel deploy tarball
infra             docker compose: the deployed layout + MySQL, for verification
.claude           agents (architect/frontend/backend) + /ship command
briefs            one brief per planned feature (_template.md)
docs              living documentation (_template.md)
```

## Working in this repo

- Read **`CLAUDE.md`** for the architecture and conventions, **`AGENTS.md`** for
  the agent roster.
- Git flow (AVH edition): features branch off `develop`; `main` is the release
  line.
- `/ship [--push]` commits (and optionally pushes) the current work.
