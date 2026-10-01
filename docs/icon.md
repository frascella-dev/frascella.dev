# The decoration

frascella.dev's icon and banner. The sources are [`design/icon.svg`](../design/icon.svg) and
[`design/banner-{light,dark}.svg`](../design/). They are exported to `.github/assets/`
with `node bin/export-assets.mjs`.

## Icon

The site's own mark: the EF monogram in Paper `#F3EFE7`, its small square in Vermilion
`#FF4A1C`, on an Ink `#0E0E11` tile (512, corners 112.6). The mark's paths come from the
Sketch file `frascella.dev` (page Logo).

## Banner

2560 × 640, light and dark, shown by the README according to the reader's theme. It is the
site's "manifesto" in miniature:
- the wordmark **frascella.dev** in Gloock, cut out of the page, with the 3D desk seen
  through the letters (a render embedded in the SVG);
- the EF mark top left;
- top right, the site's lines: "piattaforme, app e integrazioni" and "dall'architettura al
  rilascio · Taranto" in Schibsted Grotesk.

The fonts and the render are embedded in the SVGs as data, so the export needs nothing else.
When the site's lines change, change them in both SVGs and run the export again.

## Files

| File | What |
|---|---|
| `design/icon.svg` | the source of the icon |
| `design/banner-light.svg`, `banner-dark.svg` | the sources of the banners |
| `.github/assets/icon-512.png` | the icon, 512 |
| `.github/assets/banner-{light,dark}.png` | the banners, 2560 × 640 |
| `bin/export-assets.mjs` | SVG → PNG, with Playwright |
