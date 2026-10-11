# frascella.dev

A static site built with **Astro**, published on **GitHub Pages**: the pages, a 3D desk drawn
with three.js (`src/desk/`), and an email address to write to. No server, no forms, no
cookies, no statistics.

## Project

- **Business:** the portfolio of Emanuele Frascella, software engineer, freelance, Taranto (Italy). VAT 03462650734.
- **Languages:** it (default, `/`), en (`/en/`)
- **Hosting:** GitHub Pages, from `main` (`.github/workflows/pages.yml`); custom domain www.frascella.dev
- **Email:** emanuele@frascella.dev (OVHcloud mail)
- **Laws that apply:** GDPR + Italian Codice Privacy
- **Register of the words:** first person, plain, precise; English and Italian written separately, not translated word for word (`COPY.md`, `COPY.en.md`)
- **Design:** palette and mark in the Sketch file `frascella.dev` (Ink #0E0E11, Graphite #1C1C21, Paper #F3EFE7, Stone #8A857C, Vermilion #FF4A1C); fonts Gloock + Schibsted Grotesk

## How to work here

- **Answer in the user's language.** Code, comments and docs are in English. The site's
  words are in its languages, in `src/i18n.ts`.
- **The desk's hooks** are listed in `src/desk/CONTRACT.md`: rename one there and in
  `scene/main.js` in the same commit.
- **Check before saying it works:** `npm run build && npm test` (every page, both languages,
  desktop and phone, axe, the desk in WebGL, the owl's flight), then look at the
  screenshots in `tests/shots/`.

```sh
npm run dev      # http://localhost:4321
npm run build    # dist/
npm test         # browser checks against dist/
```

## The rules that are never bent

1. **No invented facts** about the business, and no invented reviews, numbers or claims.
2. **`/privacy` says what the code does**, and changes in the same commit as the code: a
   cookie, browser storage, a form, a statistic or anything loaded from another host.
3. **Nothing loaded from another host.** Fonts, scripts and pictures are the site's own.
4. **Never print, upload or commit personal data or credentials.**
5. **Verify before saying it works.** Run the checks, look at the screenshots, and report
   failures with their output.
6. **Outward-facing or hard-to-undo actions** (push, DNS, deleting data, sending) are
   confirmed with the user, unless they already said to go ahead for that action.
