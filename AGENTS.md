# AGENTS.md

Agent roster and division of labour for this repository. (This file is the
vendor-neutral companion to `CLAUDE.md` — read that first for the project map.)

## The repo in one breath

A monorepo: `services/site` (the portfolio — a static Astro site with a
vanilla-TS motion layer), `services/api` (plain PHP: the contact email plus
first-party analytics over SQLite or MySQL) and `services/builder` (packages
both into a CloudPanel tarball). No Laravel, no framework runtime on the page.

The client/server seam is `/api/contact` with a `422 { message, errors }`
validation contract, `/api/track` for the analytics beacon, and `/api/admin/*`
behind one password. The database exists **only** for analytics — the site's
own content is static and the contact form still persists nothing.

Two rules that outrank convenience: consent gates every analytics write, and
no IP address is ever stored. `/privacy` documents both, and has to stay true.

## The agents (`.claude/agents/`)

### `architect` — design & sequencing (read-only)
Reason about cross-cutting changes, decide what belongs on the client vs. the
server, and produce an ordered implementation plan citing `file:line`. Does not
edit files; hands work to `frontend`/`backend`. Use before non-trivial features.

### `frontend` — the portfolio site
Owns `services/site`: Astro components, CSS, the `src/lib/` motion modules,
layout, responsive and touch behaviour, the contact-form UI. **This agent can run the app and see its
own output** — it drives a browser (Playwright) to screenshot the page at desktop
and mobile sizes, read the result, interact with it, and iterate until the craft
bar is met. Consults the `frontend-design` plugin for aesthetic direction and the
`base.css` design tokens. A visual change isn't done without a screenshot.

### `backend` — the PHP API
Owns `services/api`: routes, validation, rate-limiting, mail, and the
analytics side (PDO layer, migrations, ingest, the dashboard's queries).
Preserves the `/api` prefix and the 422 error contract, keeps the contact
path stateless so mail still works with the database down, reads all config
from env, and verifies with `php -l` + curling the endpoint.

### `typewriter` — the copy
Owns the *words*, not the layout: headlines, section intros, project
descriptions, contact copy, and all terminal/console text. Specialised in
typewriting — kills repetition, cuts to the load-bearing words, tunes rhythm,
keeps a consistent terse register in Emanuele's voice. Touches text nodes only,
never structure or facts. Use whenever copy is added or changed, or to sweep the
site for weak or duplicated phrasing.

### `choreographer` — motion & the scroll narrative
Owns the *time axis*: how a section enters, how long it holds before it moves,
how one beat hands over to the next, pinned/sticky stages and the scroll→state
mapping, reveal order and easing, and the `prefers-reduced-motion` path as a
designed alternative rather than a fallback. Pairs with `typewriter` — dwell is
a function of how much there is to read, so timing is set against the copy, not
guessed. Verifies by scrolling in the browser and screenshotting the beats,
especially the entrance and exit of every pinned range.

### `seo` — search visibility & machine-readability
Owns metadata, per-route titles/descriptions, Open Graph and Twitter cards,
JSON-LD, `robots.txt`/`sitemap.xml`, heading and `alt` semantics, and the SEO
half of Core Web Vitals. The site is **statically rendered by Astro**, so the
served HTML already contains the copy — the thing to watch is that anything
painted into a canvas (the work corridor) also exists as real text, which is
what `.work-fallback` is for. Don't let content regress into script-only DOM.

## Division of labour

- Anything with a **visual or interactive** outcome → `frontend`.
- Anything about the **copy / wording** (repetition, concision, tone) → `typewriter`.
- Anything about **pacing, scroll flow, or animation timing** → `choreographer`
  (with `typewriter` when the beat drags because the words are long).
- Anything about **being found or parsed by machines** → `seo`.
- Anything **server-side** (email, secrets, validation, rate-limiting, the
  database, new endpoints) → `backend`.
- Anything that changes **what is measured** → `backend` and `frontend`
  together, and `/privacy` in the same commit.
- Anything **spanning both** or structural → `architect` plans it first, then the
  two implement against the agreed contract.
- Keep the request/response shape in sync across the seam — it's the one place
  the two services couple.

## Commands & workflow

- `/ship [--push] [message]` — commit everything; optionally push.
- Features are planned as a brief in `briefs/` (`_template.md`) and documented in
  `docs/` (`_template.md`).
- Git flow (AVH): branch features off `develop`; `main` is the release line.
