# 7 · Accessibility

**Target:** WCAG 2.1 AA, and axe clean (no serious or critical violations) on every kind of
page:
- on a desktop and a phone;
- in every language;
- including the 404 and the pages other plugins draw.

`tests/e2e/a11y.mjs` checks it. Add every new kind of page to its list.

## Rules that caught real bugs

- **Contrast on dark surfaces.**
  - A light text colour at 40 % opacity is fine at 16px and fails at 10px.
  - The alert red that reads on paper fails on a dark background. Lift it toward the text
    colour there (`color-mix(in srgb, var(--alert) 55%, var(--on-dark))`).
  - "Optional" notes dimmed with `opacity` fail too. Give them a colour instead.
- **Every landmark once:**
  - one `<main id="content">`, with a skip link;
  - `<header>` and `<footer>`;
  - nothing important outside a landmark.
- **Headings in order.** One `<h1>` per page. A native Heading's tag is chosen in the
  widget; its look comes from its class.
- **Links named by their text.** "Privacy", not "click here". An icon-only link gets a
  visually hidden label.
- **The language switcher** marks the current language with `aria-current`. Each link has
  `lang` and `hreflang`.
- **Zoom is never refused.** No `maximum-scale` and no `user-scalable=no` (WCAG 1.4.4).

## Forms

- **Every field has a `<label>`.** Groups (radios, a rating) are a `<fieldset>` with a
  `<legend>`.
- **Refusals come from the server.**
  - Use `novalidate` on the form, and keep `required` and `minlength` on the fields.
  - The attributes tell assistive technology what is expected; the browser's own bubbles
    are a control the site does not draw.
  - The refusal is a line under the field (`aria-invalid`, `aria-describedby`), and the
    first refused field gets the focus.
- **Custom controls stay real controls.** A star rating is five radios taken out of the
  flow, not hidden, so they keep the keyboard and are submitted. A checkbox drawn by CSS
  is still `<input type="checkbox">`.
- **The honeypot is off-screen, never `display: none`.** A field that is not displayed is
  not submitted, and the trap stops working.

## Motion

- **Reduced motion means none:**
  - the boot script never sets `html.motion`;
  - nothing is held back;
  - no transitions longer than a state change.
- **Nothing essential is only in motion.** A revealed element is present in the DOM and
  readable without the reveal.

## Checking

- **`npm run test:a11y`** in the plugin, after every change to a template or the CSS.
- **Once per release, by hand:** go through the page with the keyboard only (Tab, Shift+Tab,
  Enter, Space), and at 200 % zoom.
