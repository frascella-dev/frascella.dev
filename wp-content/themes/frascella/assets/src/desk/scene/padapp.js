// The drawing app on the tablet's screen. Everything — the canvas, the chrome, the popovers — is
// drawn into one high-resolution canvas that is the screen's texture; input arrives as points in
// UI space (from a ray hitting the 3D glass) and is routed to buttons, sliders or the brush.
// The layout follows the usual pro drawing app arrangement (text button and four tools on the
// left of the top bar; brush, smudge, eraser, layers and colour on the right; a slim sidebar
// with size, a modify square, opacity, undo and redo) with its own icons and the EF mark.
import { TAU, clamp, mkCanvas } from './util.js';
import { words, fmt } from './words.js';

const PAPER = '#F3EFE7';
// the palette; its names are words.js colors, in the same order
const HEX = ['#0E0E11', '#1C1C21', '#8A857C', '#F3EFE7', '#FF4A1C', '#E8A33D', '#B3321F', '#F2C6A0', '#2F5D7C', '#7FB0C4', '#3E6B4F', '#FFFFFF'];
const FONT = '"Schibsted Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';

const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
function hsv2rgb(h, s, v) { const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5) * 255, f(3) * 255, f(1) * 255]; }
function rgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; if (h < 0) h += 1; } return [h, mx ? d / mx : 0, mx]; }

// `needSketch(orient)`: ask for the EF sketch drawn upright for that way of holding the tablet
// (a worker paints it, gen.js efSketch); it comes back through setSketch().
export function createPadApp({ PW = 1536, PH = 2048, onClose = () => {}, onChange = () => {}, needSketch = () => {} } = {}) {
  const COLORS = HEX.map((h, i) => [h, words().colors[i]]);
  const screen = mkCanvas(PW, PH), sg = screen.getContext('2d');
  // layers: "Livello 0" … at most four; the sketch starts on Livello 0 and is ordinary paint
  // a new layer takes the lowest free number, so the names stay within Livello 0 … Livello 3
  const MAXL = 4, layers = [];
  const newLayer = () => { let n = 0; while (layers.some(L => L.name === fmt('layer', { n }))) n++; const c = mkCanvas(PW, PH); return { name: fmt('layer', { n }), c, g: c.getContext('2d', { willReadFrequently: true }), on: true }; };
  layers.push(newLayer()); let act = 0;
  let paint = layers[0].c, cPaint = layers[0].g;
  const useLayer = i => { act = clamp(i, 0, layers.length - 1); paint = layers[act].c; cPaint = layers[act].g; };
  // the stroke, eraser and smudge buffers (12 MB each): made on the first stroke, not at load
  let strokeC, cStroke, work, cWork, snap, cSnap;
  function scratch() {
    if (strokeC) return;
    strokeC = mkCanvas(PW, PH); cStroke = strokeC.getContext('2d');
    work = mkCanvas(PW, PH); cWork = work.getContext('2d');
    snap = mkCanvas(PW, PH); cSnap = snap.getContext('2d', { willReadFrequently: true });
  }
  let touched = false;
  // the sketch is drawn upright for the way the tablet is held (until someone draws on it)
  const sketches = {};
  function makeSketch() {
    if (touched) return;
    const land = orient === 'land', s = sketches[orient], g = layers[0].g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, PW, PH);
    if (!s) { needSketch(orient); return; }
    if (land) g.setTransform(0, -1, 1, 0, 0, PH); g.drawImage(s, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- state ---------- */
  const T = { tool: 'brush', brush: 'ink', color: '#0E0E11', hsv: [0, 0, .05], eyedrop: false,
    set: { brush: { size: 24, op: 100 }, smudge: { size: 40, op: 70 }, eraser: { size: 30, op: 100 } } };
  const tset = () => T.set[T.tool];
  let orient = 'land', u = 2, W = PH, H = PW, pop = null, toast = null, drag = null, ringOn = false, dirty = true, artDirty = true;
  let pressed = null;   // a button shown pressed

  function diam() {
    const s = tset().size / 100;
    if (T.tool === 'eraser') return 4 + Math.pow(s, 1.4) * 220;
    if (T.tool === 'smudge') return 10 + Math.pow(s, 1.3) * 240;
    return { ink: 1 + Math.pow(s, 1.5) * 110, air: 12 + Math.pow(s, 1.3) * 420, pencil: 2 + Math.pow(s, 1.4) * 46 }[T.brush];
  }

  /* ---------- geometry of the UI ---------- */
  let Lx = {};
  // the screen's corner radius in UI pixels (1.05 cm on a 26.3 cm screen): nothing sits in the
  // corners; the bar floats inset by the radius, the sidebar and popovers stay inside it too
  const RAD = 82;
  function layout() {
    W = orient === 'land' ? PH : PW; H = orient === 'land' ? PW : PH;
    const pad = 16 * u, bh = 56 * u, bar = pad + bh, cy = pad + bh / 2, by = pad + 6 * u, bt = 44 * u;
    Lx = { bar, cy, barR: { x: RAD, y: pad, w: W - 2 * RAD, h: bh } };
    const g = sg; g.font = `600 ${16 * u}px ${FONT}`;
    const fw = g.measureText(words().done).width;
    Lx.done = { x: RAD + 6 * u, y: by, w: 28 * u + fw, h: bt };
    let x = Lx.done.x + Lx.done.w + 8 * u;
    Lx.left = ['actions', 'adjust', 'select', 'transform'].map(n => { const r = { n, x, y: by, w: bt, h: bt }; x += bt + 4 * u; return r; });
    x = W - RAD - 6 * u - bt;
    Lx.right = ['brush', 'smudge', 'eraser', 'layers', 'color'].reverse().map(n => { const r = { n, x, y: by, w: bt, h: bt }; x -= bt + 4 * u; return r; }).reverse();
    // sidebar: vertically centred in the band under the bar, clear of the lower corner
    const sw = 60 * u, top = bar + 16 * u, avail = H - top - RAD, fixed = 16 * u + 36 * u + 2 * bt + 4 * 8 * u;
    const sl = clamp((avail - fixed) / 2, 64 * u, 150 * u), sh = fixed + 2 * sl;
    const sx = pad, sy = top + Math.max(0, (avail - sh) / 2);
    Lx.side = { x: sx, y: sy, w: sw, h: sh };
    let y = sy + 8 * u;
    Lx.size = { x: sx + 15 * u, y, w: 30 * u, h: sl }; y += sl + 8 * u;
    Lx.mod = { x: sx + 8 * u, y, w: bt, h: 36 * u }; y += 36 * u + 8 * u;
    Lx.op = { x: sx + 15 * u, y, w: 30 * u, h: sl }; y += sl + 8 * u;
    Lx.undo = { x: sx + 8 * u, y, w: bt, h: bt }; y += bt + 8 * u;
    Lx.redo = { x: sx + 8 * u, y, w: bt, h: bt };
    // popovers hang under their buttons, right edge on the safe area
    const pw = 320 * u, px = W - RAD - pw, py = bar + 8 * u;
    Lx.pop = {
      brushes: { x: px, y: py, w: pw, h: (50 + 3 * 64 + 12) * u },
      colors: { x: px, y: py, w: pw, h: (50 + 286 + 16 + 2 * 44 + 56) * u },
      layers: { x: px, y: py, w: pw, h: (56 + MAXL * 80 + 64) * u },
    };
  }
  const inR = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  /* ---------- icons, drawn on a 24-unit grid ---------- */
  function icon(g, n, cx, cy, s, col, on) {
    g.save(); g.translate(cx - s / 2, cy - s / 2); g.scale(s / 24, s / 24);
    g.strokeStyle = on ? '#FF6A42' : col; g.fillStyle = on ? '#FF6A42' : col; g.lineWidth = 1.7; g.lineCap = 'round'; g.lineJoin = 'round';
    const P = d => { g.stroke(new Path2D(d)); };
    switch (n) {
      case 'actions': P('M15.2 4.2a4.6 4.6 0 0 0-4.9 6.1L4.4 16.2a1.9 1.9 0 0 0 2.7 2.7l5.9-5.9a4.6 4.6 0 0 0 6.1-4.9l-2.9 2.9-2.4-.4-.4-2.4z'); break;
      case 'adjust': P('M4.5 19.5L15 9'); P('M13.2 7.2l3.6 3.6'); P('M17.5 3v3M16 4.5h3M20.5 8.5v2.4M19.3 9.7h2.4M9.5 3.5v2M8.5 4.5h2'); break;
      case 'select': P('M17.5 6.5c-1.6-2-7.8-2.4-8.6.8-.9 3.7 8.3 3.3 7.6 7.4-.6 3.4-7.4 3.2-9.5 1.1'); P('M6.4 14.6l.6 1.8 1.8-.3'); break;
      case 'transform': g.beginPath(); g.moveTo(6, 4); g.lineTo(18.5, 12.3); g.lineTo(12.6, 13.4); g.lineTo(9.3, 19.3); g.closePath(); g.stroke(); break;
      case 'brush': P('M19.8 4.2c-2.8 1.3-6.8 5-8.8 7.8l1.4 1.4c2.8-2 6.5-6 7.4-9.2z'); P('M10.5 12.8c-2 0-3.3 1.4-3.3 3.2 0 1-.7 1.8-1.9 2 2 1.4 5.8 1.1 6.6-1.4.4-1.4-.1-2.6-1.4-3.8z'); break;
      case 'smudge': P('M8 19.5c-2 0-3.3-1.5-3.3-3.3V9.8c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v2.4V5.7c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v5.5V4.8c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v6.4V6.2c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v7.7c0 3.1-2.5 5.6-5.6 5.6z'); break;
      case 'eraser': P('M15.3 3.9l4.8 4.8-9.6 9.6H6l-2.2-2.2z'); P('M10.2 9l4.8 4.8'); P('M11 20.3h9'); break;
      case 'layers': g.beginPath(); g.roundRect(8.5, 3.8, 11.7, 11.7, 1.8); g.stroke(); g.globalAlpha = .9; g.beginPath(); g.roundRect(3.8, 8.5, 11.7, 11.7, 1.8); g.fill(); g.globalAlpha = 1; break;
      case 'undo': P('M8.5 6L4 10.5 8.5 15'); P('M4 10.5h10a5 5 0 0 1 0 10h-3'); break;
      case 'redo': P('M15.5 6L20 10.5 15.5 15'); P('M20 10.5H10a5 5 0 0 0 0 10h3'); break;
      case 'eye': P('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z'); g.beginPath(); g.arc(12, 12, 3, 0, TAU); g.stroke(); break;
      case 'check': P('M5 12.5l4.5 4.5L19 7.5'); break;
    }
    g.restore();
  }

  /* ---------- brushes ---------- */
  let soft = mkCanvas(128, 128);
  function makeSoft() {
    const c = mkCanvas(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const [R, G, B] = hex2rgb(T.color);
    r.addColorStop(0, `rgba(${R},${G},${B},1)`); r.addColorStop(.45, `rgba(${R},${G},${B},.45)`); r.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); soft = c;
  }
  function dab(g, kind, x, y, d, a) {
    if (kind === 'ink' || kind === 'hard') { g.globalAlpha = 1; g.beginPath(); g.arc(x, y, Math.max(.35, d / 2), 0, TAU); g.fill(); }
    else if (kind === 'air') { g.globalAlpha = a; g.drawImage(soft, x - d / 2, y - d / 2, d, d); }
    else if (kind === 'pencil') {
      const n = Math.min(260, 3 + d * d * .22), gr = Math.max(1.3, d * .09);
      for (let i = 0; i < n; i++) { const an = Math.random() * TAU, r = Math.sqrt(Math.random()) * d / 2; g.globalAlpha = a * (.12 + Math.random() * .5); g.fillRect(x + Math.cos(an) * r, y + Math.sin(an) * r, gr, gr); }
    }
  }
  const softMask = mkCanvas(128, 128); { const g = softMask.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, '#000'); r.addColorStop(.5, 'rgba(0,0,0,.7)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  const smTmp = mkCanvas(512, 512), cSmTmp = smTmp.getContext('2d');
  let smPrev = null;
  function smudgeDab(x, y, d, a) {
    if (!smPrev) { smPrev = { x, y }; return; }
    const r = Math.ceil(d / 2), s = Math.min(512, r * 2);
    cSmTmp.globalCompositeOperation = 'copy'; cSmTmp.globalAlpha = 1;
    cSmTmp.drawImage(paint, smPrev.x - r, smPrev.y - r, r * 2, r * 2, 0, 0, s, s);
    cSmTmp.globalCompositeOperation = 'destination-in'; cSmTmp.drawImage(softMask, 0, 0, s, s);
    cPaint.globalAlpha = .6 * a; cPaint.drawImage(smTmp, 0, 0, s, s, x - r, y - r, r * 2, r * 2); cPaint.globalAlpha = 1;
    smPrev.x += (x - smPrev.x) * .75; smPrev.y += (y - smPrev.y) * .75;
  }
  let carry = 0;
  function walk(a, c, b, wa, wb, aa, ab, place) {
    const len = Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y), n = Math.max(1, Math.ceil(len));
    let px = a.x, py = a.y;
    for (let i = 1; i <= n; i++) {
      const t = i / n, v = 1 - t, x = v * v * a.x + 2 * v * t * c.x + t * t * b.x, y = v * v * a.y + 2 * v * t * c.y + t * t * b.y;
      carry += Math.hypot(x - px, y - py); px = x; py = y;
      const w = wa + (wb - wa) * t, al = aa + (ab - aa) * t, sp = Math.max(.5, w * place.sp);
      while (carry >= sp) { carry -= sp; place.fn(x, y, w, al); }
    }
  }
  let bbox = null;
  const grow = (x, y, r) => { r += 3; if (!bbox) bbox = { x0: x - r, y0: y - r, x1: x + r, y1: y + r }; else { bbox.x0 = Math.min(bbox.x0, x - r); bbox.y0 = Math.min(bbox.y0, y - r); bbox.x1 = Math.max(bbox.x1, x + r); bbox.y1 = Math.max(bbox.y1, y + r); } };
  const clampBox = b => { const x = Math.max(0, Math.floor(b.x0)), y = Math.max(0, Math.floor(b.y0)), x1 = Math.min(PW, Math.ceil(b.x1)), y1 = Math.min(PH, Math.ceil(b.y1)); return x1 > x && y1 > y ? { x, y, w: x1 - x, h: y1 - y } : null; };
  function placer() {
    const kind = T.tool === 'eraser' ? 'hard' : T.tool === 'smudge' ? 'smudge' : T.brush;
    const sp = { hard: .1, ink: .08, air: .12, pencil: .3, smudge: .12 }[kind];
    return { sp, fn: (x, y, w, a) => { grow(x, y, w / 2); kind === 'smudge' ? smudgeDab(x, y, w, tset().op / 100) : dab(cStroke, kind, x, y, w, a); } };
  }
  let drawing = false, pts = [], mid0 = null, lastW = 0, lastA = 1, vel = 0, place = null, ptype = 'mouse', cssPerPx = .5;
  function widthFor(q, prev) {
    const base = diam(); let f = 1;
    if (ptype === 'pen' && q.p > 0) f = (T.tool === 'brush' && T.brush === 'air') ? .5 + .5 * q.p : .12 + .88 * Math.pow(q.p, 1.25);
    else if (T.tool === 'brush' && T.brush === 'ink' && prev) {
      const v = Math.hypot(q.x - prev.x, q.y - prev.y) * cssPerPx / Math.max(4, q.t - prev.t); vel += (v - vel) * .3;
      f = Math.min(1.2, Math.max(.35, 1.22 - vel * .42));
    }
    return base * f;
  }
  const alphaFor = q => T.tool === 'brush' && T.brush === 'air' ? (ptype === 'pen' && q.p > 0 ? .02 + .12 * q.p : .07) : T.tool === 'brush' && T.brush === 'pencil' ? (ptype === 'pen' && q.p > 0 ? .3 + .7 * q.p : .8) : 1;
  // UI space → physical screen pixels
  const toPhys = (x, y) => orient === 'land' ? { x: y, y: PH - x } : { x, y };

  function strokeStart(q) {
    scratch(); drawing = true; bbox = null; carry = 0; vel = 0; smPrev = null; place = placer();
    cStroke.clearRect(0, 0, PW, PH); cStroke.fillStyle = T.color; cStroke.globalCompositeOperation = 'source-over';
    if (T.tool === 'smudge') { cSnap.clearRect(0, 0, PW, PH); cSnap.drawImage(paint, 0, 0); }
    pts = [q]; mid0 = q;
    lastW = widthFor(q, null) * (T.tool === 'brush' && T.brush === 'ink' && ptype !== 'pen' ? .45 : 1); lastA = alphaFor(q);
    if (T.tool !== 'smudge') { grow(q.x, q.y, lastW / 2); place.fn(q.x, q.y, lastW, lastA); } else smudgeDab(q.x, q.y, lastW, 1);
    dirty = true;
  }
  function strokeMove(q) {
    const last = pts[pts.length - 1];
    if (Math.hypot(q.x - last.x, q.y - last.y) < 1.2) return;
    pts.push(q);
    const w = lastW + (widthFor(q, last) - lastW) * .35, a = lastA + (alphaFor(q) - lastA) * .4;
    const m = { x: (last.x + q.x) / 2, y: (last.y + q.y) / 2 };
    walk(mid0, last, m, lastW, w, lastA, a, place);
    mid0 = m; lastW = w; lastA = a; dirty = true;
  }
  function strokeEnd() {
    const last = pts[pts.length - 1];
    const endW = T.tool === 'brush' && T.brush === 'ink' && ptype !== 'pen' ? lastW * .4 : lastW;
    if (pts.length > 1) walk(mid0, last, last, lastW, endW, lastA, lastA, place);
    commit(); drawing = false; dirty = true; strokeCount++; onChange();
  }
  const hist = [], redoS = []; let strokeCount = 0;
  function commit() {
    const b = bbox && clampBox(bbox); if (!b) return;
    let before;
    if (T.tool === 'smudge') before = cSnap.getImageData(b.x, b.y, b.w, b.h);
    else {
      before = cPaint.getImageData(b.x, b.y, b.w, b.h);
      cPaint.save(); cPaint.globalAlpha = tset().op / 100; cPaint.globalCompositeOperation = T.tool === 'eraser' ? 'destination-out' : 'source-over';
      cPaint.drawImage(strokeC, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h); cPaint.restore();
      cStroke.clearRect(b.x, b.y, b.w, b.h);
    }
    hist.push({ ...b, g: cPaint, before, after: cPaint.getImageData(b.x, b.y, b.w, b.h) }); if (hist.length > 40) hist.shift(); touched = true;
    redoS.length = 0;
  }
  function undo() { const h = hist.pop(); if (!h) return; h.g.putImageData(h.before, h.x, h.y); redoS.push(h); dirty = true; artDirty = true; onChange(); }
  function redo() { const h = redoS.pop(); if (!h) return; if (h.after) h.g.putImageData(h.after, h.x, h.y); else h.g.clearRect(h.x, h.y, h.w, h.h); hist.push(h); dirty = true; artDirty = true; onChange(); }
  function clearLayer() { touched = true; hist.push({ x: 0, y: 0, w: PW, h: PH, g: cPaint, before: cPaint.getImageData(0, 0, PW, PH), after: null }); if (hist.length > 40) hist.shift(); cPaint.clearRect(0, 0, PW, PH); redoS.length = 0; dirty = true; onChange(); }

  function setColor(hex, keepHsv) { T.color = hex.toUpperCase(); if (!keepHsv) T.hsv = rgb2hsv(...hex2rgb(T.color)); makeSoft(); if (T.tool !== 'brush') T.tool = 'brush'; dirty = true; }
  setColor('#0E0E11');

  // brush previews for the library, drawn once with the brushes themselves
  const previews = {};
  for (const kind of ['ink', 'air', 'pencil']) {
    const c = mkCanvas(260, 68), g = c.getContext('2d'); g.fillStyle = '#ECEBE7';
    const save = T.color; T.color = '#ECEBE7'; makeSoft();
    let prev = null;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, x = 14 + t * 232, y = 34 + Math.sin(t * TAU) * 16, w = { ink: 2 + 7 * Math.sin(t * Math.PI), air: 26, pencil: 5 }[kind];
      if (prev) { const n = Math.ceil(Math.hypot(x - prev.x, y - prev.y) / Math.max(.6, w * .15)); for (let k = 1; k <= n; k++) dab(g, kind, prev.x + (x - prev.x) * k / n, prev.y + (y - prev.y) * k / n, w, kind === 'air' ? .06 : .9); }
      prev = { x, y };
    }
    g.globalAlpha = 1; T.color = save; makeSoft(); previews[kind] = c;
  }

  /* ---------- drawing the screen ---------- */
  function composeArt(g) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
    layers.forEach((L, i) => {
      if (!L.on) return;
      if (i === act && drawing && T.tool === 'eraser') {
        cWork.globalCompositeOperation = 'copy'; cWork.globalAlpha = 1; cWork.drawImage(paint, 0, 0);
        cWork.globalCompositeOperation = 'destination-out'; cWork.globalAlpha = tset().op / 100; cWork.drawImage(strokeC, 0, 0);
        cWork.globalCompositeOperation = 'source-over'; cWork.globalAlpha = 1; g.drawImage(work, 0, 0);
      } else {
        g.drawImage(L.c, 0, 0);
        if (i === act && drawing && T.tool === 'brush') { g.globalAlpha = tset().op / 100; g.drawImage(strokeC, 0, 0); g.globalAlpha = 1; }
      }
    });
  }
  function panel(g, r, rad = 14 * u, fill = 'rgba(34,34,38,.97)') {
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24 * u; g.shadowOffsetY = 6 * u;
    g.fillStyle = fill; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, rad); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = u; g.beginPath(); g.roundRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1, rad); g.stroke();
  }
  function vslider(g, r, v, label) {
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, r.w / 2); g.fill();
    const fh = (r.h - r.w) * v + r.w;
    g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.roundRect(r.x, r.y + r.h - fh, r.w, fh, r.w / 2); g.fill();
    const ty = r.y + r.h - fh + 3 * u;
    g.fillStyle = '#F3EFE7'; g.beginPath(); g.roundRect(r.x + 3 * u, ty, r.w - 6 * u, 9 * u, 4.5 * u); g.fill();
    if (drag && drag.kind === label) { g.fillStyle = 'rgba(20,20,23,.92)'; g.beginPath(); g.roundRect(r.x + r.w + 12 * u, ty - 10 * u, 62 * u, 30 * u, 8 * u); g.fill(); g.fillStyle = '#F3EFE7'; g.font = `600 ${14 * u}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(v * 99 + 1) + '%', r.x + r.w + 43 * u, ty + 5 * u); g.textAlign = 'left'; }
  }
  function drawUI(g) {
    const { bar, cy } = Lx;
    // top bar
    panel(g, Lx.barR, 16 * u, 'rgba(26,26,29,.9)');
    const d = Lx.done;
    if (pressed === 'done') { g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.roundRect(d.x, d.y, d.w, d.h, 10 * u); g.fill(); }
    g.fillStyle = '#F3EFE7'; g.font = `600 ${16 * u}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(words().done, d.x + 14 * u, cy + u);
    for (const r of Lx.left) { if (pressed === r.n) { g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 10 * u); g.fill(); } icon(g, r.n, r.x + r.w / 2, cy, 24 * u, '#E6E3DD', false); }
    for (const r of Lx.right) {
      const on = (r.n === T.tool) || (r.n === 'brush' && pop === 'brushes') || (r.n === 'layers' && pop === 'layers');
      if (r.n === 'color') {
        g.fillStyle = T.color; g.beginPath(); g.arc(r.x + r.w / 2, cy, 13 * u, 0, TAU); g.fill();
        g.strokeStyle = '#F3EFE7'; g.lineWidth = 2.2 * u; g.beginPath(); g.arc(r.x + r.w / 2, cy, 14.5 * u, 0, TAU); g.stroke();
      } else icon(g, r.n, r.x + r.w / 2, cy, 24 * u, '#E6E3DD', on && r.n !== 'layers' || (r.n === 'layers' && pop === 'layers'));
    }
    // sidebar
    panel(g, Lx.side, 16 * u, 'rgba(36,36,40,.9)');
    vslider(g, Lx.size, (tset().size - 1) / 99, 'size');
    const m = Lx.mod;
    g.strokeStyle = T.eyedrop ? '#FF6A42' : 'rgba(255,255,255,.55)'; g.lineWidth = 1.6 * u; g.beginPath(); g.roundRect(m.x + m.w / 2 - 11 * u, m.y + m.h / 2 - 11 * u, 22 * u, 22 * u, 5 * u); g.stroke();
    if (T.eyedrop) { g.fillStyle = 'rgba(255,106,66,.25)'; g.fill(); }
    vslider(g, Lx.op, (tset().op - 1) / 99, 'op');
    g.globalAlpha = hist.length ? 1 : .35; icon(g, 'undo', Lx.undo.x + Lx.undo.w / 2, Lx.undo.y + Lx.undo.h / 2, 24 * u, '#E6E3DD');
    g.globalAlpha = redoS.length ? 1 : .35; icon(g, 'redo', Lx.redo.x + Lx.redo.w / 2, Lx.redo.y + Lx.redo.h / 2, 24 * u, '#E6E3DD'); g.globalAlpha = 1;
    // brush size preview
    if (ringOn) { const c = toUiCentre(); const r = diam() / 2; g.strokeStyle = 'rgba(14,14,17,.8)'; g.lineWidth = 2 * u; g.beginPath(); g.arc(c.x, c.y, r, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(243,239,231,.9)'; g.lineWidth = u; g.beginPath(); g.arc(c.x, c.y, r + 1.5 * u, 0, TAU); g.stroke(); }
    // popovers
    if (pop) drawPop(g, pop);
    if (toast && performance.now() < toast.until) {
      g.font = `500 ${14 * u}px ${FONT}`; const tw = g.measureText(toast.text).width + 32 * u;
      g.fillStyle = 'rgba(24,24,27,.9)'; g.beginPath(); g.roundRect(W / 2 - tw / 2, bar + 16 * u, tw, 36 * u, 18 * u); g.fill();
      g.fillStyle = '#E6E3DD'; g.textAlign = 'center'; g.fillText(toast.text, W / 2, bar + 34 * u); g.textAlign = 'left';
    }
  }
  const toUiCentre = () => ({ x: W / 2 + 40 * u, y: H / 2 + 10 * u });
  function popHead(g, r, title) {
    g.fillStyle = '#8A857C'; g.font = `700 ${12 * u}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.save(); g.letterSpacing = `${1.5 * u}px`; g.fillText(title.toUpperCase(), r.x + 18 * u, r.y + 26 * u); g.restore();
  }
  function discGeom(r) { const cx = r.x + r.w / 2, cy = r.y + 50 * u + 143 * u; return { cx, cy, R: 138 * u, r0: 108 * u, sq: 136 * u }; }
  function drawPop(g, n) {
    const r = Lx.pop[n]; panel(g, r); popHead(g, r, words()[{ brushes: 'brushes', colors: 'color', layers: 'layers' }[n]]);
    // the little arrow towards its button
    const btn = Lx.right.find(b => b.n === ({ brushes: 'brush', colors: 'color', layers: 'layers' }[n]));
    g.fillStyle = 'rgba(34,34,38,.97)'; g.beginPath(); g.moveTo(btn.x + btn.w / 2 - 9 * u, r.y); g.lineTo(btn.x + btn.w / 2, r.y - 9 * u); g.lineTo(btn.x + btn.w / 2 + 9 * u, r.y); g.fill();
    if (n === 'brushes') {
      ['ink', 'air', 'pencil'].map(k => [k, words()[k]]).forEach(([k, name], i) => {
        const y = r.y + 50 * u + i * 64 * u, on = T.brush === k;
        if (on) { g.fillStyle = 'rgba(255,74,28,.18)'; g.beginPath(); g.roundRect(r.x + 10 * u, y, r.w - 20 * u, 56 * u, 10 * u); g.fill(); }
        g.fillStyle = on ? '#FFFFFF' : '#E8E6E1'; g.font = `500 ${15 * u}px ${FONT}`; g.fillText(name, r.x + 22 * u, y + 28 * u);
        g.drawImage(previews[k], r.x + r.w - 150 * u, y + 11 * u, 130 * u, 34 * u);
      });
    } else if (n === 'colors') {
      const { cx, cy, R, r0, sq } = discGeom(r);
      // hue ring
      const cg = g.createConicGradient(-Math.PI / 2, cx, cy);
      for (let i = 0; i <= 12; i++) { const [a, b, c] = hsv2rgb(i / 12 % 1, 1, 1); cg.addColorStop(i / 12, `rgb(${a | 0},${b | 0},${c | 0})`); }
      g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.arc(cx, cy, r0, 0, TAU, true); g.fill();
      // saturation / value square
      const x0 = cx - sq / 2, y0 = cy - sq / 2, [hr, hg, hb] = hsv2rgb(T.hsv[0], 1, 1);
      g.fillStyle = `rgb(${hr | 0},${hg | 0},${hb | 0})`; g.fillRect(x0, y0, sq, sq);
      let lg = g.createLinearGradient(x0, 0, x0 + sq, 0); lg.addColorStop(0, '#fff'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(x0, y0, sq, sq);
      lg = g.createLinearGradient(0, y0, 0, y0 + sq); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, '#000'); g.fillStyle = lg; g.fillRect(x0, y0, sq, sq);
      // markers
      const ha = T.hsv[0] * TAU - Math.PI / 2, hm = (R + r0) / 2;
      g.lineWidth = 3 * u; g.strokeStyle = '#fff'; g.beginPath(); g.arc(cx + Math.cos(ha) * hm, cy + Math.sin(ha) * hm, 11 * u, 0, TAU); g.stroke();
      g.beginPath(); g.arc(x0 + T.hsv[1] * sq, y0 + (1 - T.hsv[2]) * sq, 9 * u, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = u; g.stroke();
      // palette
      const py = cy + R + 18 * u, cw = (r.w - 36 * u) / 6;
      COLORS.forEach(([hex], i) => {
        const x = r.x + 18 * u + (i % 6) * cw + cw / 2, y = py + (i / 6 | 0) * 44 * u + 18 * u;
        g.fillStyle = hex; g.beginPath(); g.arc(x, y, 15 * u, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = u; g.stroke();
        if (hex === T.color) { g.strokeStyle = '#F3EFE7'; g.lineWidth = 2.5 * u; g.beginPath(); g.arc(x, y, 19 * u, 0, TAU); g.stroke(); }
      });
      const ny = py + 2 * 44 * u + 22 * u, name = (COLORS.find(c => c[0] === T.color) || [0, words().custom])[1];
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(r.x + 18 * u, ny - 12 * u, r.w - 36 * u, u);
      g.fillStyle = T.color; g.beginPath(); g.arc(r.x + 32 * u, ny + 12 * u, 11 * u, 0, TAU); g.fill();
      g.fillStyle = '#8A857C'; g.font = `500 ${13 * u}px ${FONT}`; g.fillText(`${name} · ${T.color}`, r.x + 52 * u, ny + 13 * u);
    } else if (n === 'layers') {
      layers.slice().reverse().forEach((L, k) => {
        const y = r.y + 56 * u + k * 80 * u, isAct = layers.indexOf(L) === act, land = orient === 'land';
        if (isAct) { g.fillStyle = 'rgba(255,74,28,.16)'; g.beginPath(); g.roundRect(r.x + 8 * u, y, r.w - 16 * u, 72 * u, 12 * u); g.fill(); }
        const tw = (land ? 64 : 48) * u, th = (land ? 48 : 64) * u, tx = r.x + 16 * u, ty = y + (72 * u - th) / 2;
        g.fillStyle = PAPER; g.fillRect(tx, ty, tw, th);
        g.save(); g.globalAlpha = L.on ? 1 : .35;
        if (land) { const k2 = tw / PH; g.transform(0, k2, -k2, 0, tx + tw, ty); g.drawImage(L.c, 0, 0); } else g.drawImage(L.c, tx, ty, tw, th);
        g.restore();
        g.fillStyle = '#F3EFE7'; g.font = `600 ${15 * u}px ${FONT}`; g.fillText(L.name, tx + tw + 16 * u, y + 36 * u);
      });
      const by = r.y + 56 * u + MAXL * 80 * u + 8 * u;
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = u; g.beginPath(); g.roundRect(r.x + 16 * u, by, r.w - 32 * u, 44 * u, 12 * u); g.stroke();
      g.fillStyle = '#F0EEE9'; g.font = `600 ${14 * u}px ${FONT}`; g.textAlign = 'center'; g.fillText(words().clearLayer, r.x + r.w / 2, by + 22 * u); g.textAlign = 'left';
    }
  }
  function render() {
    composeArt(sg);
    if (orient === 'land') sg.setTransform(0, -1, 1, 0, 0, PH); else sg.setTransform(1, 0, 0, 1, 0, 0);
    drawUI(sg);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    dirty = false;
  }

  /* ---------- input (UI-space points) ---------- */
  function sliderSet(kind, y) { const r = Lx[kind]; tset()[kind === 'size' ? 'size' : 'op'] = clamp(1 + 99 * (r.y + r.h - r.w / 2 - y) / (r.h - r.w), 1, 100); }
  function colorAt(r, x, y, start) {
    const { cx, cy, R, r0, sq } = discGeom(r), dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy);
    const mode = start ? (dist >= r0 - 4 * u && dist <= R + 6 * u ? 'hue' : (Math.abs(dx) <= sq / 2 + 4 * u && Math.abs(dy) <= sq / 2 + 4 * u ? 'sv' : null)) : drag.mode;
    if (mode === 'hue') { let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += TAU; T.hsv[0] = a / TAU; }
    else if (mode === 'sv') { T.hsv[1] = clamp((dx + sq / 2) / sq, 0, 1); T.hsv[2] = clamp(1 - (dy + sq / 2) / sq, 0, 1); }
    if (mode) { setColor(rgb2hex(...hsv2rgb(...T.hsv)), true); return mode; }
    // palette
    const py = cy + R + 18 * u, cw = (r.w - 36 * u) / 6;
    for (let i = 0; i < COLORS.length; i++) {
      const sx = r.x + 18 * u + (i % 6) * cw + cw / 2, sy = py + (i / 6 | 0) * 44 * u + 18 * u;
      if (Math.hypot(x - sx, y - sy) < 20 * u) { setColor(COLORS[i][0]); return 'swatch'; }
    }
    return null;
  }
  function tap(name) { pressed = name; setTimeout(() => { pressed = null; dirty = true; }, 160); }
  function down(x, y, { pressure = 0, type = 'mouse', t = performance.now() } = {}) {
    ptype = type; dirty = true;
    if (pop) {
      const r = Lx.pop[pop];
      if (inR(r, x, y)) {
        if (pop === 'colors') { const m = colorAt(r, x, y, true); if (m === 'hue' || m === 'sv') drag = { kind: 'color', mode: m }; }
        else if (pop === 'brushes') { const i = Math.floor((y - r.y - 50 * u) / (64 * u)); if (i >= 0 && i < 3) { T.brush = ['ink', 'air', 'pencil'][i]; T.tool = 'brush'; pop = null; } }
        else if (pop === 'layers') {
          clearLayer();
        }
        return true;
      }
      const onBar = y < Lx.bar; pop = null; if (!onBar) return true;
    }
    if (y < Lx.bar) {
      if (inR(Lx.done, x, y)) { tap('done'); setTimeout(onClose, 120); return true; }
      for (const r of Lx.left) if (inR(r, x, y)) { tap(r.n); toast = { text: fmt('notInDraft', { name: words()[r.n] }), until: performance.now() + 1500 }; setTimeout(() => { dirty = true; }, 1550); return true; }
      for (const r of Lx.right) if (inR(r, x, y)) {
        if (r.n === 'color') pop = 'colors';
        else if (r.n === 'layers') pop = 'layers';
        else if (r.n === 'brush') { if (T.tool === 'brush') pop = 'brushes'; T.tool = 'brush'; }
        else T.tool = r.n;
        T.eyedrop = false; return true;
      }
      return true;
    }
    if (inR(Lx.side, x, y)) {
      if (inR(Lx.size, x, y + 0)) { drag = { kind: 'size' }; ringOn = true; sliderSet('size', y); }
      else if (inR(Lx.op, x, y)) { drag = { kind: 'op' }; sliderSet('op', y); }
      else if (inR(Lx.mod, x, y)) { T.eyedrop = !T.eyedrop; }
      else if (inR(Lx.undo, x, y)) undo();
      else if (inR(Lx.redo, x, y)) redo();
      return true;
    }
    const p = toPhys(x, y);
    if (T.eyedrop) {
      const d = cPaint.getImageData(clamp(p.x | 0, 0, PW - 1), clamp(p.y | 0, 0, PH - 1), 1, 1).data;
      setColor(d[3] > 20 ? rgb2hex(d[0], d[1], d[2]) : PAPER); T.eyedrop = false; return true;
    }
    drag = { kind: 'stroke' }; strokeStart({ x: p.x, y: p.y, p: pressure, t });
    return true;
  }
  function move(x, y, { pressure = 0, t = performance.now() } = {}) {
    if (!drag) return;
    if (drag.kind === 'stroke') { const p = toPhys(x, y); strokeMove({ x: p.x, y: p.y, p: pressure, t }); }
    else if (drag.kind === 'size' || drag.kind === 'op') { sliderSet(drag.kind, y); dirty = true; }
    else if (drag.kind === 'color') { colorAt(Lx.pop.colors, x, y, false); dirty = true; }
  }
  function up() {
    if (!drag) return;
    if (drag.kind === 'stroke') strokeEnd();
    drag = null; ringOn = false; dirty = true;
  }

  layout(); makeSketch();
  return {
    screen, render, down, move, up, undo, redo,
    get dirty() { return dirty || !!drag || (toast && performance.now() < toast.until + 100); },
    set dirty(v) { dirty = v; },
    get orient() { return orient; },
    setOrient(o, scale = 1) { if (o !== orient || scale !== u / 2) { const was = orient; orient = o; u = 2 * scale; pop = null; layout(); dirty = true; if (was !== o) { makeSketch(); artDirty = true; } } },
    setCssPerPx(k) { cssPerPx = k; },
    setSketch(o, bitmap) { sketches[o] = bitmap; if (o === orient && !touched) { makeSketch(); dirty = true; artDirty = true; } },
    uiSize: () => ({ w: W, h: H }),
    rects: () => Lx,
    openColors() { pop = 'colors'; dirty = true; },
    isDrawing: () => !!drag,
    toPhys,
    // --- the engine, for the HTML interface ---
    T, PW, PH, COLORS, previews, hsv2rgb, rgb2hex,
    layers, get active() { return act; }, MAXL, get strokes() { return strokeCount; },
    select(i) { useLayer(i); dirty = true; },
    toggle(i) { layers[i].on = !layers[i].on; dirty = true; artDirty = true; },
    addLayer() { if (layers.length >= MAXL) return; layers.splice(act + 1, 0, newLayer()); useLayer(act + 1); dirty = true; artDirty = true; },
    deleteLayer() {
      touched = true; const gone = layers[act].g;
      for (const H of [hist, redoS]) for (let i = H.length - 1; i >= 0; i--) if (H[i].g === gone) H.splice(i, 1);
      layers.splice(act, 1);
      if (!layers.length) layers.push(newLayer());
      useLayer(Math.min(act, layers.length - 1)); dirty = true; artDirty = true;
    },
    get canUndo() { return hist.length > 0; }, get canRedo() { return redoS.length > 0; },
    get artDirty() { return artDirty; }, set artDirty(v) { artDirty = v; },
    setColor(hex, keep) { setColor(hex, keep); },
    setTool(t) { T.tool = t; T.eyedrop = false; dirty = true; },
    setBrush(b) { T.brush = b; T.tool = 'brush'; dirty = true; },
    size: (v) => { if (v !== undefined) { tset().size = clamp(v, 1, 100); dirty = true; } return tset().size; },
    opacity: (v) => { if (v !== undefined) { tset().op = clamp(v, 1, 100); dirty = true; } return tset().op; },
    diam,
    clear() { clearLayer(); artDirty = true; },
    sample(px, py) { const d = cPaint.getImageData(clamp(px | 0, 0, PW - 1), clamp(py | 0, 0, PH - 1), 1, 1).data; return d[3] > 20 ? rgb2hex(d[0], d[1], d[2]) : PAPER; },
    begin(px, py, o = {}) { ptype = o.type || 'mouse'; strokeStart({ x: px, y: py, p: o.pressure || 0, t: o.t || performance.now() }); artDirty = true; },
    extend(px, py, o = {}) { if (!drawing) return; strokeMove({ x: px, y: py, p: o.pressure || 0, t: o.t || performance.now() }); artDirty = true; },
    end() { if (!drawing) return; strokeEnd(); artDirty = true; },
    // draw the artwork into a canvas of any size; land = the long side horizontal
    composeTo(g, w, h, land) {
      composeArt(sg); sg.setTransform(1, 0, 0, 1, 0, 0);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      if (land) { const k = w / PH; g.setTransform(0, k, -k, 0, PH * k, 0); } else g.setTransform(w / PW, 0, 0, h / PH, 0, 0);
      g.imageSmoothingQuality = 'high'; g.drawImage(screen, 0, 0); g.restore();
    },
  };
}
