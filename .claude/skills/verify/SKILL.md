---
name: verify
description: Check a change on a Bottega site before calling it done — the e2e tests (widgets, editor preview, languages, accessibility), screenshots at desktop and phone width, email flows through Mailpit — and read-only checks on production. Use after any change to templates, CSS, widgets or plugins, and before any release.
---

# Verify before saying it works

Answer in the user's language. The rules are in `docs/guidelines/09-testing.md`.
**Report what you saw, including failures**, with the output. Never say "should work".

## 1. Locally

1. `npm run build` in the theme, if CSS or TS changed. `npm run typecheck`.
2. `php -l` on every PHP file you touched.
3. In the plugin, `npm test`, or the one that covers the change:

   | Test | What it covers |
   |---|---|
   | `test:widgets` | plugin widgets: typed fields, fallbacks, languages, markup, the editor's fields |
   | `test:editor` | reveal for a visitor, everything visible in the editor, the preview follows the panel |
   | `test:languages` | Theme Builder copies per language (needs Elementor Pro) |
   | `test:a11y` | axe on every kind of page, desktop and phone |

4. **Screenshots**, with Playwright, of every page you changed:
   - at 1440 × 900 and 390 × 844, in every language;
   - with `reducedMotion: 'reduce'` for a stable image;
   - then **look at them**. Alignment, spacing, contrast and wrapping are not in any test.
5. **A flow that sends email:**
   - run it with an `@example.com` address;
   - read the message in Mailpit (`http://localhost:<port+25>`, API `/api/v1/messages`);
   - check the words, the language and the links;
   - nothing reaches a real inbox, because `local-mail.php` makes sure of it.
6. **Something new must be tested** (a widget, a kind of page): add it to the tests in the
   same change.

## 2. Automated browsers and analytics

- Trackers usually ignore `navigator.webdriver`. To see events, launch Chromium with
  `--disable-blink-features=AutomationControlled`, or intercept the request and read it.
- Your visit is then counted.
- Test Firefox and WebKit too when requests go cross-site.

## 3. On production: read only

- **Every kind of page answers 200** in every language, the 404 answers 404, and a fake
  token shows the "not valid" page.
- **`curl` the head:** title, canonical, `hreflang`, robots.
- **Stylesheet and scripts load**, and a headless browser sees no console errors.
- **What the release changed** is visible.
- **Never:**
  - submit a form;
  - send an email;
  - create a record;
  - "try" a checkout or a booking.

  If something can only be checked by doing one of these, ask the user.

## Done when

Tell the user:
- what now works, with a link they can open;
- what you checked;
- what you could not check, and why.
