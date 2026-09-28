# 11 · Code style

## Comments say why

A comment is for the reader who wonders **why** a line is there:
- the bug it prevents;
- the rule it follows;
- the thing that was tried first and failed.

```php
// pll_home_url() and not home_url(): on an English page Polylang rewrites home_url() to
// `/en/`, and every alternate would point there.
```

- **Not:** `// get the home url`.
- **Docblocks at the top of a file** say what the file is for, and the one or two rules a
  change must respect.
- **Match the density of the surrounding code.** A comment on every line is noise.
- **English in code and comments.** The site's own words live in the content tree, in
  their language.

## PHP

- `declare(strict_types=1);` and `defined('ABSPATH') || exit;` in every file.
- PHP 8.2:
  - typed parameters and returns;
  - `match`;
  - arrow functions;
  - `static fn` where no `$this` is needed.
- **Prefix everything:**

  | Kind | Prefix |
  |---|---|
  | functions | `frascella_` |
  | constants | `FRASCELLA_` |
  | classes | `Frascella_` |
  | CSS classes | `frascella-` |
  | options and metas | `frascella_` / `_frascella_` |
  | text domain | `frascella` |

  `bin/init` renames them all.
- **Escape at output:**
  - `frascella_e()` / `esc_html()` for text;
  - `esc_attr()`, `esc_url()`;
  - `wp_kses()` with an explicit allow-list for the few words that may hold markup.
- **Hooks as closures** where nothing needs to remove them. A named function where
  something will.
- **One job per file**, required from a list with a comment each.
- **Guard every call across the theme/plugin line** with `function_exists`.
- **No `@` error suppression.** No `extract()`.

## CSS

- **Custom properties from tokens.json.** Never a hex value in a component.
- **One file per component**, imported by the entries that need it.
- **Class names say what a thing is** (`contact-heading`), not how it looks (`big-blue`).
- **A class that sets a width or margin also sets `--frascella-max` / `--frascella-margin`** (see
  [04](04-elementor.md)).
- **`@layer`** for primitives, so components can overrule them.

## TypeScript

- **One module per behaviour** (`reveal.ts`, `editor.ts`), each exporting an `init(root)`
  that works on a subtree, so Elementor's redraws can call it again.
- **No dependency for what the platform does** (IntersectionObserver, `<dialog>`,
  `fetch`).
- **`npm run typecheck`** must pass.

## Words

- **Plain words over jargon**, in the interface and in the notice alike.
- **No invented facts.** No lorem ipsum on a real site, and no example reviews presented
  as real.
- **ASCII in identifiers.** Any script in the words.

## Commits

- **The subject line says what changed for the site.** "Keep the same slug in every
  language", not "fix bug".
- **The body says why.**
- **One concern per commit.**
- **Never commit** credentials, dumps, licences' zips, builds or `node_modules`.
