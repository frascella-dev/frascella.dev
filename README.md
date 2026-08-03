# frascella.dev — portfolio monorepo

Personal portfolio of **Emanuele Frascella**, backend engineer (Taranto, Italy).

Independent services:

| Path              | Stack              | Role                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------- |
| `services/site-v2`| Astro (static) + vanilla TS | The public portfolio site. Static HTML; WebGL, three.js and GSAP layered on as plain ES modules. |
| `services/site-v1`| Astro + React islands | The previous portfolio. Archived for reference — don't develop against it. |
| `services/lab`    | React + Vite (SPA) | Standalone three.js experimentation lab (dev playground).           |
| `services/api`    | NestJS (Node)      | Thin, stateless API. Server-side effects only (today: contact email). |

No database, no admin, no framework runtime on the page. The portfolio talks to
the API over CORS through a single endpoint (`POST /api/contact`).

## Quick start

Run each service in its own terminal:

```bash
# API — http://localhost:3000/api
cd services/api    && cp .env.example .env && npm install && npm run dev

# Public site — http://localhost:5173
cd services/site-v2 && cp .env.example .env && npm install && npm run dev

# three.js lab — http://localhost:5174 (optional, standalone)
cd services/lab    && npm install && npm run dev
```

The API logs contact messages to the console instead of sending them until
`MAIL_HOST` is configured, so the form works end-to-end with no mail server.

## Build

```bash
cd services/api    && npm run build
cd services/site-v2 && npm run build
```

## Layout

```
services/site-v2  Astro static site + vanilla TS motion layer (portfolio)
services/site-v1  previous portfolio, archived
services/lab      React + Vite SPA (three.js lab)
services/api      NestJS API
.devcontainer     client/ + server/ dev containers
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
