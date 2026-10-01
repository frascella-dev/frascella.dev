---
name: theme-builder-languages
description: Create or change Elementor Pro Theme Builder documents (header, footer, single, archive, 404) and their copies per language with Polylang. Use when building a site-wide part of the page, when a Theme Builder document shows the wrong language, or when adding a language to existing templates.
---

# Theme Builder documents, one per language

Answer in the user's language. The rules are in `docs/guidelines/05-words-and-languages.md`
and `docs/guidelines/04-elementor.md`. This skill needs Elementor Pro. Without it, the
theme's own templates are the header, the footer and the rest.

## 1. The document in the default language

1. Templates → Theme Builder → Add, choosing the type (Header, Footer, Single, Archive, 404).
2. **Build it natively** (`elementor-section`). For a part with data or behaviour (the
   navigation, a list of posts), use a plugin widget.
3. **Set its display conditions.** Only the default language's document carries them.
4. **Give it its language:** set the meta `_frascella_lang` to the default language's slug.
   `wp <slug> translate-template` does this for you in step 2.

## 2. A copy per language

```sh
bin/wp <slug> translate-template <id> en
```

This does four things:
- duplicates the layout, the type and the settings;
- leaves out the display conditions;
- sets `_frascella_lang = en` and `_frascella_translation_of = <id>`;
- prints the copy's id.

Then open the copy in Elementor and translate its words:
- A plugin widget's fields in the copy start from the English words already.
- If they do not, the copy lacks `_frascella_lang`.

## 3. Check

1. `/` shows the original and `/en/` shows the copy.
2. A word changed in the copy shows only under `/en/`.
3. The copy's preview in the editor speaks English: dates, facts, and the widgets' default
   words.
4. `npm run test:languages` in the plugin.

## Pitfalls

- **Both languages show the default document:**
  - the copy's `_frascella_translation_of` does not match the original's id; or
  - the copy has display conditions of its own. Remove them.
- **The theme's own header shows instead:** the conditions exclude the page, or the
  theme's template does not call `frascella_location('header')`.
- **A new document type is missing a copy:** the original is served as it is, in the
  default language. It is never an error, and it is always visible.
