# 3 · The theme

`wp-content/themes/frascella` is the look: templates, CSS, motion, and the words it says by
itself. `functions.php` is a list of `require`, one file per job; `style.css` is only the
header WordPress needs.

## Assets: Vite, one bundle per kind of page

- **Entries.** `assets/src/entries/{site,doc,…}.ts` each import their own stylesheet. `inc/assets.php` reads the manifest and picks one entry per request (`frascella_entry()`), so a page downloads only what it needs.
- **CSS is enqueued as `<link>`s**, independent of the script: a page is styled whether or not the JavaScript runs.
- **The manifest is required.** If it is missing, the admin sees an error notice and the page has no styles. There is no unhashed fallback: a guess is how a site ships without a stylesheet and nobody notices.
- **`type="module"` goes only on the tag with a `src`.** `script_loader_tag` receives the inline scripts too, and turning them into modules runs them after the code that reads them.
- **A widget declares the bundle a page needs**: `'entry' => 'site'` in its spec. The theme reads that list from the spec (`frascella_entry_for_document()`) and never keeps a list of widget names of its own. Such a list goes stale the first time a widget is renamed.
- **Theme styles depend on `frascella-elementor`**, the plugin's corrections, which depend on `elementor-frontend`. Load order: Elementor → plugin → theme.

## Tokens: one source for colours and type

- `tokens.json` is the only place a colour or a font stack is written. It has three readers:
  - **Vite** writes `assets/src/css/tokens.generated.css` (`--ground`, `--text`, `--accent`, `--font-heading`, …) before every build.
  - **The plugin** writes it into Elementor's Kit (`frascella_apply_kit()`, `wp frascella kit`).
  - **`frascella_email_tokens()`** gives it to every plugin that sends email in the site's colours.
- The CSS never names a hex value.
- Three copies of a colour are three colours by the second redesign.

## Two surfaces, one control

- **Controls read variables.** A button, a field or a checkbox reads `--ctl-text`, `--ctl-rule`, `--ctl-fill`, …, set on `:root` for the light surface.
- **`.on-dark` sets them again for the dark surface.** Put that class on a dark container and every control inside flips. No variant per surface.
- **Primitives sit in `@layer components`**, so a component's own rule can still overrule them.

## Words

Every word the theme says lives in `inc/content/{lang}.php`. See
[05 · Words and languages](05-words-and-languages.md).

## Templates

- **One copy of the markup.** `frascella_document($location, $part)` tries, in order:
  1. the Theme Builder document for the location;
  2. the builder's own layout for this page;
  3. the theme's template part.
  The plugin's widget prints the same part, so the three are the same page.
- **Header and footer:**
  - `header.php` prints the Theme Builder's header if there is one, else `template-parts/nav.php`;
  - `footer.php` does the same for the footer;
  - a screen that wants no footer (a 404, a step of a form) sets `$GLOBALS['frascella_no_footer']`.
- **One `<main id="content">`** per page, with a skip link to it. The plugin puts it back on Elementor's full-width template, which skips the theme's files.
- **`page.php` covers the front page too.** A page built in Elementor prints its layout; any other page prints its title and text as a document.

## Head

`inc/head.php`, `inc/schema.php` and `inc/sitemap.php` are covered in [06 · SEO](06-seo.md).

**The boot script** is blocking on purpose, and tiny. It puts classes on `<html>` before the first paint:
- `js` when there is JavaScript;
- `motion` unless the reader asked for reduced motion;
- `editing` instead, in Elementor's preview.

## Motion

- **Held back only under `html.motion`.** With no JS, or with reduced motion, nothing is ever hidden.
- **Opting in:**
  - the theme's markup uses `data-reveal`, with the stagger as `--reveal-delay` next to the element;
  - a native container uses the class `frascella-reveal`, which brings its widgets in one after the other.
- **In Elementor's preview (`html.editing`) nothing is held back.** Elementor draws and redraws sections after load, and a reveal that already ran would leave them invisible in the editor.
- **Behaviour the editor redraws is bound again** on `frontend/element_ready/global` (`lib/editor.ts`).

## Drawing another plugin

A general-purpose plugin (booking, reviews, newsletter, FAQ…) runs the flow; the theme draws it:

- **Template overrides.** The plugin looks up `yourtheme/{plugin}/…` first. Keep every name, hidden field and `aria-*` of the plugin's own template, and change only the markup and classes. Note the template's `@version` in the override.
- **`add_theme_support('{plugin}', ['styles' => false, 'scripts' => false])`**: the theme's bundle replaces the plugin's CSS and JS.
- **Email look: `add_theme_support('{plugin}', ['email' => frascella_email_tokens()])`.** An email layout override is tables and inline styles only; the `<style>` block serves only the clients that read it.
- **Pages that are nobody's document** (a private page, a receipt, a confirmation) add themselves to `frascella_noindex`, and get their own entry in `frascella_entry`.
- **Words the plugin records verbatim** (a consent sentence) stay the plugin's. The theme must not reword what is stored as having been read.

The `.claude/skills/plugin-in-theme` skill walks through it.
