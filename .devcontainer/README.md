# Devcontainers

Two independent dev containers, one per service, sharing a single
`docker-compose.yml`.

- **`client/`** → the `client` compose service. Astro + React islands
  (`services/site`), dev server on **5173**. Workspace folder is
  `services/site`.
- **`server/`** → the `server` compose service. NestJS API (`services/api`),
  listening on **3000**. Workspace folder is `services/api`.

Open either folder in VS Code ("Reopen in Container" / "Open Folder in
Container…" and pick `.devcontainer/client` or `.devcontainer/server`). Both
configs bring up **both** services (`runServices`), so the API is reachable
from the SPA container at `http://localhost:3000` regardless of which one you
attach to.

Each service's `node_modules` lives in a named volume, so `npm install`
(run automatically via `postCreateCommand`) doesn't collide with the host.
Copy each service's `.env.example` to `.env` before running.
