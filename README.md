# frascella.dev — portfolio monorepo

Personal portfolio of **Emanuele Frascella**, backend engineer (Taranto, Italy).

Two independent services:

| Path              | Stack              | Role                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------- |
| `services/public` | React + Vite (SPA) | The public portfolio site — design-led, client-side only.           |
| `services/api`    | NestJS (Node)      | Thin, stateless API. Server-side effects only (today: contact email). |

No database, no admin, no SSR. The SPA talks to the API over CORS through a
single endpoint (`POST /api/contact`).

## Quick start

```bash
make install        # install both services' deps
make dev            # run API (:3000) and client (:5173) together
```

Or per service:

```bash
cd services/api    && cp .env.example .env && npm install && npm run dev
cd services/public && cp .env.example .env && npm install && npm run dev
```

The API logs contact messages to the console instead of sending them until
`MAIL_HOST` is configured, so the form works end-to-end with no mail server.

## Build

```bash
make build          # builds both
# or: make build-api / make build-client
```

## Layout

```
services/public   React + Vite SPA
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
