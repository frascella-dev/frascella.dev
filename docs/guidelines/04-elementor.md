# 4 · Elementor

## Native first: the decision

Before building anything, ask **what the section is made of**:

| It is… | Build it with |
|---|---|
| headings, paragraphs, images, buttons, links | **native widgets** in a container with the theme's classes |
| a fact shown on a page (address, phone, email) | a **native widget**, the fact typed in it |
| a query (latest posts, services, a gallery of a post type) | a **plugin widget** |
| behaviour a script drives (slider, map, form, counter) | a **plugin widget** |
| another plugin's output (booking form, reviews) | a **plugin widget** that prints the theme's override of it |

**If you are adding a control that answers "how should it look", stop.** A widget's
controls answer "which content"; the look is the stylesheet's.

## Building a native section

- **The container carries the theme's classes** in *Advanced → CSS Classes*, for example
  `sheet sheet--dark on-dark`, with a container inside it carrying `measure`.
- **Each widget carries the class that dresses it**: `display` for a headline,
  `eyebrow` for a label, `prose` for a paragraph.
- **The plugin's `assets/elementor.css` makes Elementor's wrappers transparent** (block,
  full width, no padding, no gap), at the weight of one class (`:where(.elementor) .e-con`).
  - A container with no theme class is invisible.
  - A container with a class is exactly what the class says.
- **A native Heading inherits** its font, size, colour and spacing from its wrapper, so
  `display` on the widget is enough. Without that rule the `<h2>` inside is the browser's
  default size.
- **Measure and margins go through variables.** Elementor holds every widget to
  `max-width: 100%` and zero margins, at a weight no class reaches. So a theme class that
  sets a width or a margin says it twice:

  ```css
  .prose { max-width: 62ch; --frascella-max: 62ch; }
  .eyebrow { margin-bottom: 1rem; --frascella-margin: 0 0 1rem; }
  ```

  Forgetting the variable is the most common reason a native section "loses its spacing".
- **Reveal on scroll:** add `frascella-reveal` to the container whose widgets should come in
  one after the other.
- **Photographs in a frame:** Elementor's `.elementor img { height: auto }` beats a
  theme's `height: 100%`. Restate the theme's rule in the plugin's `elementor.css` at a
  higher specificity, naming the component only to stop Elementor changing it.

## A plugin widget

All the behaviour is in one base class, `Frascella_Section`; each widget is data in
`frascella_elementor_sections()`.
- **One class per widget.** Elementor rebuilds widgets with `new $class($data, $args)`, so
  a single class configured in its constructor is a TypeError. Each widget is one line:
  `class Frascella_Section_Contact extends Frascella_Section { protected const SECTION = 'contact'; }`.
- **`render()` prints the theme's template part**, with the widget's settings as `$args`.
- **Every sentence the part prints is a field** (`texts` in the spec):
  - its default is the site's words in the language of the document being edited;
  - an empty field says the site's words;
  - `{name}` and the other placeholders become the facts in the theme's `inc/content/who.php`.
- **`content_template()` is empty.** The editor always asks the server, so the part has
  one implementation. It is slower to drag, and correct.
- **`get_style_depends()` returns `[]`.** The part's CSS is in the page's bundle.
- **Control types in the spec are strings** (`'switcher'`, `'select'`), not
  `Controls_Manager` constants: the theme reads the spec on every page, Elementor loaded
  or not.

The `.claude/skills/elementor-widget` skill walks through adding one.

## Facts on a page

- **A fact a visitor reads is typed in the page**: an address, a phone number or an email in
  a section is a native widget (a Text Editor, a Button with a `tel:` or `mailto:` link).
- **The footer is the plugin's footer widget.** Its fields start from the theme's words; the
  `github` and `linkedin` fields take the profile addresses, and an empty one prints no link.
- **What machines read** (titles, the sharing card, the structured data, the placeholders)
  comes from the theme's `inc/content/who.php`, typed once. A fact that changes is changed
  there and where the pages show it.

## The Kit

- **Written from `tokens.json`** by `frascella_apply_kit()`: the global colours and fonts, so a
  native widget *can* wear them. Nothing is applied by default.
- **Google Fonts stay off.** Fonts are served by the site; fetching them from Google hands
  every visitor's IP address to a third party.
- **Re-run it** with `wp frascella kit` after changing tokens.json.

## Theme Builder (Elementor Pro)

- Declare `add_theme_support('elementor-pro')` and register the core locations.
- The theme's templates call `frascella_location('header' | 'footer' | 'single' | 'archive')`
  first and print their own markup only when nothing was printed.
- **Per language:** see [05 · Words and languages](05-words-and-languages.md#theme-builder-documents).
- **Without Pro nothing breaks.** Every Pro-only path is behind `function_exists`.

## The editor must show everything

- **Nothing is held back in the preview**, so every section is visible while editing:
  `html.editing` instead of `html.motion`.
- **Anything a script sets up is set up again** when Elementor redraws an element
  (`frontend/element_ready/global`).
- **A section that hides itself when empty** (no reviews yet, no posts yet) stays visible
  in the editor (`html:not(.editing)` in its hiding rule), so its words can still be
  edited.
- **`tests/e2e/editor-preview.mjs` checks this**, and belongs in every project.
