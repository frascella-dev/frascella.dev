---
name: site-words
description: Add, change or translate the words the theme says (the per-language content tree in inc/content/*.php), add a language, or fix a sentence that comes out truncated or in the wrong language. Use for any user-facing text that is not typed in the Elementor editor.
---

# The site's words, in every language

Answer in the user's language. The rules are in `docs/guidelines/05-words-and-languages.md`.

## Where a word belongs

| The word is… | It lives in… |
|---|---|
| typed by the people who run the site, on one page | a native Elementor widget |
| said by a plugin widget | the tree, and it is also a field of the widget that starts from it |
| said by the theme (header, footer, 404, a plugin page the theme draws) | the tree |
| a fact (name, address, phone) | Settings → <Name>, **never** the tree |
| recorded verbatim by a plugin (a consent sentence) | the plugin. Do not reword it |

## Changing or adding words

1. Edit `wp-content/themes/<slug>/inc/content/<default>.php`, then every other language
   file.
2. In a translation file, **repeat every key of any section you override**: `array_replace`
   is shallow.
3. A sentence that names a fact is a closure:
   `'heading' => fn (array $who): string => "Write to {$who['name']}",`.
   **Always use braces:** `"{$who['name']}"`, never `"$name"` next to a non-ASCII
   character.
4. Read the words in templates with `frascella_s('section.key')`, escaped with `frascella_e()`.
5. Check for truncation:
   `grep -rnP '\$[A-Za-z_]\w*[\x80-\xFF]' wp-content/themes/<slug>/inc/` must find nothing.

## Adding a language

1. Add it in Polylang (see `tools/setup-languages.php` for the settings the site uses).
2. Create `inc/content/<lang>.php` as an `array_replace` over the default, with its own
   `htmlLang`, `ogLocale` and `endonym`.
3. Translate:
   - the pages;
   - the menu (a menu per language, «Primary» position);
   - each Theme Builder document (`wp <slug> translate-template <id> <lang>`);
   - the alt texts (the media library's «Alternative text (XX)» field).
4. Check `/<lang>/`:
   - `<html lang>`;
   - the `hreflang` set;
   - the canonical;
   - the widget fields in the editor.

## Writing well

- **Plain words**, in the register the business uses with its customers. Ask the user when
  unsure.
- **No invented claims:** no "leading", no "award-winning", no numbers the business did not
  give.
- **Button text says what happens** ("Send the request"), and labels say what is asked.
- **A promise in the privacy notice** ("we never …") is checked against the code before it
  is written.

## Pitfalls

- **A word in the wrong language on a translated page:** the code read `home_url()` or a
  hard-coded path. Use `pll_home_url($lang)`, `frascella_privacy_url()`, and `frascella_tree($lang)`.
- **A field in the editor showing the wrong language:** the document has no `_frascella_lang`
  (Theme Builder), or no Polylang language (a page).
