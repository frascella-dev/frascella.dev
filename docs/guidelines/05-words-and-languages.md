# 5 · Words and languages

## The words the theme says

**Where they live.** Every word the theme says is in `inc/content/{lang}.php`, one PHP array per language.
- The default language's file is complete.
- Each other file starts with `$base = require __DIR__ . '/it.php'` and returns `array_replace($base, [...])`.

**Reading them.**
- `frascella_s('contact.lede')` gives a string; closures are called with the facts.
- `frascella_t('path')` gives the raw value: a string, a list or a closure.

**Why a PHP tree and not .po files.**
- These sentences are versioned with the markup that arranges them.
- Nobody edits them from a dashboard.
- Some of them wrap the business's facts (`fn (array $who) => "Write to {$who['name']}"`), and a gettext string cannot be a closure.
- Words the site's editors change are native widgets, or plugin widget fields that start from this tree.

**Three gotchas:**

1. **Always use braces to interpolate.** PHP identifiers may contain bytes ≥ 0x80, so in
   `"«$title»"` the closing guillemet becomes part of the variable name. The string comes
   out truncated, with a warning in the log and nothing on screen. To check:
   `grep -rnP '\$[A-Za-z_]\w*[\x80-\xFF]' inc/`.
2. **`array_replace` is shallow.** A translation that overrides a section (`'contact' =>
   [...]`) replaces the whole Italian subtree, so it must repeat every key of it.
3. **Closures take `frascella_who()`.** A closure that needs anything else (a count, a
   title) is read with `frascella_t()` and called by its caller.

## Placeholders in typed fields

When a field's words wrap a fact, the person typing uses `{name}`, `{city}`, `{street}`,
`{phone}` or `{email}`. `frascella_text_fill()` puts the facts in. A list of paragraphs is typed
with a blank line between them.

## Polylang: addresses

These are the settings `tools/setup-languages.php` applies:
- **The default language on the root, the others as a folder** (`/en/`): `hide_default`,
  `force_lang`.
- **No redirect on the browser's language.** An address answers the same to everyone.
- **A language's home is its root** (`redirect_lang`), `/en/` and not `/en/home/`.
- **Media is not translated.** Alt text is per language instead (the plugin's `media.php`).

## The same slug in every language

WordPress makes slugs unique across the whole site, so the English copy of `/privacy/`
would be `/en/privacy-2/`. Two parts of the plugin fix this:
- **`inc/polylang.php` keeps the original slug** when it is free *within the post's own
  language*.
- **It then resolves `/en/privacy/` to the English page** on `pre_get_posts`. Otherwise
  WordPress finds the first `privacy` and `redirect_canonical` sends the reader to the
  Italian one.

## Pitfalls met in real projects

- **`home_url()` is rewritten by Polylang.** On an English page it returns `/en/`.
  - For another language's address, use `pll_home_url($lang)`.
  - For something that must be the same in every language, such as a JSON-LD `@id`, use
    `get_option('home')`.
- **Under WP-CLI, Polylang's query filter does not run**, and a `lang` argument to
  `get_posts()` is silently ignored. Query without it, then check
  `pll_get_post_language()` for each result.
- **A post created before it has a language gets a `-2` slug.** Set the language, then
  save the post again with the slug you wanted.
- **Links to fixed pages must follow the reader's language.** `frascella_privacy_url()` uses
  WordPress's privacy page and `pll_get_post()`. A plain `/privacy/` sends English readers
  to the Italian notice.
- **The language list comes from Polylang** (`pll_languages_list()`), never from an array
  in the code. A hard-coded list is out of date the day a language is added.

## Menus

- **One menu per language** in the «Primary» position, assigned through Polylang's
  `nav_menus` option (see `tools/demo.php`).
- **The header and the footer both read that menu.** A second list of links in a widget
  goes stale.

## Theme Builder documents

- **A header, footer or single layout is one Elementor document for the whole site.** A
  word changed in it would change on every language's pages.
- **So each document has a copy per language:**
  - the default language's copy carries the display conditions;
  - each other copy has `_frascella_lang` and `_frascella_translation_of`;
  - on that language's pages, `elementor/theme/get_location_templates/template_id` serves
    the copy instead of the original.
- **The editor's preview of a copy speaks its language.** The plugin sets Polylang's
  current language from `_frascella_lang`.
- **Make a copy with `wp frascella translate-template <id> <lang>`**, then edit its words.

## Alt text

- Each non-default language gets an «Alternative text (EN)» field next to WordPress's own.
- An Image widget prints the alt text in the page's language.
- A decorative image has an empty alt; a meaningful one never does.
