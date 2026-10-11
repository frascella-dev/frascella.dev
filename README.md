<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.png">
  <img alt="frascella.dev — Emanuele Frascella's website, a static Astro site" src=".github/assets/banner-light.png">
</picture>

<p align="center">
  <a href="https://github.com/frascella-dev/frascella.dev/releases"><img alt="Release 2.0.0" src="https://img.shields.io/badge/release-2.0.0-0e0e11"></a>
  <img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-0e0e11">
  <img alt="three.js 0.169" src="https://img.shields.io/badge/three.js-0.169-0e0e11">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/hosted%20on-GitHub%20Pages-0e0e11">
  <img alt="License GPL-2.0-or-later" src="https://img.shields.io/badge/license-GPL--2.0--or--later-0e0e11">
</p>

The website of **Emanuele Frascella**, freelance software engineer in Taranto:
[frascella.dev](https://www.frascella.dev).

A static site built with **Astro**, in Italian and English, published on **GitHub Pages**.
No server, no database, no forms, no cookies, no statistics: the pages, their pictures and a
3D desk drawn with three.js, and an email address to write to.

## Features

- **The manifesto.** An Ink sheet with the big words cut out of it, and a 3D desk at night
  behind it, seen through the letters. Gloock and Schibsted Grotesk, served by the site. The
  words and the layout load first; the desk fades in when it is ready, and still pictures
  take its place where WebGL is missing.
- **A desk you can touch.** The lamp, the turntable, the mug, the tablet (you can draw on
  it), the phone, the plant and a small owl answer a click: the owl flies out of the frame
  and comes back. The keyboard reaches the same objects through switches that appear on Tab.
  Under reduced motion nothing moves.
- **Two languages.** Italian on `/`, English on `/en/`, written separately (`COPY.md`,
  `COPY.en.md`), each page with its other language in `hreflang`.
- **Search engines.** Titles, descriptions, canonical URLs, Open Graph and a `Person` graph,
  a sitemap with both languages, the favicon, the Apple touch icon and a web app manifest.
- **Private by construction.** Nothing is loaded from anyone else, nothing is stored in the
  browser; the privacy notice says so, and what GitHub Pages logs.
- **Checked in a browser.** Every page, both languages, desktop and phone: script errors,
  failed requests, other hosts, cookies, axe, the desk in WebGL, the owl's flight measured
  against everything on the desk.

## Develop

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # dist/
npm test             # the browser checks against dist/ (screenshots in tests/shots/)
npm run check        # astro check and TypeScript
```

`BASE=https://www.frascella.dev npm test` runs the same checks against the published site,
read-only.

## Publish

Every push to `main` builds the site and publishes it on GitHub Pages
(`.github/workflows/pages.yml`). The base path comes from the Pages configuration: `/` on
the custom domain, `/frascella.dev/` on github.io before the domain points here.
[`CHANGELOG.md`](CHANGELOG.md) says what changed between versions.

## Two rules

- **`/privacy` says what the code does.** A cookie, a form, a statistic or anything loaded
  from elsewhere changes that page in the same commit.
- **No invented facts about the business.** No reviews, numbers or claims nobody can back.

## Design

The icon and the banners come from the Sketch file `frascella.dev`: the EF monogram, and
the manifesto in miniature, with the desk seen through the letters. The sources are SVGs in
[`design/`](design/), exported with `npm run export-assets` (the README's PNGs and the
site's icons); the notes are in [`docs/icon.md`](docs/icon.md).

<p align="center"><img alt="The EF icon" src=".github/assets/icon-512.png" width="160"></p>

## Layout

```
src/
  pages/                  /, /en/, /privacy/, /en/privacy/, the 404, sitemap.xml, robots.txt
  layouts/Base.astro      the <head>: title, canonical, hreflang, Open Graph, JSON-LD, icons
  components/             header, footer, the home's sections, the stage, the privacy notice
  i18n.ts                 every word, per language, and who the site belongs to
  styles/                 the CSS, on the tokens (tokens.json → tokens.generated.css)
  lib/                    the header's drawer, the sheet that cuts the words, the reveal
  desk/                   the 3D desk (three.js): the scene, its stills, CONTRACT.md, PERFORMANCE.md
  projects/               the projects' screenshots
public/                   favicon, touch icon, web app manifest
tests/check.mjs           the browser checks
design/                   the SVG sources of the icon and the banners (.github/assets/)
```
