# The desk: load time and frame time

What the port changed against the approved prototype
(`.impeccable/mocks/sketches/t3-scrivania/`), measured, with the same picture: every
station of the port matches the prototype's within a mean of 0.14/255 per pixel
(`test/compare.mjs`, §4). Interactions are checked by `test/interact.mjs`.

## 1. Results

**desktop**: 1440 × 900 @1, no throttling. **mobile**:
390 × 844 @2, CPU 4× slower, DevTools "Fast 3G" (562.5 ms RTT, 1.44 Mbit/s). Both pages
served by `test/server.mjs` with brotli, as production will be. "GPU" = this Mac's GPU
(Apple M1, ANGLE on Metal), the closest to a visitor; "SwiftShader" = software WebGL, as
asked, where everything GPU-side is CPU-bound and only the proportions mean anything.

### On this Mac's GPU (the realistic case)

Port and prototype run alternately, 3 each, the same minutes (another site's Docker VM was
busy on the machine, which doubles the frame interval at rest for both; on a quiet machine the
first frames were 0.89 s against 1.91 s and the rest interval 22 ms for both).

| | desktop: prototype | desktop: port | mobile: prototype | mobile: port |
|---|---|---|---|---|
| **First scene frame** | 2061 ms | **1152 ms** | 11 823 ms | **5 771 ms** |
| LCP (the manifesto's text) | 104 ms | 92 ms | 2 484 ms | 2 688 ms ¹ |
| **Total blocking time** | 1 739 ms | **0 ms** | 5 685 ms | **184 ms** |
| Long tasks / longest | 4 / 1 205 ms | **0 / —** | 5 / 4 786 ms | 9 / **121 ms** ² |
| JS transferred (brotli) | 457 KB | **294 KB** | 457 KB | **294 KB** |
| Everything transferred | 2 283 KB | **777 KB** ³ | 2 283 KB | **777 KB** ³ |
| JS heap after GC | 9.8 MB | 9.6 MB | 9.8 MB | 9.6 MB |
| Renderer process memory (RSS) | ~390 MB | **361 MB** | | |
| Frame at rest: interval / JS per frame | 44.7 / 3.3 ms | 45.0 / 3.4 ms | 16.6 / 5.8 ms | 16.8 / 6.0 ms |
| Frame scrolling: interval / JS per frame | 49.3 / 4.4 ms | 49.4 / **1.6 ms** | 20.2 / 4.8 ms | 17.3 / **3.4 ms** |

¹ The scene's chunks are low-priority preloads (CONTRACT.md §1). The test server speaks
HTTP/1.1, where they share the 1.44 Mbit/s with the fonts the LCP text waits for: without the
preloads LCP is the prototype's (2 448 ms) but the desk arrives 1.0–1.6 s later (8 135 ms). With
the fonts preloaded, or on HTTP/2 (production), the fonts go first.
² Shorter and more of them: the work is cut into slices. One of them, ~110–150 ms, is the
page's own sheet script, not the desk's (it is in the prototype's numbers too).
³ Including what the port fetches after its first frame (photos, screenshots); before it: the
JS and the two prints (171 KB).

### SwiftShader (as asked; software WebGL, relative numbers only)

| | desktop: prototype | desktop: port | mobile: prototype | mobile: port |
|---|---|---|---|---|
| **First scene frame** | 48.9 s (40.5 s quiet) | **16.6–21.8 s** | 47.1 s | **19.8 s** |
| LCP | 0.91 s | 0.80–1.66 s | 2.45 s | 2.72 s |
| Total blocking time | 47.1 s | **15.4–20.1 s** | 41.9 s | **14.4 s** |
| Longest task | 42.1 s | **11.6–15.2 s** | 34.1 s | **12.3 s** |

Under SwiftShader the GPU process builds every pipeline in software at the first draw (ANGLE
on Vulkan), and any synchronous WebGL call waits for it; that is the remaining long task. A
visitor without a GPU never sees this: the port refuses a software context and shows the
stills.

How to read it:
- **First scene frame**: from navigation to the first frame of the desk on screen
  (`desk:ready` for the port; `window.__frames` turning 1 for the prototype).
- **TBT**: the sum, over the long tasks between FCP and 5 s after the first frame, of
  their time beyond 50 ms. The page's own sheet script (one ~110–150 ms task at 4×, not the
  desk's) is inside it for both.
- **JS / total transferred**: bytes on the wire (brotli), everything the page loaded in
  the window, including what the port fetches after its first frame (photos, screenshots).
- **Heap**: JS heap after a forced collection.
- **Frame at rest / scrolling**: mean interval between animation frames over 3 s, and the
  mean time spent in rAF callbacks per frame. At the first station the record is turning
  in view, so both pages draw every frame at rest (see §5).

## 2. What changed, by item

### Bundle
- three.js from npm (`three@0.169.0`, the prototype's revision; its copy is byte-identical
  to the package), tree-shaken: loaders, animation, audio, XR helpers and the rest of the
  unused core are gone. Only the 9 addons the scene uses.
- Three chunks, plus a worker and the stills:

  | chunk | what | min | gzip | brotli |
  |---|---|---|---|---|
  | `desk-*.js` + `desk-*.css` | the loader: veil, progress, events, worker pool | 6.4 + 1.2 KB | 3.1 + 0.4 | 2.7 + 0.4 |
  | `three-*.js` | three.js + addons (75 KB brotli of it is the rect-light LTC table) | 795 KB | 241 | 187 |
  | `main-*.js` | the scene | 158 KB | 60 | 52 |
  | `gen-*.js` | the procedural painters (shared with the worker) | 19 KB | 7.9 | 7.1 |
  | `tex.worker-*.js` | the texture worker | 19 KB | 7.9 | 7.0 |
  | `fallback-*.js` | the stills (only without WebGL) | 6.5 KB | 2.3 | 2.0 |
  | prototype, all its JS | three.js + addons + scene, unminified | 1956 KB | 488 | 386 |

- The page never waits for three.js: the loader is a 2.7 KB module; the scene chunks are
  low-priority `modulepreload`s (CONTRACT.md §1) and are *executed* only after the first
  paint, when the main thread is idle (`requestIdleCallback`, 1.2 s timeout).
- three.js is its own chunk (`manualChunks`), so a scene change does not invalidate it.

### Images (`tools/bake.mjs` → `assets/desk/`)
basisu/toktx are not installed, so WebP (`cwebp`), at the size each is seen:

| picture | prototype | port |
|---|---|---|
| record sleeve + label | 856 KB artwork, painted at load into 2048² + 1024² canvases | baked prints: 1024² (129 KB) + 512² (42 KB) |
| polaroid photos | 2000×1335 + 2×1280×853 (789 KB) | centre squares as the scene crops them, 512² (98 KB), **fetched after the first frame** |
| project screenshots | 3 × 1440 wide (135 KB), at load | same files, **fetched when the works come near** (or 2.5 s after the first frame, idle) |
| fallback stills | — | 11 stations × desktop 1920×1200 / mobile 780×1688, 12–44 KB each, only without WebGL |

Images are fetched at low priority and decoded with `createImageBitmap` off the main thread
(already flipped, so the upload is a copy).

### Procedural textures
Measured in the prototype (1× CPU, main thread): cardboard 313–875 ms, the two canvases
270–320, vinyl 200, notebook 120, felt 80, laminate 60, cork 30, braid 37, … about 1.1 s
on the M1, 4.4 s at 4×, all in one task.

- **Off the main thread**: every pixel-loop and stroke-heavy texture (smudges ×2,
  laminate, carpet, plaster, felt, notebook spread, grains, cork, coffee, vinyl ×3,
  cardboard ×2, lamp cookie, braid, grille, vent, the EF sketch) is painted by 1–4 module
  workers on `OffscreenCanvas` (`scene/gen.js`, `tex.worker.js`), started by the loader
  *before* three.js has arrived, the slowest first, and handed back as `ImageBitmap`s
  (bitmaps are closed once on the GPU).
- **Same pixels**: the prototype drew all of them from one random sequence in a fixed
  order; each job now starts from the seed it had in that order (`scene/seeds.js`, made by
  `tools/seeds.mjs`, checked against the prototype's own seed at the end of its build:
  `191849340`). The handwriting makes the count depend on the font's widths, so the table is
  measured in Chromium on this Mac (the owner's machine).
- **Split by font**: the two canvases' glyphs need Gloock, which a worker may not have: they
  are painted on the main thread (a few ms) and the per-pixel weave runs in a worker.
- **Baked**: the record's prints (font + 856 KB artwork + noise), deterministic, are images.
- **Not baked**: the noise surfaces would weigh 0.5–1 MB each as images; painting them in a
  worker costs no main-thread time and nothing on the wire.
- Without workers or `OffscreenCanvas` the same code runs on the main thread, one job per task.
- Dropped: a fibre map the prototype painted and nothing used.

### Shaders
- 60 programs, compiled **before** the first frame with `compileAsync`
  (KHR_parallel_shader_compile), one top-level object per task, as the composer will draw
  them (into its buffer, so no tone mapping; the output pass's defines set ahead), plus the
  post passes' own (AO, denoise, blend, copy, depth-of-field, finish) and the scene-wide
  overrides (AO normals, DOF depth, plain and instanced): the depth of field at s2/bio and
  the broken phone (a uniform of an already compiled program) do not compile anything.
- three's `compile(object, camera, scene)` counts an object's own lights twice (the MacBook,
  the iPad and the lamp carry rect lights): passed through a view that hides them, otherwise
  13 programs were compiled for nothing and again at the first frame.
- `checkShaderErrors` off (only with `?debug`): each check is a synchronous round trip to the
  GPU process. Each program's uniform table is read in its own slice before the first frame.
- Only the shadow map's three depth programs (internal to three) compile at the first frame.

### Geometry
- Already merged static meshes and instanced keycaps (prototype). Added: the desk's four
  identical legs and two rails share one geometry each (they were rebuilt six times);
  bounding spheres computed in slices before the first frame instead of in its frustum test.
- The tablet's three full-size scratch canvases (stroke, eraser, smudge: 12 MB each) are made
  on the first stroke, not at load.
- Nothing else changed in the geometry: segment counts are what the picture is made of.

### Render
- Kept: render on demand, adaptive DPR, AO at ½/¾ resolution, shadow map updated only when
  something moves.
- The stations and cards are measured once and again only when the layout can have moved
  (resize, page height, fonts, end of a scroll), instead of `getBoundingClientRect` on every
  element every frame.
- Paused when the tab is hidden or the canvas is off screen (IntersectionObserver).
- After the first frame, when idle: the other two lamp levels' environment maps (only the
  full lamp's is made before), the portrait sketch on a phone held upright.
- A software-only WebGL is refused (`failIfMajorPerformanceCaveat`): such a visitor gets the
  stills instead of a frame every 1–2 s.

### Progressive reveal
The manifesto is HTML and renders at once. The loader adds `.desk-veil` (the warm grey seen
through the cut letters) and `.desk-progress` (a hairline under the header, fed by
`desk:progress`); at `desk:ready` the veil fades over 1 s (instant with reduced motion) and
the desk appears through the letters. Without WebGL 2, with Save-Data, a missing hook or a
lost context, the veil shows the station stills, cross-faded at the same anchors the camera
uses, with the laptop's window on the projects (`fallback.ts`).

## 3. Remaining bottlenecks

1. **The record turning at the first station** (owner's choice, applied): when the platter and
   the arm's groove motion are the only things moving, the desk draws at ~30 fps instead of
   every vsync; the record's pose still advances every frame, and any other request (camera,
   scroll, touch, another animation) draws the next vsync. Measured on the WordPress home at
   rest, 390 × 844 (where the GPU can draw at 60 fps; `?spin60` restores the old rate to
   compare): 60 → 30 renders/s, GPU ~0.94–1.23 → 0.51–0.58 s per second, JS 163–168 → 118
   ms per second, GPU process CPU 22–23 % → 16 %; scrolling stays at 60 renders/s. At
   1440 × 900 on a busy machine the GPU only managed ~24 fps either way, so nothing changed
   there. Still a full frame 30 times a second: stopping the record after some idle seconds
   would bring it to zero.
2. **Bytes on a slow phone.** The first frame on Fast 3G is mostly transfer: 265 KB of JS
   (three.js 187 KB, a third of it the rect lights' LTC table), the two prints (171 KB), after
   the page's own fonts and CSS. A half-float LTC table, or no rect lights, would change the
   light; a 768² sleeve would show at the closest stations.
3. **Long tasks at 4× CPU**, all ≤ ~190 ms: evaluating three.js's module, merging the room's
   static meshes, the first frame (shadow map, AO normals, the first vertex buffer uploads),
   a few large canvas uploads (the tablet's screen, the editor, the keyboard legends: one
   `texImage2D` each, not divisible).
4. **The shadow map's three depth programs** still compile at the first frame (internal to
   three.js's shadow pass).
5. **SwiftShader**: see above; production shows the stills there.
6. **Words**: the drawing app's labels, its messages and the lamp's levels are Italian only
   (as in the prototype); an English page needs a words table (CONTRACT.md §6).

## 4. How to measure again

```sh
cd wp-content/themes/frascella
npm run build && node assets/src/desk/test/page.mjs --preload   # test/index.html from the manifest
node assets/src/desk/test/server.mjs &                           # brotli, as production
cd assets/src/desk/test
node measure.mjs http://127.0.0.1:8790/wp-content/themes/frascella/assets/src/desk/test/ --profile mobile --gpu
node measure.mjs "http://127.0.0.1:8790/wp-content/themes/frascella/assets/src/desk/test/?soft" --profile desktop   # SwiftShader
node compare.mjs --gpu        # the port against the prototype, pixel by pixel, at every station
node interact.mjs --gpu       # every switch, the hotspots, the tablet, the projects
```

`tools/seeds.mjs` after changing the random draws of a texture; `tools/bake.mjs` after
changing the artwork, the photos, the screenshots or the stills (needs `cwebp`).
