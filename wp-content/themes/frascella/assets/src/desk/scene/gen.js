// Every procedural picture the desk paints into a 2D canvas, with no three.js and no DOM, so the
// same code runs in a worker (OffscreenCanvas), on the main thread (the fallback when workers or
// OffscreenCanvas are missing) and in Node (tools/seeds.mjs, with a mock canvas, to count the
// random numbers each one draws).
//
// The bodies are the prototype's, unchanged: the pictures must come out the same. Two rules:
// - each job draws from the shared Park–Miller sequence (rnd), as the prototype did; the scene
//   no longer paints them in one fixed order, so every job starts from the seed the prototype's
//   order gave it (seeds.js, from tools/seeds.mjs). Change a job's random draws → run the tool.
// - a job returns canvases; the caller turns them into textures.

export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

let seed = 7;
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const reseed = s => { seed = s; };
export const seedNow = () => seed;

let factory = (w, h) => new OffscreenCanvas(w, h);
export const setCanvasFactory = f => { factory = f; };
export function mkCanvas(w, h) { return factory(w, h); }

/* ---------- tileable value noise ---------- */
export function fbm(w, h, { px = 8, py = 8, oct = 5, gain = .5 } = {}) {
  const out = new Float32Array(w * h);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const Px = px << o, Py = py << o, L = new Float32Array(Px * Py); for (let i = 0; i < L.length; i++) L[i] = rnd();
    for (let y = 0; y < h; y++) {
      const fy = y / h * Py, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), r0 = (y0 % Py) * Px, r1 = ((y0 + 1) % Py) * Px;
      for (let x = 0; x < w; x++) {
        const fx = x / w * Px, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), c0 = x0 % Px, c1 = (x0 + 1) % Px;
        const a = L[r0 + c0] + (L[r0 + c1] - L[r0 + c0]) * sx, b = L[r1 + c0] + (L[r1 + c1] - L[r1 + c0]) * sx;
        out[y * w + x] += (a + (b - a) * sy) * amp;
      }
    }
    tot += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function paint(w, h, fn) {
  const c = mkCanvas(w, h), g = c.getContext('2d'), id = g.createImageData(w, h), d = id.data;
  for (let i = 0, p = 0; i < w * h; i++, p += 4) { const [r, gg, b] = fn(i, i % w, (i / w) | 0); d[p] = r; d[p + 1] = gg; d[p + 2] = b; d[p + 3] = 255; }
  g.putImageData(id, 0, 0); return c;
}

/* ---------- wool felt ---------- */
export function felt(S = 1024) {
  const base = fbm(S, S, { px: 16, py: 16, oct: 4 });
  const c = paint(S, S, i => { const v = 58 + (base[i] - .5) * 14 + (rnd() - .5) * 16; return [v, v, v + 2]; });
  const g = c.getContext('2d');
  for (let k = 0; k < 26000; k++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * TAU, l = 3 + rnd() * 10, v = rnd() < .5 ? 35 : 95;
    g.strokeStyle = `rgba(${v},${v},${v + 3},${.08 + rnd() * .18})`; g.lineWidth = .6 + rnd() * .7;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l * .5, y + Math.sin(a + 1) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}

/* ---------- micro surface: smudges and fine noise, for roughness maps (grey, linear) ---------- */
export function smudge(S = 512, { base = 225, depth = 60, blobs = 26 } = {}) {
  const n = fbm(S, S, { px: 4, py: 4, oct: 5 });
  const c = paint(S, S, i => { const v = base - Math.max(0, n[i] - .55) * depth * 2.4 + (rnd() - .5) * 10; return [v, v, v]; });
  const g = c.getContext('2d');
  for (let k = 0; k < blobs; k++) {
    const x = rnd() * S, y = rnd() * S, r = 8 + rnd() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${.05 + rnd() * .12})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    // a fingerprint: fine concentric arcs
    if (rnd() < .35) { g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = .8; for (let q = 2; q < r * .8; q += 1.6) { g.beginPath(); g.ellipse(x, y, q, q * .75, rnd(), 0, TAU * .8); g.stroke(); } }
  }
  return c;
}
export function grain(S = 256, amp = 40) { return paint(S, S, () => { const v = 128 + (rnd() - .5) * amp; return [v, v, v]; }); }

/* ---------- small patterns ---------- */
export function knurl(S = 128) {
  const c = mkCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  const step = S / 8;
  for (const dir of [1, -1]) for (let i = -8; i <= 16; i++) {
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = step * .38;
    g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step + dir * S, S); g.stroke();
  }
  return c;
}
export function braid(S = 128) {
  const c = mkCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, S, S);
  const n = 8, s = S / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const up = (x + y) % 2 === 0, gx = x * s, gy = y * s;
    const gr = up ? g.createLinearGradient(gx, gy, gx + s, gy + s) : g.createLinearGradient(gx + s, gy, gx, gy + s);
    gr.addColorStop(0, '#3a3a3a'); gr.addColorStop(.5, '#b0b0b0'); gr.addColorStop(1, '#3a3a3a');
    g.fillStyle = gr; g.beginPath(); g.ellipse(gx + s / 2, gy + s / 2, s * .62, s * .34, up ? Math.PI / 4 : -Math.PI / 4, 0, TAU); g.fill();
  }
  return c;
}
export function stripes(S = 64, n = 16, a = .5) {
  const c = mkCanvas(S, S), g = c.getContext('2d'); g.fillStyle = '#909090'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, i * S / n, S, S / n * .45); }
  return c;
}
export function drawTex(w, h, fn) { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h, c); return c; }

/* ================= the room (room.js) ================= */
// laminate: an even warm white with a fine, almost invisible stipple
export function laminate(S = 1024) {
  const lo = fbm(S, S, { px: 3, py: 3, oct: 4 }), c = mkCanvas(S, S), g = c.getContext('2d'), id = g.createImageData(S, S), b = mkCanvas(S, S), bg = b.getContext('2d'), bd = bg.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = (lo[i] - .5) * 7 + (rnd() - .5) * 5;
    id.data[i * 4] = 246 + v * .5; id.data[i * 4 + 1] = 242 + v * .5; id.data[i * 4 + 2] = 232 + v * .5; id.data[i * 4 + 3] = 255;
    const q = 128 + (rnd() - .5) * 60; bd.data[i * 4] = bd.data[i * 4 + 1] = bd.data[i * 4 + 2] = q; bd.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0); bg.putImageData(bd, 0, 0); return { col: c, bump: b };
}
// a sand-coloured carpet, wall to wall
export function carpet(S = 1024) {
  const lo = fbm(S, S, { px: 6, py: 6, oct: 4 }), hi = fbm(S, S, { px: 160, py: 160, oct: 2 });
  const cc = mkCanvas(S, S), cg = cc.getContext('2d'), cid = cg.createImageData(S, S), bc = mkCanvas(S, S), bg2 = bc.getContext('2d'), bid = bg2.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const tuft = (hi[i] - .5) * 34 + (rnd() - .5) * 26, cloud = (lo[i] - .5) * 12, v = tuft + cloud;
    cid.data[i * 4] = 236 + v * .8; cid.data[i * 4 + 1] = 229 + v * .8; cid.data[i * 4 + 2] = 214 + v * .75; cid.data[i * 4 + 3] = 255;
    const q = 128 + tuft * 2.6; bid.data[i * 4] = bid.data[i * 4 + 1] = bid.data[i * 4 + 2] = q; bid.data[i * 4 + 3] = 255;
  }
  cg.putImageData(cid, 0, 0); bg2.putImageData(bid, 0, 0);
  return { col: cc, bump: bc };
}
// warm beige plaster
export function wall(S = 1024) {
  const lo = fbm(S, S, { px: 2, py: 2, oct: 5 }), hi = fbm(S, S, { px: 48, py: 48, oct: 3 });
  const wc = mkCanvas(S, S), wg2 = wc.getContext('2d'), wid = wg2.createImageData(S, S), wb = mkCanvas(S, S), wbg = wb.getContext('2d'), wbd = wbg.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = (lo[i] - .5) * 9 + (hi[i] - .5) * 4;
    wid.data[i * 4] = 244 + v * .7; wid.data[i * 4 + 1] = 238 + v * .7; wid.data[i * 4 + 2] = 226 + v * .65; wid.data[i * 4 + 3] = 255;
    const q = 128 + (hi[i] - .5) * 150 + (lo[i] - .5) * 60; wbd.data[i * 4] = wbd.data[i * 4 + 1] = wbd.data[i * 4 + 2] = q; wbd.data[i * 4 + 3] = 255;
  }
  wg2.putImageData(wid, 0, 0); wbg.putImageData(wbd, 0, 0);
  return { col: wc, bump: wb };
}
// the fabric under a stretched canvas' paint: a plain weave (~1.1 mm threads), slubs, and the
// colour breathing with it. `col` is the painted sheet's pixels (RGBA, cw × ch), changed in place.
export function weave(col, cw, ch) {
  const bump = mkCanvas(cw, ch), bg = bump.getContext('2d'), bd = bg.createImageData(cw, ch), p = 2.9;
  const data = new Uint8ClampedArray(col);
  let q = 4711; const r = () => (q = (q * 16807) % 2147483647) / 2147483647; // own sequence: a repaint must not shift the scene's rnd()
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = x / p, j = y / p, ci = Math.floor(i), cj = Math.floor(j), fx = i - ci - .5, fy = j - cj - .5;
    const over = (ci + cj) & 1, h = over ? Math.cos(fx * Math.PI) * (1 - fy * fy * 1.6) : Math.cos(fy * Math.PI) * (1 - fx * fx * 1.6);
    const n = (r() - .5), v = h * .75 + n * .35, k = (y * cw + x) * 4;
    bd.data[k] = bd.data[k + 1] = bd.data[k + 2] = 128 + v * 70; bd.data[k + 3] = 255;
    const t = (v - .3) * 9; data[k] += t; data[k + 1] += t; data[k + 2] += t * .95;
  }
  const out = mkCanvas(cw, ch); out.getContext('2d').putImageData(new ImageData(data, cw, ch), 0, 0); bg.putImageData(bd, 0, 0);
  return { col: out, bump };
}

/* ================= the notebook (props.js) ================= */
const HAND = '"Bradley Hand", "Segoe Print", "Ink Free", Noteworthy, "Comic Sans MS", cursive';
function handText(g, text, x, y, size, color, { alpha = .86, slant = -.04, wobble = 1 } = {}) {
  g.save(); g.fillStyle = color; g.textBaseline = 'alphabetic';
  let cx = x;
  for (const ch of text) {
    const s = size * (1 + (rnd() - .5) * .08 * wobble);
    g.font = `${s.toFixed(1)}px ${HAND}`;
    const w = g.measureText(ch).width;
    g.save(); g.translate(cx, y + Math.sin(cx * .013) * 2.2 * wobble + (rnd() - .5) * 1.6 * wobble); g.rotate(slant + (rnd() - .5) * .06 * wobble);
    g.globalAlpha = alpha * (.8 + rnd() * .2); g.fillText(ch, 0, 0);
    g.restore(); cx += w * (.94 + rnd() * .05);
  }
  g.restore(); return cx;
}
// a hand-drawn line: slight bow, overshoot, varying pressure
function handLine(g, x0, y0, x1, y1, color, w = 2.4, alpha = .8) {
  const n = Math.max(4, Math.hypot(x1 - x0, y1 - y0) / 6 | 0), bow = (rnd() - .5) * .025 * Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
  g.save(); g.strokeStyle = color; g.lineCap = 'round';
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, b = Math.sin(t * Math.PI) * bow, j = (rnd() - .5) * .7;
    const x = x0 + (x1 - x0) * t + nx / l * (b + j), y = y0 + (y1 - y0) * t + ny / l * (b + j);
    g.globalAlpha = alpha * (.75 + .25 * Math.sin(t * Math.PI)); g.lineWidth = w * (.8 + .35 * Math.sin(t * Math.PI));
    g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); px = x; py = y;
  }
  g.restore();
}
function handRect(g, x, y, w, h, c, lw, a) { handLine(g, x - 3, y, x + w + 4, y + 1, c, lw, a); handLine(g, x + w, y - 3, x + w + 1, y + h + 3, c, lw, a); handLine(g, x + w + 3, y + h, x - 2, y + h + 1, c, lw, a); handLine(g, x, y + h + 2, x + 1, y - 2, c, lw, a); }
function handArrow(g, x0, y0, x1, y1, c, lw, a) {
  handLine(g, x0, y0, x1, y1, c, lw, a); const an = Math.atan2(y1 - y0, x1 - x0);
  for (const s of [-1, 1]) handLine(g, x1, y1, x1 - Math.cos(an + s * .5) * 22, y1 - Math.sin(an + s * .5) * 22, c, lw, a);
}
export const NB = { pw: 14.8, ph: 21, ct: .22, T: .5 };
export function spread() {
  const W = 2400, H = Math.round(W * NB.ph / (2 * NB.pw)), c = mkCanvas(W, H), g = c.getContext('2d');
  // paper: warm white with fibres and a slight darkening into the gutter
  g.fillStyle = '#ece6da'; g.fillRect(0, 0, W, H);
  const n = fbm(512, 368, { px: 8, py: 6, oct: 4 });
  const nc = mkCanvas(512, 368), ng = nc.getContext('2d'), id = ng.createImageData(512, 368);
  for (let i = 0; i < n.length; i++) { const v = (n[i] - .5) * 40; id.data[i * 4] = 128 + v; id.data[i * 4 + 1] = 128 + v; id.data[i * 4 + 2] = 128 + v; id.data[i * 4 + 3] = 20; }
  ng.putImageData(id, 0, 0); g.globalCompositeOperation = 'overlay'; g.drawImage(nc, 0, 0, W, H); g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 1800; i++) { g.strokeStyle = `rgba(120,110,95,${.03 + rnd() * .05})`; g.lineWidth = .6; const x = rnd() * W, y = rnd() * H, a = rnd() * TAU, l = 3 + rnd() * 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  const gut = g.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
  gut.addColorStop(0, 'rgba(90,75,55,0)'); gut.addColorStop(.5, 'rgba(90,75,55,.28)'); gut.addColorStop(1, 'rgba(90,75,55,0)'); g.fillStyle = gut; g.fillRect(W / 2 - 160, 0, 320, H);
  // dot grid, 5 mm
  const pxcm = W / (2 * NB.pw), step = pxcm * .5;
  g.fillStyle = 'rgba(120,114,104,.42)';
  for (const off of [0, W / 2]) for (let y = step * 2; y < H - step; y += step) for (let x = off + step * 1.5; x < off + W / 2 - step; x += step) { g.beginPath(); g.arc(x, y, 1.9, 0, TAU); g.fill(); }

  const INK = '#27303f', PEN = '#4c4a47';
  // left page: a to-do list
  let L = 150, y = 250, S = 60;
  handText(g, 'da fare', L, y, 70, INK, { alpha: .9 }); handLine(g, L - 6, y + 16, L + 250, y + 20, INK, 2.6, .7);
  const todo = [['chiamare lo studio', true], ['ricontrollare cache', false], ['bozza schermata app', false], ['backup prima di aggiornare', false], ['testi in inglese: rileggere', false]];
  y += 120;
  for (const [t, done] of todo) {
    handRect(g, L, y - 38, 34, 34, INK, 2.2, .75);
    if (done) { handLine(g, L + 6, y - 20, L + 15, y - 6, INK, 3, .85); handLine(g, L + 15, y - 6, L + 40, y - 46, INK, 3, .85); }
    const end = handText(g, t, L + 64, y, S, INK, { alpha: done ? .6 : .88 });
    if (done) handLine(g, L + 60, y - 18, end + 6, y - 22, INK, 2.4, .7);
    y += 104;
  }
  y += 50;
  handText(g, 'colori', L, y, 52, PEN, { alpha: .75 });
  for (const [i, col] of [['#0E0E11', 0], ['#F3EFE7', 1], ['#FF4A1C', 2]].map(([c], i) => [i, c])) {
    const x = L + 190 + i * 96;
    g.save(); g.globalAlpha = .8; g.fillStyle = col; g.fillRect(x, y - 48, 64, 52); g.restore(); handRect(g, x, y - 48, 64, 52, PEN, 1.6, .7);
  }
  handText(g, 'inchiostro · carta · vermiglio', L + 20, y + 72, 38, PEN, { alpha: .6 });
  // right page: sketch notes for an app screen
  const R = W / 2 + 150;
  handText(g, 'app · prima schermata', R, 250, 58, INK, { alpha: .88 });
  const px = R + 30, py = 330, pw = 300, ph = 560;
  g.save(); g.lineJoin = 'round'; handRect(g, px, py, pw, ph, PEN, 3, .75);
  handLine(g, px + 110, py + 22, px + 190, py + 22, PEN, 3, .6);
  handText(g, 'oggi', px + 30, py + 92, 40, PEN, { alpha: .7 });
  handRect(g, px + 26, py + 120, pw - 52, 120, PEN, 2.2, .7);
  g.save(); g.globalAlpha = .18; g.fillStyle = '#FF4A1C'; g.fillRect(px + 30, py + 124, pw - 60, 112); g.restore();
  for (let i = 0; i < 4; i++) { const yy = py + 270 + i * 64; g.beginPath(); g.strokeStyle = PEN; g.globalAlpha = .6; g.lineWidth = 2; g.arc(px + 50, yy + 20, 15, 0, TAU); g.stroke(); g.globalAlpha = 1; handLine(g, px + 80, yy + 12, px + 230 - i * 18, yy + 12, PEN, 2, .6); handLine(g, px + 80, yy + 32, px + 170, yy + 32, PEN, 1.6, .45); }
  g.restore();
  handArrow(g, px + pw + 20, py + 180, px + pw + 150, py + 150, INK, 2.4, .75);
  handText(g, 'prossima sessione', px + pw + 160, py + 150, 42, INK, { alpha: .8 });
  handText(g, 'grande, in alto', px + pw + 170, py + 200, 38, INK, { alpha: .65 });
  handArrow(g, px + pw + 20, py + 330, px + pw + 150, py + 360, INK, 2.4, .75);
  handText(g, 'lista: tocco → dettaglio', px + pw + 160, py + 372, 38, INK, { alpha: .78 });
  handText(g, '→ API  /sessioni ?', px + pw + 160, py + 470, 40, INK, { alpha: .82 });
  handLine(g, px + pw + 160, py + 486, px + pw + 470, py + 490, INK, 2, .55);
  handText(g, 'vuoto? mostrare cosa fare', R, py + ph + 110, 42, PEN, { alpha: .7 });
  handText(g, 'niente spinner lunghi', R, py + ph + 170, 42, PEN, { alpha: .7 });
  // pencil grain: break the strokes a little where the paper tooth is high
  const grainC = mkCanvas(W, H), gg = grainC.getContext('2d'), gid = gg.createImageData(W, H);
  for (let i = 0; i < gid.data.length; i += 4) { gid.data[i + 3] = rnd() < .16 ? 70 : 0; gid.data[i] = gid.data[i + 1] = 236; gid.data[i + 2] = 226; }
  gg.putImageData(gid, 0, 0); g.drawImage(grainC, 0, 0);
  return c;
}

/* ================= the mug (mug.js) ================= */
export function cork() {
  const W = 1024, H = 256, c = mkCanvas(W, H), g = c.getContext('2d'), b = mkCanvas(W, H), bg = b.getContext('2d');
  g.fillStyle = '#b48a5d'; g.fillRect(0, 0, W, H); bg.fillStyle = '#808080'; bg.fillRect(0, 0, W, H);
  const cols = ['#9c7045', '#c89d6b', '#7d5733', '#d4ae80', '#a67c4f', '#5e3f22'];
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * W, y = rnd() * H, r = .6 + Math.pow(rnd(), 3) * 3.4, col = cols[(rnd() * cols.length) | 0];
    g.fillStyle = col; g.globalAlpha = .55 + rnd() * .45; g.beginPath(); g.ellipse(x, y, r, r * (.6 + rnd() * .5), rnd() * TAU, 0, TAU); g.fill();
    const v = col === '#5e3f22' || col === '#7d5733' ? 70 : 150 + rnd() * 60; bg.fillStyle = `rgb(${v},${v},${v})`; bg.beginPath(); bg.arc(x, y, r, 0, TAU); bg.fill();
  }
  g.globalAlpha = 1;
  return { map: c, bump: b };
}
// coffee: dark, a crema ring at the wall
export function crema() {
  const c = mkCanvas(512, 512), cg = c.getContext('2d');
  const gr = cg.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, '#160904'); gr.addColorStop(.6, '#1c0d05'); gr.addColorStop(.8, '#3a1f0e'); gr.addColorStop(.92, '#6b4524'); gr.addColorStop(1, '#8a5f36');
  cg.fillStyle = gr; cg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 700; i++) { const a = rnd() * TAU, r = 200 + rnd() * 56, s = .6 + rnd() * 2.4; cg.fillStyle = `rgba(${rnd() < .5 ? '160,115,70' : '40,20,8'},${.25 + rnd() * .35})`; cg.beginPath(); cg.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, s, 0, TAU); cg.fill(); }
  return c;
}

/* ================= the turntable (turntable.js) ================= */
// the record's surface as a function of the radius (cm): which band, its roughness, its micro-height
export const R_LABEL = 5, R_RUNOUT = 6.4, R_GROOVE = 14.5, R_LEADIN = 14.95, R_EDGE = 15.24;
const GAPS = [12.9, 11.25, 9.8, 8.05];             // the silent bands between tracks
function band(r) {
  if (r < R_LABEL + .15) return 'label';
  if (r < R_RUNOUT) return 'runout';
  if (r < R_GROOVE) return GAPS.some(x => Math.abs(r - x) < .06) ? 'gap' : 'groove';
  if (r < R_LEADIN) return 'leadin';
  return 'edge';
}
// Radial maps for the vinyl, in the disc's planar UVs (the disc spans the texture): a normal map
// (micro-ripples across the grooves, steps at the band edges), roughness (G), and an anisotropy map
// whose direction runs along the grooves, so highlights stretch into concentric arcs.
export function vinyl() {
  const N = 2048, c = N / 2, cmPx = 2 * R_EDGE / N;
  // 1D profiles over the radius, sampled every 0.004 cm: height slope, roughness, anisotropy strength
  const STEP = .004, L = Math.ceil(R_EDGE / STEP) + 2, slope = new Float32Array(L), rough = new Float32Array(L), aniso = new Float32Array(L);
  let h = 0, prev = 0, ringN = 0;
  for (let i = 0; i < L; i++) {
    const r = i * STEP, b = band(r);
    if (b === 'groove') { ringN += (rnd() - .5) * .9; ringN *= .82; h = Math.sin(r / .018 * TAU) * .25 + ringN; }
    else if (b === 'leadin') h = Math.sin((r - R_GROOVE) / (R_LEADIN - R_GROOVE) * 3 * TAU) * .9;          // three wide turns
    else if (b === 'runout') h = Math.exp(-Math.pow((r - 5.55) / .02, 2)) * 1.2 + Math.exp(-Math.pow((r - 6.1) / .02, 2)) * .8;  // the lead-out spiral and the locked groove
    else if (b === 'gap') h = -.6;
    else h = 0;
    slope[i] = (h - prev) / STEP * .0022; prev = h;
    const base = { groove: .3, gap: .15, leadin: .19, runout: .13, edge: .26, label: .5 }[b];
    rough[i] = base + (b === 'groove' ? (rnd() - .5) * .1 : 0);
    aniso[i] = { groove: .85, gap: .35, leadin: .7, runout: .3, edge: .2, label: 0 }[b];
  }
  const nc = mkCanvas(N, N), rc = mkCanvas(N, N), ng = nc.getContext('2d'), rg = rc.getContext('2d');
  const nd = ng.createImageData(N, N), rd = rg.createImageData(N, N);
  for (let y = 0, p = 0; y < N; y++) for (let x = 0; x < N; x++, p += 4) {
    const du = (x + .5 - c) * cmPx, dv = -(y + .5 - c) * cmPx, r = Math.hypot(du, dv), i = Math.min(L - 1, r / STEP | 0);
    const s = slope[i], ux = r ? du / r : 0, uy = r ? dv / r : 0;
    const nx = -s * ux, ny = -s * uy, l = Math.hypot(nx, ny, 1);
    nd.data[p] = (nx / l * .5 + .5) * 255; nd.data[p + 1] = (ny / l * .5 + .5) * 255; nd.data[p + 2] = (1 / l * .5 + .5) * 255; nd.data[p + 3] = 255;
    rd.data[p] = rd.data[p + 1] = rd.data[p + 2] = clamp(rough[i], 0, 1) * 255; rd.data[p + 3] = 255;
  }
  const A = 1024, ac = mkCanvas(A, A), ag = ac.getContext('2d'), ad = ag.createImageData(A, A);
  for (let y = 0, p = 0; y < A; y++) for (let x = 0; x < A; x++, p += 4) {
    const du = x + .5 - A / 2, dv = -(y + .5 - A / 2), r = Math.hypot(du, dv) || 1, i = Math.min(L - 1, r * 2 * R_EDGE / A / STEP | 0);
    ad.data[p] = (-dv / r * .5 + .5) * 255; ad.data[p + 1] = (du / r * .5 + .5) * 255; ad.data[p + 2] = aniso[i] * 255; ad.data[p + 3] = 255;
  }
  ng.putImageData(nd, 0, 0); rg.putImageData(rd, 0, 0); ag.putImageData(ad, 0, 0);
  return { normal: nc, rough: rc, aniso: ac };
}
// cardboard: fibres and a soft cloud for the normal map, the ring the disc pressed into the board;
// roughness a touch lower where the ring rubbed, higher on the worn edges
export function board(S = 1024) {
  const hc = mkCanvas(S, S), hg = hc.getContext('2d', { willReadFrequently: true });
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  for (let i = 0; i < 16000; i++) { const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, l = 2 + rnd() * 9, v = rnd() < .5 ? 90 : 170; hg.strokeStyle = `rgba(${v},${v},${v},${.12 + rnd() * .2})`; hg.lineWidth = .6 + rnd() * .6; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); hg.stroke(); }
  const Q = S / 4, cloud = fbm(Q, Q, { px: 4, py: 4, oct: 4 });
  const hd = hg.getImageData(0, 0, S, S).data, H = new Float32Array(S * S);
  const ringR = .482 * S, cx = S * .5, cy = S * .495;
  // (the prototype wrote these two constants inside the loops: hoisted, same values)
  const ringW = (S * .006) ** 2, ringW2 = (S * .01) ** 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, d = Math.hypot(x - cx, y - cy) - ringR;
    H[i] = (hd[i * 4] - 128) / 128 * .6 + (cloud[(y >> 2) * Q + (x >> 2)] - .5) * 1.4 + Math.exp(-d * d / ringW) * .5;
  }
  const nc = mkCanvas(S, S), ng = nc.getContext('2d'), nd = ng.createImageData(S, S);
  const rc = mkCanvas(S, S), rg = rc.getContext('2d'), rd = rg.createImageData(S, S), k = 1.2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, p = i * 4, xl = H[y * S + Math.max(0, x - 1)], xr = H[y * S + Math.min(S - 1, x + 1)], yu = H[Math.max(0, y - 1) * S + x], yd = H[Math.min(S - 1, y + 1) * S + x];
    const nx = -(xr - xl) * k, ny = (yd - yu) * k, l = Math.hypot(nx, ny, 1);
    nd.data[p] = (nx / l * .5 + .5) * 255; nd.data[p + 1] = (ny / l * .5 + .5) * 255; nd.data[p + 2] = (1 / l * .5 + .5) * 255; nd.data[p + 3] = 255;
    const d = Math.hypot(x - cx, y - cy) - ringR, edge = Math.min(x, y, S - 1 - x, S - 1 - y);
    const rv = .84 + (hd[p] - 128) / 128 * .05 - Math.exp(-d * d / ringW2) * .1 + (edge < S * .006 ? .08 : 0);
    rd.data[p] = rd.data[p + 1] = rd.data[p + 2] = clamp(rv, 0, 1) * 255; rd.data[p + 3] = 255;
  }
  ng.putImageData(nd, 0, 0); rg.putImageData(rd, 0, 0);
  return { normal: nc, rough: rc };
}

/* ================= the lamp's cookie (lamp.js) ================= */
// an IES-like candela distribution as a projected cookie: hot centre, broad shoulder,
// a faint reflector ring, then a soft tail
export function cookie() {
  const S = 512, c = mkCanvas(S, S), g = c.getContext('2d'), id = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.hypot((x - S / 2) / (S / 2), (y - S / 2) / (S / 2));
    let v = Math.pow(Math.cos(Math.min(1, r) * Math.PI / 2), 1.35) * .92 + .08 * Math.exp(-r * r * 30);
    v += .06 * Math.exp(-Math.pow((r - .72) / .05, 2));
    v *= 1 - Math.pow(clamp((r - .82) / .18, 0, 1), 1.6);
    const i = (y * S + x) * 4, q = Math.round(clamp(v, 0, 1) * 255); id.data[i] = id.data[i + 1] = id.data[i + 2] = q; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0); return c;
}

/* ================= perforations (macbook.js, the router in props.js) ================= */
// speaker grilles, a hex field of holes either side of the keys
export function grille() {
  return drawTex(128, 1200, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    for (let y = 6, r = 0; y < h - 4; y += 9, r++) for (let x = 7 + (r % 2) * 5; x < w - 5; x += 10) { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
  });
}
// the router's vent band
export function vent() {
  return drawTex(2048, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    for (let y = 14, row = 0; y < h - 10; y += 17, row++) for (let x = 8 + (row % 2) * 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 4.4, 0, TAU); g.fill(); }
  });
}

/* ================= the EF sketch on the tablet (sketch.js) ================= */
// The EF monogram (viewBox 0 0 128 128)
export const EF = {
  f: 'M80.928 22.8718C96.9442 28.9201 107.794 43.4431 109.665 59.8326L98.1755 56.751C96.5179 50.0425 92.8522 43.9552 87.6777 39.3544L81.2455 63.3829L109.595 70.9865L106.805 81.4107L78.455 73.8071L68.1458 112.319L57.7316 109.526L80.928 22.8718Z',
  sq: 'M96.7848 120L86.3706 117.207L89.161 106.783L99.5752 109.576L96.7848 120Z',
  e: 'M63.2076 47.3724L52.7934 44.5792L57.3279 27.6399L40.8388 23.2174L33.5138 50.5809L60.4171 57.7966L57.6266 68.2208L31.0879 61.1029C29.4431 75.5617 37.2165 89.5095 50.2575 95.7492L47.4304 106.31C27.1331 97.6967 15.7579 75.2138 21.6269 53.2894L33.2151 10L70.5326 20.0088L63.2076 47.3724Z',
};
// its own seeded random, so the sketch is the same every time and never shifts anyone else's
function prng(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// sample an absolute M/L/C/Z path into subpaths of segments; each segment keeps its points
function segments(d, step = 1) {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+/g), subs = []; let i = 0, cur = null, p = [0, 0], start = [0, 0];
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    const c = t[i++];
    if (c === 'M') { p = [num(), num()]; start = p; cur = []; subs.push(cur); }
    else if (c === 'L' || c === 'Z') {
      const q = c === 'L' ? [num(), num()] : start;
      const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / step)), pts = [];
      for (let k = 0; k <= n; k++) pts.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]);
      if (n > 0 && (q[0] !== p[0] || q[1] !== p[1])) cur.push({ line: true, pts }); p = q;
    }
    else if (c === 'C') {
      const a = [num(), num()], b = [num(), num()], q = [num(), num()], pts = [], n = 36;
      for (let k = 0; k <= n; k++) { const s = k / n, u = 1 - s; pts.push([u * u * u * p[0] + 3 * u * u * s * a[0] + 3 * u * s * s * b[0] + s * s * s * q[0], u * u * u * p[1] + 3 * u * u * s * a[1] + 3 * u * s * s * b[1] + s * s * s * q[1]]); }
      cur.push({ line: false, pts }); p = q;
    }
  }
  return subs;
}
const joined = sub => sub.flatMap((s, i) => i ? s.pts.slice(1) : s.pts);

export function efSketch(W, H) {
  const c = mkCanvas(W, H), g = c.getContext('2d'), rnd = prng(1307);
  // the mark, 128 units, centred a little above the middle of the page
  const S = Math.min(W, H) * .52 / 128, X0 = W / 2 - 64 * S, Y0 = H * .47 - 64 * S;
  const tr = ([x, y]) => [X0 + x * S, Y0 + y * S];
  const k = S / 6;                                           // line weights are tuned at S = 6

  // a graphite line: short overlapping segments, pressure and grain varying, a slow wander
  function pencil(pts, { w = 2.2, a = .32, jit = 1.4, col = '52,52,58' } = {}) {
    let ox = (rnd() - .5) * jit, oy = (rnd() - .5) * jit;
    g.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      ox += (rnd() - .5) * jit * .3; oy += (rnd() - .5) * jit * .3; ox *= .94; oy *= .94;
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      g.strokeStyle = `rgba(${col},${a * (.55 + rnd() * .45)})`; g.lineWidth = w * k * (.7 + rnd() * .55);
      g.beginPath(); g.moveTo(x0 + ox, y0 + oy); g.lineTo(x1 + ox, y1 + oy); g.stroke();
    }
  }
  const line = (a, b, n = 60) => { const p = []; for (let i = 0; i <= n; i++) p.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return p; };
  // a straight edge drawn past its ends, the way a quick hand overshoots a corner
  const over = (pts, e) => { const [a, b] = [pts[0], pts[pts.length - 1]], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return line([a[0] - dx / l * e, a[1] - dy / l * e], [b[0] + dx / l * e, b[1] + dy / l * e], Math.max(8, Math.ceil(l / 6))); };

  // 1 · construction: cap line and baseline, the slant the strokes share, the bowl's circle
  const dx = -23.2 / 89.7, dy = 86.65 / 89.7;               // direction of the F's stem
  pencil(line(tr([-8, 10]), tr([136, 10])), { w: 1.1, a: .16, jit: .5 });
  pencil(line(tr([-8, 120]), tr([136, 120])), { w: 1.1, a: .16, jit: .5 });
  pencil(line(tr([-8, 62]), tr([136, 62])), { w: .9, a: .1, jit: .4 });
  for (const [x, y] of [[33.2, 10], [70.5, 20], [80.9, 22.9], [68.1, 112.3]]) {
    const t0 = (2 - y) / dy, t1 = (128 - y) / dy; pencil(line(tr([x + dx * t0, y + dy * t0]), tr([x + dx * t1, y + dy * t1])), { w: 1, a: .13, jit: .5 });
  }
  { const [cx, cy] = tr([64, 62]), r = 44 * S, p = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2 + .3; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } pencil(p, { w: 1, a: .12, jit: .7 }); }
  // light tick marks where the arms meet the stems (a designer checking equal weights)
  for (const [x, y] of [[57.3, 27.6], [60.4, 57.8], [81.2, 63.4], [106.8, 81.4]]) { const [px, py] = tr([x, y]); pencil(line([px - 10 * k, py - 10 * k], [px + 10 * k, py + 10 * k], 6), { w: 1, a: .22, jit: .3 }); }

  // 2 · rough passes over each letter: loose, then tighter; straight edges overshoot
  for (const key of ['e', 'f']) for (const sub of segments(EF[key])) {
    for (const s of sub) {
      const pts = s.pts.map(tr);
      if (s.line) { pencil(over(pts, 10 * k), { w: 1.7, a: .3, jit: 4 * k }); pencil(pts, { w: 2.3, a: .5, jit: 1.8 * k }); }
      else { pencil(pts, { w: 1.7, a: .28, jit: 5 * k }); pencil(pts, { w: 2.3, a: .5, jit: 2 * k }); }
    }
  }

  // 3 · part of the contour inked: the F's stem and top arm, the E's outer bowl
  const ink = (pts) => {
    g.strokeStyle = 'rgba(18,18,22,.94)'; g.lineJoin = 'round'; g.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) { g.lineWidth = 3.4 * k * (.92 + .16 * Math.sin(i * .21)); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); }
  };
  { const f = joined(segments(EF.f)[0]).map(tr); ink(f.slice(0, Math.floor(f.length * .64))); }
  { const e = segments(EF.e)[0], outer = e.filter(s => !s.line); ink(joined(e.slice(e.indexOf(outer[outer.length - 1]), -1)).map(tr)); }

  // 4 · the small square: outline, then a light vermilion hatch at 45°
  const sq = joined(segments(EF.sq)[0]).map(tr);
  pencil(sq, { w: 2, a: .5, jit: .8 * k });
  g.save(); g.beginPath(); sq.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
  const [qx, qy] = tr([93, 113]);
  for (let i = -10; i <= 10; i++) pencil(line([qx + i * 7 * k - 70 * k, qy - 70 * k], [qx + i * 7 * k + 70 * k, qy + 70 * k], 12), { w: 1.5, a: .42, jit: .6 * k, col: '222,72,36' });
  g.restore();
  return c;
}

/* ================= the jobs ================= */
// name → (args) → { key: canvas }. `cost` orders the queue (the slowest first), roughly in ms at
// 1× CPU, measured; it only matters for spreading the work across the workers.
export const JOBS = {
  smudge1: { cost: 25, run: () => ({ c: smudge(512) }) },
  smudge2: { cost: 22, run: () => ({ c: smudge(512, { base: 235, depth: 40, blobs: 14 }) }) },
  laminate: { cost: 60, run: S => laminate(S) },
  carpet: { cost: 80, run: S => carpet(S) },
  wall: { cost: 90, run: S => wall(S) },
  felt: { cost: 80, run: () => ({ c: felt(1024) }) },
  weave: { cost: 60, run: (col, cw, ch) => weave(col, cw, ch) },
  grain90: { cost: 2, run: () => ({ c: grain(256, 90) }) },
  spread: { cost: 120, run: () => ({ c: spread() }) },
  grain70: { cost: 2, run: () => ({ c: grain(256, 70) }) },
  cork: { cost: 40, run: () => cork() },
  crema: { cost: 5, run: () => ({ c: crema() }) },
  vinyl: { cost: 200, run: () => vinyl() },
  board: { cost: 300, run: () => board(1024) },
  cookie: { cost: 25, run: () => ({ c: cookie() }) },
  braid: { cost: 30, run: () => ({ c: braid(128) }) },
  grille: { cost: 8, run: () => ({ c: grille() }) },
  vent: { cost: 10, run: () => ({ c: vent() }) },
  knurl: { cost: 1, run: () => ({ c: knurl(128) }) },
  efSketch: { cost: 60, run: (w, h) => ({ c: efSketch(w, h) }) },
};
