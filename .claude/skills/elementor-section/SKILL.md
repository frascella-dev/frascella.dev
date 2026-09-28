---
name: elementor-section
description: Build or change a section of a page with Elementor's native widgets (Heading, Text Editor, Image, Button) in containers that carry the theme's classes — including the CSS the classes need. Use for any section made of words and pictures, when a section loses its spacing or width inside Elementor, or before deciding whether a custom widget is needed.
---

# A section of native widgets

Answer in the user's language. The rules are in `docs/guidelines/04-elementor.md`.

## 1. Decide

What is the section made of?
- **Words, pictures, buttons, links:** native. Continue here.
- **A fact from the settings:** native, with the plugin's dynamic tag (Fact, Contact link).
- **A query, behaviour a script drives, or another plugin's output:** stop. Use the
  `elementor-widget` skill.

## 2. The markup, as containers and classes

1. **The outer container is the section.** Its HTML tag is `section`, and its classes the
   theme's: `sheet`, `sheet sheet--dark on-dark`, …
2. **Inside it, a container `measure`** for the page's width, plus grid or column
   classes if it has columns.
3. **Each widget gets the class that dresses it** (*Advanced → CSS Classes*): `eyebrow`,
   `display`, `prose`, `prose-each`, or a component's own class.
4. **Reveal on scroll:** add `frascella-reveal` to the container whose widgets should come in
   one after the other.
5. **Never use Elementor's style controls** (colour, typography, spacing). The look is the
   stylesheet's.

**Building it from code** (a setup script, a demo): the same tree as JSON. See
`tools/demo.php` for `$box()`, `$heading()`, `$text()` and `$widget()`. Save it to
`_elementor_data` with `_elementor_edit_mode = builder`, then clear Elementor's cache.

## 3. The CSS the classes need

1. **Add or extend a component file** in `assets/src/css/components/`, imported by the
   entries that need it.
2. **A class that sets `max-width` or `margin` sets the variable too:**
   ```css
   .intro-lede { max-width: 48ch; --frascella-max: 48ch; margin-top: 1.5rem; --frascella-margin: 1.5rem 0 0; }
   ```
   Without it, Elementor holds the widget to 100 % and zero margins.
3. **Colours and fonts** from the tokens (`var(--text)`, `var(--font-heading)`), never a
   hex value.
4. **Build:** `npm run build` in the theme.

## 4. Check

1. The page at 1440 and 390 wide: screenshot it and look at it.
2. `npm run test:editor` in the plugin. Every section must be visible in the editor, and
   the preview must follow the panel.
3. `npm run test:a11y`.
4. The other language's page, if the section is on both.

## Pitfalls

- **Spacing gone inside Elementor:** a missing `--frascella-margin`.
- **A text wider than its measure:** a missing `--frascella-max`.
- **A heading at the browser's default size:** the class is on the wrong element. Put it on
  the widget, not in the text.
- **Invisible in the editor:** something held back by motion. The preview has
  `html.editing`, not `html.motion`.
- **A photograph stretched in a frame:** Elementor's `img { height: auto }`. Restate the
  rule in the plugin's `assets/elementor.css`.
