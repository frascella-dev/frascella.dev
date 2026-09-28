# 9 · Testing

Tests run against the **local** Docker site (`bin/setup`), in the plugin
(`wp-content/plugins/frascella/tests/e2e`). They are plain Node scripts with Playwright and
axe, not a framework:
- each prints ✓ or ✗ per check;
- each exits non-zero on a failure;
- each puts back whatever it changed.

```sh
cd wp-content/plugins/frascella
npm install
npm test                 # all of them
npm run test:widgets     # typed fields, fallbacks, languages, markup filtering, the editor's fields
npm run test:editor      # reveal for a visitor, everything visible in the editor, preview follows the panel
npm run test:languages   # Theme Builder per language (skipped without Elementor Pro)
npm run test:a11y        # axe on every kind of page, desktop and phone, every language
```

## The harness (`_harness.mjs`)

| Helper | What it does |
|---|---|
| `php(code)` | PHP through WP-CLI in the site's container. Values go in as base64 JSON (`phpValue()`), never interpolated raw |
| `snapshot(id)` | saves a document's Elementor layout and returns the function that restores it. Every test that edits a page does `try { … } finally { restore() }` |
| `setWidget(id, type, settings)` | merges settings into every widget of a type |
| `login(browser)` | logs in with `WP_USER` / `WP_PASS` (never a hard-coded password), and accepts the "leave page?" dialog so nothing is saved |
| `openEditor(page, id)` | opens a document in Elementor and returns the preview frame once it has drawn |
| `audit(page, name)` | axe, WCAG 2.1 AA and best practice; serious and critical violations fail |

## Driving Elementor's editor

- **Find a widget in the panel's tree:**
  `window.elementor.getPreviewContainer()`, then recurse through `.children`, and match on
  `model.get('widgetType')` or `settings.get('_css_classes')`.
- **Change it the way the panel does:**
  `$e.run('document/elements/settings', { container, settings: {...} })`.
- **Read the preview:**
  `page.frames().find(f => f.url().includes('elementor-preview'))`.
- **In the editor a `.elementor-section-wrap` sits between the document and its sections.**
  Selectors must allow for it.
- **Never save.** Check afterwards that the published page does not contain what the test
  typed.

## What every project adds

- **A test per plugin widget:**
  - typed text shows on the page, in its language only;
  - an empty field falls back to the site's words;
  - disallowed markup is dropped.
- **The editor-preview test**, extended to every page type the site builds.
- **Every new kind of page** added to `a11y.mjs`.
- **Flows (forms, bookings, sign-ups) end to end locally:**
  - addresses `@example.com` only;
  - check the email in Mailpit (`http://localhost:8135`, API `/api/v1/messages`).

## Email, and why it never leaves

`wp-content/mu-plugins/local-mail.php` runs only on the local site:
- it forces every message to Mailpit, whatever a plugin's SMTP settings say;
- it rewrites the project's own domain to a test address, so a wrong setting cannot mail
  the business's people;
- it gives WordPress a valid sender (`wordpress@localhost` is refused by PHPMailer).

**Never test a form on production.** A booking form writes a request to the business, and
a newsletter form emails a real person. Checks on production are read-only:
- status codes and headers;
- a page's words;
- a script that loads;
- a fake token that shows the "link no longer works" page.

## Visual checks

- **Screenshot at 1440 × 900 and 390 × 844** with Playwright, and look at them.
- **Compare against the previous release** when refactoring CSS.
- **Pixel diffs are a tool, not a verdict.** Explain every difference that remains.
