# 1 · Principles

The rules everything else follows from. When two guidelines seem to disagree, these win.

## The theme draws; the plugin remembers and composes

- **The plugin holds what the site *is*.** That covers the business's facts, the custom
  post types and their data, the Elementor widgets, the dynamic tags and the Kit.
  A change of theme must never take the content with it.
- **The theme holds what the site *looks like*.** That covers templates, CSS, motion, and
  the words it says by itself.
- **Every call across the line is guarded.** Wrap it in `function_exists()`, in both directions:
  - with the plugin deactivated, the theme still renders with its defaults;
  - with the theme switched, the plugin still holds every fact.

```php
$facts = function_exists('frascella_facts') ? frascella_facts() : [];
```

## Native first

- **Words and pictures are Elementor's own widgets** (Heading, Text Editor, Image), inside
  containers that carry the theme's classes. The people who run the site write, replace
  and move them in the editor.
- **A widget of the plugin exists only where there is data or behaviour.** Examples:
  - a query (the latest posts, a list of services);
  - a fact from the settings (the contact card);
  - a script (a slider, a form).
- **Its texts are still fields**, and each field starts from the site's words in the page's
  language.

See [04 · Elementor](04-elementor.md).

## One copy of the markup

A section prints the same template part whether it comes from:
- a plugin widget,
- a Theme Builder document,
- the theme's own template (`frascella_document()`).

Two implementations of a section are two sections that drift apart.

## The page says it, or nobody does

- **Structured data, meta descriptions and the sitemap declare only what a person can read
  on the page.** An empty fact is an absent key, never an empty string. See [06 · SEO](06-seo.md).
- **No invented facts.** Every fact about the business comes from the business or from its
  previous site. A missing phone number is a missing phone number, not a plausible one.

## /privacy says what the code does

- When what the site collects changes, the privacy notice changes in the same commit: a form, a cookie, an analytics service, a third party.
- The notice is written from the code, not from a template.

See [08 · Privacy](08-privacy.md).

## Nothing real leaves a development machine

- Locally, every email goes to Mailpit (`wp-content/mu-plugins/local-mail.php`).
- Tests use `@example.com` addresses only.
- On production nothing is ever submitted to "try it": checks there are read-only.

See [09 · Testing](09-testing.md) and [10 · Release and deploy](10-release-and-deploy.md).

## Accessible by default

- axe is clean on every kind of page, on a phone and on a desktop, in every language.
- Contrast is checked on dark surfaces too.
- Motion respects `prefers-reduced-motion`.

See [07 · Accessibility](07-accessibility.md).

## Say why

A comment explains **why** a line is there: the bug it prevents, the rule it follows, the
alternative that was tried and failed. The *what* is the code's job. See
[11 · Code style](11-code-style.md).
