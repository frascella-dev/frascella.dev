# The desk scene: the contract with the page

The 3D desk (`assets/src/desk/`) is drawn behind the page's "manifesto" sheet. It owns
**only** the WebGL canvas's pixels, a few elements it creates itself, and the state of the
switches listed below. Everything else (the sheet, its mask script, the words, the header,
the cue, the CSS of the page) belongs to the page.

This file is the list of hooks the scene reads. If one of them is renamed in the
templates, rename it here and in `scene/main.js` in the same commit.

## 1. Loading it

The scene is the Vite entry **`desk`** (`assets/src/entries/desk.ts`). It is tiny (no
three.js in it): it shows the loading state at once, then imports the scene chunks after
the first paint.

- **Enqueue it on the front page**, in addition to that page's own entry:
  - its script: `frascella_chunk('desk')['file']`, `type="module"`;
  - its CSS: `frascella_entry_styles('desk')` (one small file: the veil, the progress line,
    the canvas and the tablet layers; see §5);
  - recommended, the scene's chunks as **low-priority** preloads, so they download while the
    page renders (the scene shows ~1.6 s sooner on a slow phone, PERFORMANCE.md):

    ```php
    // the desk entry's dynamic imports (the scene) and, depth-first, their own imports (three.js),
    // except the stills (fallback-*.js), which only a browser without WebGL needs
    $seen = [];
    $walk = static function (string $key) use (&$walk, &$seen): void {
        $chunk = frascella_manifest()[$key] ?? null;
        if (!is_array($chunk) || isset($seen[$chunk['file']])) return;
        $seen[$chunk['file']] = true;
        foreach ($chunk['imports'] ?? [] as $k) $walk($k);
    };
    foreach (frascella_manifest()['assets/src/entries/desk.ts']['dynamicImports'] ?? [] as $key) {
        if (!str_contains($key, 'fallback')) $walk($key);
    }
    foreach (array_keys($seen) as $file) {
        printf('<link rel="modulepreload" href="%s" fetchpriority="low">' . "\n", esc_url(frascella_dist_url($file)));
    }
    ```
  - and **preload the two faces the first screen sets** (`<link rel="preload" as="font"
    type="font/woff2" crossorigin>` for Gloock and Schibsted Grotesk, latin). On HTTP/1.1 the
    low-priority JS otherwise shares the bandwidth with them and the LCP text comes ~0.2 s
    later on Fast 3G; on HTTP/2 the server sends the fonts first anyway.
- **Or** import it from the front page's own entry: `import "./desk.ts";`. Same result, one
  request fewer.
- Nothing has to be called: the entry mounts itself when `canvas#desk` is in the page.
  `window.frascellaDesk.ready` is a promise of the same outcome as the `desk:ready` event.
- Options, before the entry runs: `window.frascellaDeskOptions = { allowSoftware, forceFallback }`
  (tests only: draw on a software GPU; show the stills).

## 2. What it announces (on `document`)

| Event | `detail` | When |
|---|---|---|
| `desk:progress` | `{ progress: 0…1 }` | while the scene downloads, builds its textures and compiles its shaders |
| `desk:ready` | `{ mode: "webgl" \| "fallback" }` | the first frame is on screen (or the still pictures are, if WebGL is not available) |

And on `<html>`:

| Class | Meaning |
|---|---|
| `desk-loading` | from the entry's first line until `desk:ready` |
| `desk-ready` | after `desk:ready` |
| `desk-webgl` / `desk-fallback` | which of the two is showing |
| `ipad` | the tablet is open (the page steps aside: see §4) |
| `inspect` | a test close-up (`window.__desk.view(name)`): hide `.top`, `main`, `footer`, `.cue`, `.sheet` |

With `desk-fallback` nothing on the desk can be touched: hide `.scene-ctl`, `#snd-btn` and
`.hotspots` for that class.

**When it shows the stills instead of the 3D desk:** no WebGL 2; a WebGL that is only software
(no GPU: a frame would take seconds); `Save-Data` on; the scene failing to start (a missing
hook, a script error: logged as `[desk] showing the stills: …`); the GPU context lost later.

**Test hooks** (as in the prototype): `window.__desk` (views, switches, `info()`, `perf()`,
`programs()`), `window.__deskReady`, `?shot` (a still for screenshots), `?debug` (three.js's
shader error checks and the collision report).

## 3. The markup it reads

All ids are required unless marked optional. Without one the 3D desk does not start and the
stills show instead (console: `[desk] showing the stills: the page lacks …`).

### The canvas and the stations

- **`canvas#desk`**, `aria-hidden="true"`, the first thing in `<body>`. The scene sizes it
  to the viewport and inserts `.desk-veil` and `.desk-progress` right after it.
- **`[data-stop]`**: the camera's stations, in page order; the first must be `hero`. The
  camera moves from one to the next as each element's middle reaches the middle of the
  screen. Values: `hero`, `desk`, `s1`, `s2`, `s3`, `w0`, `w1`, `w2`, `w3`, `bio`, `contact`.
  A value may repeat (the intermezzo uses `desk` twice to hold the camera for a screen).
- **`.card[data-screen="0|1|2"]`**: a project. While a card is near the middle of the
  screen (or hovered), the laptop shows that project's screenshot. Optional
  **`data-screen-src`** on the card: the screenshot's URL (1440 × 900 WebP is the size
  that is used); without it the scene's own copies are used (0 seveninktattoo.it, 1 skeda.fit,
  2 vitrine). The screenshots are fetched when the works come within 1.5 screens, or a few
  seconds after the first frame.

### The sheet (the page's SVG mask)

- **`#scrwin`**: a `<path>` inside the sheet's `<mask>`; the scene writes its `d` and its
  fill/stroke grey (the window cut to the laptop's screen at each project).
- **`#scrrim`**: a `<path>` over the sheet; the scene writes its `d` and `stroke-opacity`.
- **`window.__lift`**: a number 0…1 the **page's** sheet script writes every time it
  repaints (0 = the sheet covers the desk, 1 = the intermezzo, the desk bare). The scene
  reads it every frame: objects can be touched and the hotspots show only above 0.9.

### The switches (keyboard and header)

| Id | What the scene does with it |
|---|---|
| `#lamp-btn` | click: next lamp level; the scene sets `aria-pressed` |
| `#lamp-state` (inside it) | the scene writes the level's word (`piena`, `media`, `spenta`) |
| `#tt-btn` | click: start/stop the record; the scene sets `aria-pressed` |
| `#snd-btn` (optional) | the header's crackle switch: same as `#tt-btn`, `aria-pressed` kept in step |
| `#plant-btn` | click: the plant trembles and sparkles |
| `#phone-btn` (optional) | click: the phone's screen breaks / goes off again |
| `#mug-btn` (optional) | click: the mug wobbles (nothing moves under reduced motion) |
| `#pad-btn` | click: open the drawing app on the tablet |
| `#pad-ui` | `hidden` container for the tablet mode's bar (the scene toggles `hidden`) |

### The intermezzo's hotspots

- **`#hotspots`** with one **`button.hs[data-hs]`** per object: `lamp`, `turntable`, `mug`,
  `ipad`, `phone`, `plant`. Decorative: `aria-hidden="true"` and `tabindex="-1"` (the keyboard
  uses the switches above); a click on one does what touching its object does. The scene
  moves each one to its object (`transform`), toggles `.vis` on each and `.on` on the
  container.

### What blocks a click from reaching the desk

A click goes to the desk only in the intermezzo and only if its target is not inside one of:
`a, button, input, textarea, label, .pane, .card, .copy, .window h2, .top, footer,
.svc-head h2, .pad-ui, .pa`. Put **`.pane`** on any text block that sits over the bare desk.

## 4. Tablet mode

While the drawing app is open the scene:
- adds `html.ipad`; sets `inert` on `.top`, `main` and `footer` (all three must exist);
- shows `#pad-ui` (`hidden = false`) and lays the app (`.pa`, its own CSS, injected once as
  `<style id="pa-css">`) on the tablet through `.pad-css` / `.pad-flat`, two layers it
  appends to `<body>`;
- blocks wheel and touch scrolling; Esc or "fatto" closes it and focus goes back.

The page's CSS for `html.ipad` (fade `.top`, `main`, `footer`, `.sheet`, `.cue` out;
`overflow: hidden` on `html, body`) stays the page's, as in the prototype.

## 5. What the desk's own CSS covers (`assets/src/desk/desk.css`)

`#desk` (fixed, full viewport, z-index 0), `.desk-veil` (fixed, z-index 0, over the canvas
and under the sheet), `.desk-progress` (fixed hairline under the header), `.pad-css`,
`.pad-flat`, `html.ipad #desk`. The page keeps `z-index: 1` for `.sheet` and `2` for
`main`/`footer`, as in the prototype.

Colours come from custom properties the page may set:

| Property | Use | Default |
|---|---|---|
| `--desk-veil` | the warm grey seen through the letters while the desk loads | `var(--meta)` |
| `--desk-progress` | the loading hairline | `var(--accent)` |
| `--desk-ground` | the canvas' own background before the first frame | `var(--dark)` |

## 6. Words

The words the desk itself says (the lamp's levels in `#lamp-state`, the drawing app's
buttons, labels, popovers and messages, its layer names, the tablet hint in
`#pad-ui .pad-hint`) come from `scene/words.js`, chosen by `<html lang>`: Italian (the
default, the prototype's words unchanged) or English (after COPY.en.md: lamp "full / dim /
off", "done", "Layer 0…3", "Draw on the tablet screen. Press "done" or Esc to go back.").

To feed them from `inc/content/*.php`, set before the desk entry runs:

```html
<script>window.frascellaDeskWords = { lampLevels: ["piena", "media", "spenta"], done: "fatto" /* … */ };</script>
```

Any key overrides that one key only; `{n}`, `{max}`, `{name}` in a value are filled in (for
example `layer: "Livello {n}"`, `layerCount: "{n} di {max}"`). The keys are the ones in
`words.js`. On an Italian page without an override the hint the page printed is left as it is.
