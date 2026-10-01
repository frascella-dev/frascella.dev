---
name: privacy-notice
description: Write or update the site's privacy notice (and cookie list) so it says exactly what the code and the production settings do — after adding a form, a cookie, an analytics service, a third party or a plugin, or when auditing the notice. Also covers consent banners and analytics that must work with a strict referrer policy.
---

# The privacy notice says what the code does

Answer in the user's language, and write the notice in each of the site's languages. The
rules are in `docs/guidelines/08-privacy.md`. You are not a lawyer: say so when a legal
question is open, and never soften what the code does to make the notice read better.

## 1. Inventory: read the code, not the old notice

For every flow the site has, find in the code:

| Question | Where to look |
|---|---|
| What is collected? | the form's fields, the plugin's table columns |
| Where is it kept, and for how long? | retention settings, cron jobs, the plugin's docs |
| Who can read it? | capabilities, email recipients |
| What leaves the site? | emails, APIs, third-party scripts, fonts, embeds |
| What is written on the visitor's device? | cookies (name, duration), local storage, before and after consent |
| What is **not** collected? | the claims the notice makes, each one to check |

**Then read the production settings.** A plugin setting on production (a public form
switched on, a retention period, ratings) that differs from the one on your machine is a
sentence that is now wrong.

## 2. Write

- **One section per flow**, saying:
  - what is collected;
  - the legal basis (Art. 6(1)(a/b/f));
  - who reads it;
  - how long it is kept;
  - how to withdraw.
- **The cookie list**, by name: purpose, duration, and whether it needs consent.
- **An analytics service:**
  - what it measures without consent and with it;
  - IP truncation;
  - where it runs, and who operates it (a processor needs an agreement);
  - retention;
  - how to reopen the consent choice (a footer link).
- **Consent sentences are quoted** as the code records them.
- **A "the site does not…" list**, only of things you verified.

## 3. Publish in step with the code

- The notice changes **in the same release** as the code it describes.
- It is not published before the code goes live.
- If the notice is an Elementor page, update the Text Editor widget's HTML in every
  language.
- Check the widget's structure first on the target site, where it may differ from yours.
  Patch with exact replacements that must match once, or fail.
- Bump the page's modified date: the notice shows it.

## 4. Consent banner and analytics: the checks

- **Before the visitor chooses:** no analytics cookie, no local storage. Check with a
  fresh browser: `document.cookie`, and the Application tab.
- **After "reject":** the service's cookies are deleted.
- **The footer link reopens the choice.**
- **Events send names and short non-personal properties only.**
- **Firefox and Safari as well as Chrome.**
  - A `Referrer-Policy: same-origin` header makes their beacons carry `Origin: null`, and
    the service answers 403.
  - Fix: `add_filter('frascella_referrer_policy', fn () => 'strict-origin-when-cross-origin')`,
    or the server header.
  - Never on pages whose address carries a token.
- **Automated browsers may be ignored** by the tracker (`navigator.webdriver`). Your test
  visit counts; say so to the user.

## Never

- Invent a consent record the data did not keep.
- Write "we never…" without having checked.
- Put a developer's address where the business's belongs.
