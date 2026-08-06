# Brief: First-party analytics and the admin dashboard

- **Status:** in progress (built and verified end to end; not yet deployed)
- **Date:** 2026-08-06
- **Branch:** `feature/analytics` (git flow, off `develop`)
- **Owner agent(s):** backend + frontend

## Problem / goal

The portfolio has been live with no idea of what happens on it: whether anyone
reaches the work corridor, how far down the page people actually get, and how
many of them start the contact form and give up. The goal is to answer those
questions from data the site collects itself — no Google, no third party, no
data leaving the box the site is deployed on — and to read the answers from a
dashboard behind a password.

This reverses two of the repo's founding constraints ("no database and no admin
panel"), on an explicit request. It is the first stateful thing the API does.

## Scope

**In scope**

- A database behind the API, driver-selectable per environment: SQLite for a
  small deployment or local dev, MySQL where one already exists.
- `POST /api/track`: a batched, cookie-identified ingest endpoint.
- Four families of signal: pageview context, scroll depth and section dwell,
  site interactions, and the contact funnel.
- A GDPR consent banner, a `/privacy` page, and honest footer copy.
- `/admin`: password login and a dashboard over the collected data.

**Out of scope**

- Multi-user admin, roles, or password reset by email. One owner, one password.
- Geolocation from an IP database. Country is read from a proxy header when the
  host provides one (`CF-IPCountry`), and is otherwise unknown.
- Retention beyond a pruning job. Raw events age out; nothing is archived.
- A/B testing, heatmaps, session replay.

## Which service(s)

- [x] `services/site` — consent banner, tracker, `/privacy`, `/admin`
- [x] `services/api` — DB layer, ingest, admin auth, aggregation
- [x] Contract change — new endpoints, new cookies, new env vars

## The seam / contract

### Ingest

```
POST /api/track          Content-Type: text/plain (kept CORS-simple on purpose,
                         so sendBeacon and keepalive fetch never preflight)
{
  "ctx": { "path", "ref", "vw", "vh", "sw", "sh", "lang", "tz" },
  "events": [ { "n": name, "c": category, "l": label?, "v": value?, "t": epochMs } ]
}
→ 204 No Content     always, including when consent is missing and the batch
                     is dropped — the client is never told whether it counted.
→ 429                over the ingest rate limit
```

Categories: `page`, `scroll`, `section`, `interaction`, `contact`.

### Admin

```
POST /api/admin/login    { password }        → 200 { ok: true } + pf_admin cookie
                                             → 401 { message }
                                             → 429 after 5 tries in 15 minutes
POST /api/admin/logout                       → 204
GET  /api/admin/me                           → 200 { authenticated: bool }
GET  /api/admin/stats?from=&to=              → 200 { …the whole dashboard… }
                                             → 401 when the cookie is missing
```

Validation failures keep the site-wide contract: `422 { message, errors: { field: [msg] } }`.

### Cookies

| Name         | Purpose                          | Lifetime  | Consent needed |
| ------------ | -------------------------------- | --------- | -------------- |
| `pf_consent` | records the visitor's own choice | 6 months  | no — strictly necessary |
| `pf_vid`     | visitor identity                 | 13 months | yes            |
| `pf_sid`     | session, rolling                 | 30 min    | yes            |
| `pf_admin`   | admin session, httpOnly          | 7 days    | no — the owner, not a visitor |

13 months and 6 months are the Garante/CNIL ceilings for analytics identifiers
and for re-asking after a refusal.

## Design notes

The consent banner is the first thing a first-time visitor sees after the
splash, so it has to belong to the page rather than sit on it: ink panel,
`--sans` at label size, accept and reject as two buttons of **equal visual
weight** — a bright "accept" against a greyed "reject" is exactly the dark
pattern the GDPR guidance names.

`/admin` is not the portfolio. No splash, no fluid, no corridor, no custom
cursor — it shares the design tokens and nothing else. Charts are hand-rolled
SVG; adding a charting library to a site that ships no framework would be the
largest dependency in the repo.

## Migrations: why not Doctrine

It was offered and turned down. `doctrine/migrations` brings DBAL, a Symfony
console, and half a dozen transitive packages — into a service whose entire
dependency list is currently PHPMailer, and whose `vendor/` ships inside the
deploy tarball. What it would buy is dialect-portable DDL for **four**
`CREATE TABLE` statements.

The risk it would have covered — hand-written MySQL DDL that nobody had run —
is covered instead by `infra/`, which runs the real migrations against a real
MySQL on every `docker compose up`. That answers the same question at the cost
of a compose file rather than a framework. Revisit if the schema ever grows
column-level changes to existing tables, where hand-written `ALTER` across two
dialects stops being trivial.

## Acceptance criteria

- [x] With consent refused, or never given, the site sets no `pf_vid`/`pf_sid`
      and `POST /api/track` writes nothing.
- [x] The same schema builds on SQLite and on MySQL from one migration run.
- [x] `/admin` returns nothing useful without the cookie; every stats route is
      401 when unauthenticated.
- [x] `/admin` and `/privacy` are excluded from indexing (`noindex` + robots).
- [x] Build passes for each touched service (`astro check`: 0 errors; `php -l`
      clean).
- [x] (Frontend) verified with a screenshot at desktop + mobile — consent bar,
      `/privacy`, the login, and the dashboard against seeded data.
- [x] (Backend) endpoints exercised with curl against the `infra/` stack: 29
      checks, 0 failures.

## Open questions

- Country stays null until the site sits behind something that resolves it.
  Cloudflare in front of CloudPanel would fill it in for free.
- Retention window is set to 400 days by config; nobody has decided whether
  that is the right number.
- `owner.email` in `src/data/site.ts` is empty, so `/privacy` points at the
  contact form for data-protection requests. Valid, but slower than an address.
