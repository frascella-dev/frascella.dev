---
name: plugin-in-theme
description: Make a general-purpose WordPress plugin (booking, reviews, newsletter, FAQ, forms…) look like the site — template overrides in the theme, its styles and scripts replaced by the theme's bundle, its emails in the site's colours, its private pages kept out of the index. Use when adding such a plugin to a site, or when one of its pages or emails looks foreign.
---

# Drawing another plugin inside the theme

Answer in the user's language. The rules are in `docs/guidelines/03-theme.md` (Drawing
another plugin).

## 1. Learn what the plugin offers

1. Read its docs for theme integration:
   - template overrides (`yourtheme/<plugin>/…`);
   - `add_theme_support` keys (`styles`, `scripts`, `email`);
   - filters for its URLs, privacy page and noindex.
2. List every screen it draws: forms, thanks pages, private pages, emails, admin notices.
   Screenshot each on the local site.

## 2. Its styles, scripts and email look

In `inc/setup.php`:

```php
add_theme_support('<plugin>', ['styles' => false, 'scripts' => false, 'email' => frascella_email_tokens()]);
```

- **Replace its CSS and JS** with the theme's own: a component file, and an entry if it
  has pages of its own.
- **Its emails** read the tokens.
  - For a layout override (`<plugin>/emails/layout.php`), use tables and inline styles only.
  - Render one without sending it, save it to a file, and look at it.

## 3. Its templates

1. Copy each template you want to change into `wp-content/themes/<slug>/<plugin>/…`.
2. Keep every `name`, hidden field, nonce, honeypot and `aria-*` exactly. Change only the
   markup and the classes.
3. Use the site's controls:
   - `field-name`, `input`, `textarea`, `check`;
   - `btn btn--solid`;
   - `field-error` under a field.

   Keep `novalidate`, and let the server's refusals show.
4. **Words:**
   - the labels around the fields come from the content tree (`frascella_s()`), in every
     language;
   - a sentence the plugin **records verbatim** (a consent) stays the plugin's.
5. **Note the plugin template's `@version`** in the override's docblock, so a later update
   can be compared.

## 4. Its pages that are nobody's document

A private link, a receipt, a confirmation:
- **Keep it out of the index and the sitemap:** `add_filter('frascella_noindex', …)` in a small
  `inc/<plugin>.php` in the theme, or `frascella_noindex_ids`.
- **Give it its entry:** `add_filter('frascella_entry', …)` to return a bundle with its
  component.
- **Keep the plugin's own `Referrer-Policy: no-referrer`** where the address carries a
  token.

## 5. Check

1. Every screen at 1440 and 390, in every language.
2. axe on each. Watch contrast on dark surfaces and the error lines.
3. **Flows end to end, locally only:**
   - addresses `@example.com`;
   - the emails in Mailpit;
   - never on production.
4. **The privacy notice** says what the plugin now collects (`privacy-notice` skill).
