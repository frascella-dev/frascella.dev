# The decoration

Bottega's icon and banner. The sources are [`design/icon.svg`](../design/icon.svg) and
[`design/banner-{light,dark}.svg`](../design/). They are exported to `.github/assets/`
with `node bin/export-assets.mjs`.

## Brief

The other repositories in the workspace are products, and their icons say what the product
does:
- Voci is a quoted voice;
- Agenda a calendar;
- Postino an envelope.

Bottega is not a product. It is a way of working, so its image is **a decoration, not a
mark**: no letters, no symbol that could be mistaken for a brand, and nothing it has to
live up to at 20 pixels.

The metaphor is the **bottega** itself: the workshop where a craft is learnt by method, and
where different works come out made the same way. The ornament is from the same world:

- **The quincunx of the Cosmati floors.** The marble workshops of medieval Rome paved
  churches with it: a large disc in the centre, four smaller ones at the corners, joined
  by a band.
- **Every floor different, every one made with the same pattern.** That is what a
  template is.

## Construction

It sits on the family's tile:
- a 512 canvas on a 32 module, with a 64 margin;
- corners at 22 % (112.6).

The corners are drawn here as a circular radius. The sibling icons use continuous
(smoothed) corners, drawn in Sketch; the difference is under a pixel at README size.

| Part | Measure |
|---|---|
| the square band | 256 × 256, centred, 16 wide, white at 50 % |
| the diagonals | 10 wide, white at 32 %, behind the central disc |
| the corner discs | Ø 54, white at 92 % |
| the central disc | Ø 118, white, with an inlaid lozenge in the tile's gradient and a white stud |

## Colour

- **Ochre to burnt sienna**, `#e39a3b` → `#9a3412`, diagonal: the earth pigments of a
  workshop.
- **The badge colour is `b45309`**, distinct from the siblings:
  - Voci `c2412d`
  - Chiaro `0e7490`
  - Agenda `15803d`
  - Postino `4f3bd6`

## The banner

2560 × 640, in the family's layout:
- **On the left**, the tile, the name in bold lowercase, an accent bar, the tagline and a
  line of features.
- **On the right**, a floor of mosaic cells in alternating patterns: the quincunx, and a
  lozenge around a square. One cell is in colour.
- **Light and dark**, shown by the README according to the reader's theme.

## Files

| File | What |
|---|---|
| `design/icon.svg` | the source of the icon |
| `design/banner-light.svg`, `banner-dark.svg` | the sources of the banners |
| `.github/assets/icon-512.png` | the icon, 512 |
| `.github/assets/banner-{light,dark}.png` | the banners, 2560 × 640 |
| `bin/export-assets.mjs` | SVG → PNG, with Playwright |
