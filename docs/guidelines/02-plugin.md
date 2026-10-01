# 2 · The plugin

`wp-content/plugins/frascella` is the site's content and composition.

## Layout

- **`frascella.php`** is the header, the constants, then a flat list of `require`: one file per job, each with a comment saying what it is. The main file holds no logic.
- The activation hook does only what must happen once:
  - set the permalinks and flush the rewrites;
  - make each language's home its root (Polylang `redirect_lang`);
  - switch off Elementor's own colours, fonts, container width and image-loading attributes;
  - write the Kit.

```
frascella.php
inc/facts.php               the business's facts, one option, Settings → frascella.dev
inc/media.php               alt text per language
inc/polylang.php            what is translatable; same slug in every language; addresses by language
inc/elementor.php           category, widgets, stylesheet, dynamic tags, Kit
inc/elementor/sections.php  the widgets as data (the spec)
inc/elementor/widgets.php   the base class, and one line per widget
inc/elementor/tags.php      the facts as dynamic tags
inc/elementor/languages.php Theme Builder documents per language
inc/cli.php                 wp frascella …
assets/elementor.css        Elementor's layout taken back off
tests/e2e/                  Playwright + axe against the local site
```

## Options

- **One option per screen, not one per field.** They are read together on every request.
- **Name each option once, in a constant**: `FRASCELLA_OPTION_FACTS`.
- **Sanitise in `register_setting`'s callback**, by type: an email that is not valid is saved as empty, never "fixed".

## Custom post types and data

- **Register post types in the plugin, never in the theme.**
- **Declare them translatable in code**, through `frascella_translatable_post_types` (and the taxonomies through `frascella_translatable_taxonomies`). A fresh install is then right without anybody ticking a box in Polylang.
- **Records of what a person did are not translatable.** Requests, subscribers and reviews are records, not documents.

## Integrations with other plugins

- **The plugin decides where things go.** For example: where a request's email goes, or which page is the privacy notice in each language.
- **The theme decides how they look.** See [03 · The theme](03-theme.md#drawing-another-plugin).
- **Guard every call into another plugin** with `function_exists`.

## REST and admin

A richer panel (React on `@wordpress/scripts`, on an API under `frascella/v1/admin/…`) is the pattern the workspace's plugins use. Its rules:
- every route declares its capability;
- `wp.apiFetch` sends the nonce;
- lists are paginated on the server;
- writes to an ordered set touch only the range that moved.

Start with the Settings API screen (`inc/facts.php`), and grow into a panel only when the site needs one.

## WP-CLI

- **Every operation that must be repeatable is a command**: applying the Kit, copying a template for a language, a migration.
- **Commands are idempotent.** They recognise what is already there and skip it.
- **An import never sends anything**: no confirmation, no notification. It writes records directly, or through the other plugin's function that does not notify.

## Migrations from an old site

- **Read only the tables you need** from a dump. Never the accounts, sessions or mail settings, which may hold a password in clear.
- **Never upload a raw dump to a server.** Extract the one table you need, upload that, run the import, then delete it.
- **Never print personal data** in a log or a terminal. Count, and show shapes, not values.
- **Give imported rows an origin id** (`legacy_ref`, `_frascella_legacy_source`), so a second run finds them and skips them.
- **Never make up a consent record** the old data did not keep.
