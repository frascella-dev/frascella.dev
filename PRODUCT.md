# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: prospective freelance clients.** Businesses and professionals looking for a developer — a
WordPress site built properly, a backend, an integration, a plugin. They arrive from a referral, a
search or the GitHub org, judge in a minute whether this is someone they can trust with their thing,
and, if so, send a request.

Secondary, not designed for: engineers and companies reading the technical record. The site must stay
credible to them, but never at the cost of the client's minute.

## Product Purpose

The portfolio of Emanuele Frascella, freelance software engineer in Taranto, rebuilt as a WordPress
site. It shows who he is, what he builds for clients, and the work that proves it, and ends in a
request form. Success is a well-formed request from a client who already understood what he does.

## Positioning

A backend engineer from regulated, high-traffic industries (telemedicine, then online-casino game
engines) who now builds for small businesses with the same hygiene: sites and plugins that are his
own, self-hosted, privacy-first, written down and maintained. The products are real and in public
repositories — Agenda, Voci, Postino, Chiaro, Bottega, Analytics — and a client site runs on them.

## Operating Context

- Built from the Bottega template: a theme that draws, a plugin that remembers, Elementor (Pro) for
  pages, Polylang for Italian (default, on `/`) and English (`/en/`).
- Requests arrive through **Agenda** (frascella-dev/agenda), replacing the old site's contact API.
- Statistics through **Analytics Connector** (frascella-dev/analytics), with its consent banner.
- The previous site (Astro + PHP API) is in `_old/` for reference, deleted before release.

## Capabilities and Constraints

- Everything a crawler should index is in the markup. No content painted into a canvas: the old
  three.js work corridor is not carried over.
- Motion only as an enhancement, off under reduced motion; the page is complete without it.
- Two languages, written separately rather than translated word for word.
- **Open decision: the services.** The owner chose "portfolio + services" but has not yet named the
  services, their scope or any pricing. Nothing about them is to be invented; placeholders are marked.

## Brand Commitments

- Name and mark: **frascella.dev**, the "EF" monogram with a vermilion square, lockups and business
  cards in the Sketch file `frascella.dev` (pages Logo, Business Cards, Symbols).
- Palette (from Sketch): Ink #0E0E11, Graphite #1C1C21, Paper #F3EFE7, Stone #8A857C, Vermilion
  #FF4A1C, Sand.
- Fonts unchanged from the previous site: **Gloock** and **Schibsted Grotesk** (woff2 in
  `_old/services/site/public/fonts`).
- Voice: first person, plain and precise, lowercase in UI labels on the old site; no inflated claims.
  "I reply within two working days."

## Evidence on Hand

- Bio facts and copy: `_old/services/site/src/i18n/{en,it}.ts`, interview in
  `_old/briefs/copy-interview.md` (born in Taranto, coding since 2013, telemedicine → gaming,
  microservices & containers, Procreate tattoo designs, freelance only, remote since 2026).
- Bio photographs referenced by the old site (Taranto, repair, coding, drawing, containers) and the
  portrait, in `_old/services/site`.
- Work to show:
  - **vitrine** — Windows desktop overlay, C# · WPF · WebView2, public, used daily.
  - **proxima** — gym programs PWA with an MCP server for Claude, Flutter · Python · MySQL, used daily.
  - **Sevenink Tattoo** — client site, seveninktattoo.it, WordPress + Elementor Pro, it/en.
  - **WordPress plugins** — Agenda (requests & appointments), Voci (reviews with consent), Voci
    Google, Postino (double opt-in newsletter), Chiaro (FAQ), Bottega (site template).
  - **Analytics** — self-hosted, privacy-first, multi-site web analytics (analytics.frascella.dev).
- Absent, never to be fabricated: testimonials, client logos, numbers of clients or projects,
  prices, service packages.

## Product Principles

1. The client's minute first: who, what he builds for you, proof, how to ask.
2. Proof over claims — every statement about quality points at something real and inspectable.
3. The site is itself a specimen of the work: fast, indexable, accessible, private by default.
4. One person, not an agency: the voice stays first person and specific.

## Accessibility & Inclusion

WCAG 2.2 AA; axe clean on every page, desktop and phone, both languages (Bottega's test harness).
Reduced motion honoured everywhere.
