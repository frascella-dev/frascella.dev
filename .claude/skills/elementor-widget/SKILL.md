---
name: elementor-widget
description: Add a custom Elementor widget to the plugin for a part of the site that has data or behaviour (a query, a script, another plugin's output) — spec, class, template part, words in every language, bundle entry and tests. Use when a native section is not enough, or when changing an existing plugin widget's fields.
---

# A widget with data or behaviour

Answer in the user's language. Read `docs/guidelines/04-elementor.md` first. If the section
is only words and pictures, use `elementor-section` instead.

## 1. The spec (`wp-content/plugins/<slug>/inc/elementor/sections.php`)

Add an entry to `frascella_elementor_sections()`. The key is kebab-case, for example
`opening-hours`:

```php
'opening-hours' => [
    'title' => __('Opening hours', 'frascella'),
    'icon' => 'eicon-clock-o',
    'part' => 'opening-hours',          // themes/<slug>/template-parts/opening-hours.php
    'entry' => 'site',                  // the theme bundle a page holding it needs
    'keywords' => ['hours', 'open'],
    'controls' => [                     // "which content" only; types as strings
        'compact' => ['label' => __('Only today', 'frascella'), 'type' => 'switcher', 'return_value' => 'yes'],
    ],
    'texts' => [                        // every sentence the part prints, as a field
        'hours.heading' => [__('Heading', 'frascella'), 'h'],
        'hours.closed' => [__('«Closed»', 'frascella'), 't'],
    ],
],
```

**Text types:**

| Type | Field | Markup allowed |
|---|---|---|
| `t` | one line | none |
| `h` | one line | `<em>`, `<strong>`, `<br>` |
| `a` | a few lines | same as `h` |
| `p` | paragraphs, a blank line between them | same as `h` |

## 2. The class (`inc/elementor/widgets.php`)

One line, named after the key:

```php
class Frascella_Section_OpeningHours extends Frascella_Section
{
    protected const SECTION = 'opening-hours';
}
```

It has to be a class of its own, because Elementor rebuilds widgets with `new $class()`.

## 3. The template part (`themes/<slug>/template-parts/<part>.php`)

1. **The data comes from the plugin, guarded:**
   `function_exists('frascella_…') ? frascella_…() : []`.
2. **Every sentence comes from `frascella_s('hours.heading')`.** Never literal text in the part.
3. **Controls arrive as `$args`** (`$args['compact'] ?? ''`).
4. **Escape at output:** `frascella_e()`, and `frascella_html()` for the `h`/`a`/`p` fields.
5. **Nothing to show** (no data yet): print nothing. If the words must stay editable,
   hide the part only with `html:not(.editing)`.
6. **Write the part once.** Theme templates that show the same thing call the same part.

## 4. The words (`themes/<slug>/inc/content/*.php`)

1. Add the tree keys the `texts` name, in the default language first, then in each other
   language. `array_replace` is shallow: repeat every key of the section.
2. Use braces in closures: `"{$who['name']}"`.

## 5. Style and behaviour

1. CSS in a component file. If the part uses motion: `data-reveal`, `frascella_reveal($delay)`.
2. If it needs a script, write an `init(root)` in `assets/src/lib/`:
   - call it from the entry;
   - call it again through `onElementorRender()`, so the editor's redraws get it;
   - `npm run build`.

## 6. Test

Add to `tests/e2e/widgets.mjs`, or a new file on the same harness:
- a typed field shows on the page, placeholders filled, in its language only;
- an empty field says the site's words;
- a disallowed tag is dropped;
- the editor's field starts from the page's words.

Then run `npm test` and `npm run test:a11y`.

## Done when

- The widget is in the panel under the project's category.
- It renders the same in the editor and on the page.
- Its texts are fields in every language.
- The tests pass.
