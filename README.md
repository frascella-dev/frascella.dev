# frascella.dev — portfolio monorepo

Personal portfolio of **Emanuele Frascella**, backend engineer (Taranto, Italy).

Independent services:

| Path              | Stack              | Role                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------- |
| `services/site`| Astro (static) + vanilla TS | The public portfolio site. Static HTML; WebGL, three.js and GSAP layered on as plain ES modules. |
| `services/lab`    | React + Vite (SPA) | Standalone three.js experimentation lab (dev playground).           |
| `services/api`    | PHP 8 (no framework) | Thin, stateless API. Server-side effects only (today: contact email). |
| `services/builder` | bash              | Packages site + API into one CloudPanel-ready tarball.              |

No database, no admin, no framework runtime on the page. The portfolio talks to
the API through a single endpoint (`POST /api/contact`) — same-origin in the
deployed layout, CORS in dev.

## Quick start

Run each service in its own terminal:

```bash
# API — http://localhost:3000/api
cd services/api    && cp .env.example .env && composer install && composer dev

# Public site — http://localhost:5173
cd services/site && cp .env.example .env && npm install && npm run dev

# three.js lab — http://localhost:5174 (optional, standalone)
cd services/lab    && npm install && npm run dev
```

The API logs contact messages to the console instead of sending them until
`MAIL_HOST` is configured, so the form works end-to-end with no mail server.

## Build

```bash
cd services/site && npm run build       # static site → dist/
services/builder/build.sh               # full deploy tarball for CloudPanel
```

## Layout

```
services/site     Astro static site + vanilla TS motion layer (portfolio)
services/lab      React + Vite SPA (three.js lab)
services/api      PHP API (contact email)
services/builder  build.sh → CloudPanel deploy tarball
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
