// The drawing app's interface as real HTML, placed on the tablet's screen with CSS3D while you draw.
// Buttons are buttons, sliders are sliders; the drawing surface is a canvas at full DPR.
// Layout: a text button and four tools on the left of the top bar; brush, smudge, eraser, layers
// and colour on the right; a slim sidebar with size, a modify square, opacity, undo and redo.
import { TAU, clamp } from './util.js';
import { words, fmt } from './words.js';

const ICON = {
  actions: '<path d="M15.2 4.2a4.6 4.6 0 0 0-4.9 6.1L4.4 16.2a1.9 1.9 0 0 0 2.7 2.7l5.9-5.9a4.6 4.6 0 0 0 6.1-4.9l-2.9 2.9-2.4-.4-.4-2.4z"/>',
  adjust: '<path d="M4.5 19.5L15 9"/><path d="M13.2 7.2l3.6 3.6"/><path d="M17.5 3v3M16 4.5h3M20.5 8.5v2.4M19.3 9.7h2.4M9.5 3.5v2M8.5 4.5h2"/>',
  select: '<path d="M17.5 6.5c-1.6-2-7.8-2.4-8.6.8-.9 3.7 8.3 3.3 7.6 7.4-.6 3.4-7.4 3.2-9.5 1.1"/><path d="M6.4 14.6l.6 1.8 1.8-.3"/>',
  transform: '<path d="M6 4l12.5 8.3-5.9 1.1-3.3 5.9z"/>',
  brush: '<path d="M19.8 4.2c-2.8 1.3-6.8 5-8.8 7.8l1.4 1.4c2.8-2 6.5-6 7.4-9.2z"/><path d="M10.5 12.8c-2 0-3.3 1.4-3.3 3.2 0 1-.7 1.8-1.9 2 2 1.4 5.8 1.1 6.6-1.4.4-1.4-.1-2.6-1.4-3.8z"/>',
  smudge: '<path d="M8 19.5c-2 0-3.3-1.5-3.3-3.3V9.8c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v2.4V5.7c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v5.5V4.8c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v6.4V6.2c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v7.7c0 3.1-2.5 5.6-5.6 5.6z"/>',
  eraser: '<path d="M15.3 3.9l4.8 4.8-9.6 9.6H6l-2.2-2.2z"/><path d="M10.2 9l4.8 4.8"/><path d="M11 20.3h9"/>',
  layers: '<rect x="8.5" y="3.8" width="11.7" height="11.7" rx="1.8"/><rect x="3.8" y="8.5" width="11.7" height="11.7" rx="1.8" fill="currentColor" fill-opacity=".85"/>',
  undo: '<path d="M8.5 6L4 10.5 8.5 15"/><path d="M4 10.5h10a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15.5 6L20 10.5 15.5 15"/><path d="M20 10.5H10a5 5 0 0 0 0 10h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
};
const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const CSS = `
.pa{pointer-events:auto!important;position:relative;overflow:hidden;background:#F3EFE7;color:#ecebe7;font:15px/1.25 "Schibsted Grotesk",system-ui,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent;isolation:isolate}
.pa *{box-sizing:border-box}
.pa-art{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair;touch-action:none}
/* safe area: --r is the screen's corner radius, --p the outer rhythm (8 or 16), --bh the bar */
.pa{--r:40px;--p:16px;--bh:56px;--top:calc(var(--p) + var(--bh))}
.pa-bar{position:absolute;top:var(--p);left:var(--r);right:var(--r);height:var(--bh);display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 6px;border-radius:16px;
  background:rgba(26,26,29,.82);-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);box-shadow:0 8px 24px rgba(0,0,0,.2),inset 0 0 0 1px rgba(255,255,255,.06)}
.pa-grp{display:flex;align-items:center;gap:4px}
.pa-btn{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:12px;background:transparent;color:#e6e3dd;cursor:pointer;padding:0;transition:background .15s,color .15s,transform .1s}
.pa-btn svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.pa-btn:hover{background:rgba(255,255,255,.08)}
.pa-btn:active{transform:scale(.93)}
.pa-btn[aria-pressed="true"]{color:#FF6A42}
.pa-btn[aria-expanded="true"]{background:rgba(255,255,255,.1)}
.pa-btn:disabled{opacity:.3;cursor:default;background:transparent;transform:none}
.pa :focus-visible{outline:2px solid #FF4A1C;outline-offset:-2px}
.pa-done{height:44px;min-width:44px;padding:0 14px;border:0;border-radius:12px;background:transparent;color:#f3efe7;font:600 16px/1 "Schibsted Grotesk",sans-serif;cursor:pointer;letter-spacing:.01em}
.pa-done:hover{background:rgba(255,255,255,.08)}
.pa-sep{width:1px;height:22px;background:rgba(255,255,255,.1);margin:0 6px}
.pa-sw span{width:26px;height:26px;border-radius:50%;background:var(--c,#0E0E11);box-shadow:0 0 0 2px #1a1a1d,0 0 0 4px rgba(243,239,231,.9)}
.pa-side{position:absolute;left:var(--p);top:calc(var(--top) + 16px);bottom:var(--r);height:fit-content;max-height:calc(100% - var(--top) - 16px - var(--r));margin:auto 0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px;border-radius:16px;
  background:rgba(34,34,38,.8);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 12px 36px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.06)}
.pa-sl{--v:.3;position:relative;flex:none;width:30px;height:var(--sl,150px);border-radius:15px;background:rgba(255,255,255,.08);cursor:ns-resize;touch-action:none;overflow:hidden}
.pa-sl i{position:absolute;left:0;right:0;bottom:0;height:calc(var(--v) * (100% - 30px) + 30px);background:rgba(255,255,255,.13);border-radius:15px}
.pa-sl b{position:absolute;left:4px;right:4px;height:10px;bottom:calc(var(--v) * (100% - 30px) + 16px);border-radius:5px;background:#f3efe7;box-shadow:0 1px 4px rgba(0,0,0,.45)}
.pa-sl output{position:absolute;left:40px;top:0;display:none}
.pa-mod{width:44px;height:36px;display:grid;place-items:center;border:0;background:transparent;cursor:pointer;border-radius:10px}
.pa-mod span{width:22px;height:22px;border-radius:5px;box-shadow:inset 0 0 0 1.6px rgba(243,239,231,.6)}
.pa-mod[aria-pressed="true"] span{box-shadow:inset 0 0 0 1.6px #FF6A42;background:rgba(255,106,66,.22)}
.pa-val{position:absolute;left:calc(var(--p) + 68px);padding:6px 10px;border-radius:9px;background:rgba(20,20,23,.9);color:#f3efe7;font:600 13px/1 "Schibsted Grotesk",sans-serif;pointer-events:none;opacity:0;transition:opacity .15s}
.pa-val.on{opacity:1}
.pa-ring{position:absolute;border-radius:50%;pointer-events:none;border:1.5px solid rgba(14,14,17,.75);box-shadow:0 0 0 1px rgba(243,239,231,.85);transform:translate(-50%,-50%);opacity:0;transition:opacity .15s}
.pa-ring.on{opacity:1}
.pa-pop{position:absolute;top:calc(var(--top) + 8px);right:var(--r);width:320px;max-width:calc(100% - 2 * var(--r));max-height:calc(100% - var(--top) - 8px - var(--r));overflow:auto;overscroll-behavior:contain;padding:16px;border-radius:18px;background:rgba(32,32,36,.9);-webkit-backdrop-filter:blur(24px) saturate(1.2);backdrop-filter:blur(24px) saturate(1.2);
  box-shadow:0 24px 60px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.07);transform-origin:var(--ax,90%) 0;animation:pa-in .18s ease-out}
.pa-pop[hidden]{display:none}
@keyframes pa-in{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}
.pa-ph{margin:0 2px 8px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8A857C}
.pa-brush{display:grid;grid-template-columns:1fr 128px;align-items:center;gap:10px;width:100%;min-height:52px;padding:6px 10px;margin:0 0 4px;border:0;border-radius:12px;background:transparent;color:#e8e6e1;font:500 15px/1.2 "Schibsted Grotesk",sans-serif;text-align:left;cursor:pointer}
.pa-brush canvas{width:128px;height:34px;display:block}
.pa-brush:hover{background:rgba(255,255,255,.06)}
.pa-brush[aria-pressed="true"]{background:rgba(255,74,28,.17);color:#fff}
.pa-disc{display:block;width:256px;height:256px;margin:0 auto 16px;touch-action:none;cursor:crosshair}
.pa-pal{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.pa-pal button{aspect-ratio:1;min-height:36px;border-radius:50%;border:0;padding:0;background:var(--c);cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.pa-pal button[aria-pressed="true"]{box-shadow:0 0 0 2px #202024,0 0 0 4px #f3efe7}
.pa-now{display:flex;align-items:center;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);font-size:13px;color:#8A857C}
.pa-now i{width:22px;height:22px;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
.pa-lhead{display:flex;align-items:center;gap:8px;margin:-4px -4px 8px 0}.pa-lhead .pa-ph{margin:0 2px;flex:1}.pa-lcount{font-size:13px;color:#8A857C;font-variant-numeric:tabular-nums}
.pa-llist{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.pa-layer{display:flex;align-items:center;gap:8px;padding:4px 4px 4px 8px;border-radius:12px;color:inherit}
.pa-layer:hover{background:rgba(255,255,255,.05)}
.pa-layer.act{background:rgba(255,74,28,.15)}
.pa-layer canvas{width:48px;height:64px;border-radius:4px;background:#F3EFE7;flex:none;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
.pa-layer canvas.land{width:64px;height:48px}
.pa-lname{flex:1;min-width:0;min-height:56px;padding:0 0 0 8px;border:0;border-radius:8px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}.pa-lname b{display:block;font-weight:600}.pa-lname small{font-size:12px;color:#8A857C}
.pa-layer .pa-btn{flex:none;color:#e6e3dd}.pa-layer .pa-btn[aria-pressed="false"]{color:#6b675f}
.pa-lacts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
.pa-clear{width:100%;min-height:44px;padding:0 8px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:transparent;color:#f0eee9;font:600 14px/1 "Schibsted Grotesk",sans-serif;cursor:pointer}
.pa-clear:hover{background:rgba(255,255,255,.06)}
.pa-toast{position:absolute;left:50%;top:calc(var(--top) + 16px);transform:translateX(-50%);padding:9px 16px;border-radius:999px;background:rgba(24,24,27,.9);color:#e6e3dd;font-size:14px;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none}
.pa-toast.on{opacity:1}
.pa.compact .pa-acts{display:none}
.pa.compact .pa-pop{left:var(--r);width:auto}
.pa.compact .pa-disc{width:208px;height:208px}
.pa.compact .pa-bar{padding:0 4px;gap:4px}.pa.compact .pa-grp{gap:0}.pa.compact .pa-done{padding:0 10px}
@media (prefers-reduced-motion: reduce){.pa-pop{animation:none}.pa-btn,.pa-toast,.pa-val,.pa-ring{transition:none}}
`;

export function createPadUI(E, { onClose }) {
  const w = words(), q = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  if (!document.getElementById('pa-css')) { const st = document.createElement('style'); st.id = 'pa-css'; st.textContent = CSS; document.head.append(st); }
  const el = document.createElement('div'); el.className = 'pa';
  const holder = document.createElement('div'); holder.className = 'pa-holder'; holder.append(el); el.setAttribute('role', 'application'); el.setAttribute('aria-label', w.app);
  el.inert = true; el.setAttribute('aria-hidden', 'true');   // until the first entry
  el.innerHTML = `
    <canvas class="pa-art" role="img" aria-label="${q(w.canvas)}"></canvas>
    <div class="pa-ring" aria-hidden="true"></div>
    <div class="pa-bar">
      <div class="pa-grp">
        <button class="pa-done" type="button" data-k="done">${q(w.done)}</button>
        <span class="pa-grp pa-acts">${['actions', 'adjust', 'select', 'transform'].map(n => `<button class="pa-btn" type="button" data-act="${n}" aria-label="${q(w[n])}">${svg(n)}</button>`).join('')}</span>
      </div>
      <div class="pa-grp" role="toolbar" aria-label="${q(w.tools)}">
        <button class="pa-btn" type="button" data-tool="brush" aria-label="${q(w.brush)}" aria-pressed="true" aria-controls="pa-brushes" aria-expanded="false">${svg('brush')}</button>
        <button class="pa-btn" type="button" data-tool="smudge" aria-label="${q(w.smudge)}" aria-pressed="false">${svg('smudge')}</button>
        <button class="pa-btn" type="button" data-tool="eraser" aria-label="${q(w.eraser)}" aria-pressed="false">${svg('eraser')}</button>
        <button class="pa-btn" type="button" data-pop="layers" aria-label="${q(w.layers)}" aria-controls="pa-layers" aria-expanded="false">${svg('layers')}</button>
        <button class="pa-btn pa-sw" type="button" data-pop="colors" aria-label="${q(w.color)}" aria-controls="pa-colors" aria-expanded="false"><span></span></button>
      </div>
    </div>
    <div class="pa-side" role="group" aria-label="${q(w.brushGroup)}">
      <div class="pa-sl" data-sl="size" role="slider" tabindex="0" aria-label="${q(w.size)}" aria-orientation="vertical" aria-valuemin="1" aria-valuemax="100"><i></i><b></b></div>
      <button class="pa-mod" type="button" data-k="mod" aria-label="${q(w.eyedropper)}" aria-pressed="false"><span></span></button>
      <div class="pa-sl" data-sl="op" role="slider" tabindex="0" aria-label="${q(w.opacity)}" aria-orientation="vertical" aria-valuemin="1" aria-valuemax="100"><i></i><b></b></div>
      <button class="pa-btn" type="button" data-k="undo" aria-label="${q(w.undo)}">${svg('undo')}</button>
      <button class="pa-btn" type="button" data-k="redo" aria-label="${q(w.redo)}">${svg('redo')}</button>
    </div>
    <div class="pa-val" aria-hidden="true"></div>
    <div class="pa-pop" id="pa-brushes" role="group" aria-label="${q(w.brushes)}" hidden><p class="pa-ph">${q(w.brushes)}</p>
      ${['ink', 'air', 'pencil'].map(k => [k, q(w[k])]).map(([k, n]) => `<button class="pa-brush" type="button" data-brush="${k}" aria-pressed="${k === 'ink'}">${n}<canvas width="256" height="68" aria-hidden="true"></canvas></button>`).join('')}</div>
    <div class="pa-pop" id="pa-colors" role="group" aria-label="${q(w.color)}" hidden><p class="pa-ph">${q(w.color)}</p>
      <canvas class="pa-disc" aria-label="${q(w.disc)}" role="img"></canvas>
      <div class="pa-pal">${E.COLORS.map(([h, n]) => `<button type="button" data-c="${h}" aria-label="${q(n)}" aria-pressed="false" style="--c:${h}"></button>`).join('')}</div>
      <div class="pa-now"><i></i><span></span></div></div>
    <div class="pa-pop" id="pa-layers" role="group" aria-label="${q(w.layers)}" hidden>
      <div class="pa-lhead"><p class="pa-ph">${q(w.layers)}</p><span class="pa-lcount"></span><button class="pa-btn" type="button" data-k="add" aria-label="${q(w.addLayer)}">${svg('plus')}</button></div>
      <ul class="pa-llist" aria-label="${q(w.layerList)}"></ul>
      <div class="pa-lacts"><button class="pa-clear" type="button" data-k="clear">${q(w.clearLayer)}</button><button class="pa-clear" type="button" data-k="del">${q(w.deleteLayer)}</button></div></div>
    <div class="pa-toast" role="status"></div>`;
  const $ = s => el.querySelector(s), $$ = s => [...el.querySelectorAll(s)];
  const art = $('.pa-art'), ag = art.getContext('2d'), ring = $('.pa-ring'), val = $('.pa-val'), toast = $('.pa-toast');
  const pops = { brushes: $('#pa-brushes'), colors: $('#pa-colors'), layers: $('#pa-layers') };
  const popBtn = { brushes: $('[data-tool="brush"]'), colors: $('[data-pop="colors"]'), layers: $('[data-pop="layers"]') };
  let land = true, W = 1, H = 1, dpr = 1, openName = null, toastT = 0;

  // brush previews, drawn once with the brushes themselves
  $$('.pa-brush canvas').forEach(c => c.getContext('2d').drawImage(E.previews[c.parentElement.dataset.brush], 0, 0, 256, 68));

  function openPop(n) { closePop(); openName = n; pops[n].hidden = false; popBtn[n].setAttribute('aria-expanded', 'true');
    const b = popBtn[n].getBoundingClientRect(), r = el.getBoundingClientRect(), p = pops[n].getBoundingClientRect();
    pops[n].style.setProperty('--ax', `${((b.left + b.width / 2 - p.left) / p.width * 100).toFixed(0)}%`);
    if (n === 'colors') drawDisc(); if (n === 'layers') thumbs(); }
  function closePop(refocus) { if (!openName) return; const n = openName; pops[n].hidden = true; popBtn[n].setAttribute('aria-expanded', 'false'); openName = null; if (refocus) popBtn[n].focus(); }
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 1500); }

  function sync() {
    $$('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === E.T.tool && !E.T.eyedrop)));
    $$('.pa-brush').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.brush === E.T.brush)));
    $('.pa-sw').style.setProperty('--c', E.T.color);
    $$('.pa-pal button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === E.T.color)));
    const name = (E.COLORS.find(c => c[0] === E.T.color) || [0, w.custom])[1];
    $('.pa-now i').style.setProperty('--c', E.T.color); $('.pa-now span').textContent = `${name} · ${E.T.color}`;
    for (const [k, fn] of [['size', E.size], ['op', E.opacity]]) { const s = $(`[data-sl="${k}"]`), v = fn(); s.style.setProperty('--v', ((v - 1) / 99).toFixed(3)); s.setAttribute('aria-valuenow', Math.round(v)); s.setAttribute('aria-valuetext', `${Math.round(v)}%`); }
    $('[data-k="undo"]').disabled = !E.canUndo; $('[data-k="redo"]').disabled = !E.canRedo;
    $('[data-k="mod"]').setAttribute('aria-pressed', String(!!E.T.eyedrop));
    $('[data-k="add"]').disabled = E.layers.length >= E.MAXL;
    $('.pa-lcount').textContent = fmt('layerCount', { n: E.layers.length, max: E.MAXL });
    const cur = E.layers[E.active].name;
    $('[data-k="del"]').setAttribute('aria-label', fmt('deleteNamed', { name: cur })); $('[data-k="clear"]').setAttribute('aria-label', fmt('clearNamed', { name: cur }));
  }

  /* ---------- bar and sidebar ---------- */
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
    if (b.dataset.k === 'done') { onClose(); return; }
    if (b.dataset.act) { closePop(); say(fmt('notInDraft', { name: b.getAttribute('aria-label') })); return; }
    if (b.dataset.tool) {
      if (b.dataset.tool === 'brush' && E.T.tool === 'brush' && !E.T.eyedrop) { openName === 'brushes' ? closePop() : openPop('brushes'); }
      else { closePop(); E.setTool(b.dataset.tool); }
    }
    else if (b.dataset.pop) { openName === b.dataset.pop ? closePop() : openPop(b.dataset.pop); }
    else if (b.dataset.brush) { E.setBrush(b.dataset.brush); closePop(true); }
    else if (b.dataset.c) { E.setColor(b.dataset.c); drawDisc(); }
    else if (b.dataset.k === 'undo') E.undo();
    else if (b.dataset.k === 'redo') E.redo();
    else if (b.dataset.k === 'mod') { E.T.eyedrop = !E.T.eyedrop; say(E.T.eyedrop ? w.eyedropperOn : w.eyedropperOff); }
    else if (b.dataset.k === 'add') { E.addLayer(); thumbs(); say(fmt('layerAdded', { name: E.layers[E.active].name })); }
    else if (b.dataset.k === 'del') { const n = E.layers[E.active].name; E.deleteLayer(); thumbs(); say(fmt('layerDeleted', { name: n })); focusLayer(); }
    else if (b.dataset.k === 'clear') { E.clear(); thumbs(); }
    if (E.artDirty) drawArt();   // show the change now, not on the next frame
    // the list is rebuilt, so focus goes back to the same control in the new row
    else if (b.dataset.k === 'vis' || b.dataset.k === 'sel') { const { k, i } = b.dataset; k === 'vis' ? E.toggle(+i) : E.select(+i); thumbs(); const nb = $(`[data-k="${k}"][data-i="${i}"]`); if (nb) nb.focus({ preventScroll: true }); }
    sync();
  });
  // vertical sliders, pointer and keyboard
  for (const s of $$('.pa-sl')) {
    const k = s.dataset.sl, fn = k === 'size' ? E.size : E.opacity;
    const fromY = y => { const r = s.getBoundingClientRect(); fn(1 + 99 * (r.bottom - 15 - y) / (r.height - 30)); showVal(s, k); sync(); };
    s.addEventListener('pointerdown', e => {
      e.preventDefault(); s.setPointerCapture(e.pointerId); fromY(e.clientY);
      const mv = ev => fromY(ev.clientY), up = () => { s.removeEventListener('pointermove', mv); val.classList.remove('on'); ring.classList.remove('on'); };
      s.addEventListener('pointermove', mv); s.addEventListener('pointerup', up, { once: true }); s.addEventListener('pointercancel', up, { once: true });
    });
    s.addEventListener('keydown', e => {
      const st = { ArrowUp: 2, ArrowRight: 2, ArrowDown: -2, ArrowLeft: -2, PageUp: 10, PageDown: -10 }[e.key];
      if (st) { e.preventDefault(); fn(fn() + st); } else if (e.key === 'Home') { e.preventDefault(); fn(1); } else if (e.key === 'End') { e.preventDefault(); fn(100); } else return;
      sync(); showVal(s, k); clearTimeout(s._t); s._t = setTimeout(() => { val.classList.remove('on'); ring.classList.remove('on'); }, 700);
    });
  }
  function showVal(s, k) {
    const r = s.getBoundingClientRect(), R = el.getBoundingClientRect(), f = R.width / el.clientWidth || 1, v = (k === 'size' ? E.size : E.opacity)();
    val.textContent = `${Math.round(v)}%`; val.style.top = `${(r.bottom - R.top) / f - 30 - (v - 1) / 99 * (r.height / f - 30)}px`; val.classList.add('on');
    if (k === 'size') { const d = E.diam() * (land ? W / E.PH : W / E.PW); Object.assign(ring.style, { width: d + 'px', height: d + 'px', left: W / 2 + 'px', top: H / 2 + 26 + 'px' }); ring.classList.add('on'); }
  }

  /* ---------- colour disc: hue on the ring, saturation and value in the square ---------- */
  const disc = $('.pa-disc'), dg = disc.getContext('2d');
  function discGeom() { const S = disc.width, c = S / 2; return { S, c, R: S * .5 - 2, r0: S * .385, sq: S * .5 }; }
  function drawDisc() {
    const d = Math.min(2.5, devicePixelRatio || 1), css = disc.clientWidth || 260; if (disc.width !== Math.round(css * d)) { disc.width = disc.height = Math.round(css * d); }
    const { S, c, R, r0, sq } = discGeom(), [h, s, v] = E.T.hsv;
    dg.clearRect(0, 0, S, S);
    const cg = dg.createConicGradient(-Math.PI / 2, c, c); for (let i = 0; i <= 12; i++) { const [a, b, q] = E.hsv2rgb(i / 12 % 1, 1, 1); cg.addColorStop(i / 12, `rgb(${a | 0},${b | 0},${q | 0})`); }
    dg.fillStyle = cg; dg.beginPath(); dg.arc(c, c, R, 0, TAU); dg.arc(c, c, r0, 0, TAU, true); dg.fill();
    const x0 = c - sq / 2, [hr, hg, hb] = E.hsv2rgb(h, 1, 1);
    dg.fillStyle = `rgb(${hr | 0},${hg | 0},${hb | 0})`; dg.fillRect(x0, x0, sq, sq);
    let lg = dg.createLinearGradient(x0, 0, x0 + sq, 0); lg.addColorStop(0, '#fff'); lg.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = lg; dg.fillRect(x0, x0, sq, sq);
    lg = dg.createLinearGradient(0, x0, 0, x0 + sq); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, '#000'); dg.fillStyle = lg; dg.fillRect(x0, x0, sq, sq);
    const a = h * TAU - Math.PI / 2, m = (R + r0) / 2, k = S / 260;
    dg.lineWidth = 3 * k; dg.strokeStyle = '#fff'; dg.beginPath(); dg.arc(c + Math.cos(a) * m, c + Math.sin(a) * m, 11 * k, 0, TAU); dg.stroke();
    dg.beginPath(); dg.arc(x0 + s * sq, x0 + (1 - v) * sq, 9 * k, 0, TAU); dg.stroke(); dg.strokeStyle = 'rgba(0,0,0,.45)'; dg.lineWidth = k; dg.stroke();
  }
  let discMode = null;
  const discAt = (e, start) => {
    const r = disc.getBoundingClientRect(), { S, c, R, r0, sq } = discGeom(), x = (e.clientX - r.left) / r.width * S - c, y = (e.clientY - r.top) / r.height * S - c, d = Math.hypot(x, y);
    if (start) discMode = d >= r0 - 6 && d <= R + 8 ? 'hue' : (Math.abs(x) <= sq / 2 + 6 && Math.abs(y) <= sq / 2 + 6 ? 'sv' : null);
    if (discMode === 'hue') { let a = Math.atan2(y, x) + Math.PI / 2; if (a < 0) a += TAU; E.T.hsv[0] = a / TAU; }
    else if (discMode === 'sv') { E.T.hsv[1] = clamp(x / sq + .5, 0, 1); E.T.hsv[2] = clamp(.5 - y / sq, 0, 1); }
    if (discMode) { E.setColor(E.rgb2hex(...E.hsv2rgb(...E.T.hsv)), true); drawDisc(); sync(); }
  };
  disc.addEventListener('pointerdown', e => { e.preventDefault(); disc.setPointerCapture(e.pointerId); discAt(e, true); });
  disc.addEventListener('pointermove', e => { if (discMode && disc.hasPointerCapture(e.pointerId)) discAt(e, false); });
  disc.addEventListener('pointerup', () => { discMode = null; });

  // the layer list, top layer first; each row selects, its eye shows or hides
  function thumbs() {
    const list = $('.pa-llist'); list.textContent = '';
    for (let i = E.layers.length - 1; i >= 0; i--) {
      const L = E.layers[i], row = document.createElement('li'), on = i === E.active;
      row.className = 'pa-layer' + (on ? ' act' : '');
      const [cw, ch] = land ? [128, 96] : [96, 128];
      row.innerHTML = `<canvas width="${cw}" height="${ch}" class="${land ? 'land' : ''}" aria-hidden="true"></canvas><button class="pa-lname" type="button" data-k="sel" data-i="${i}" aria-pressed="${on}"><b>${q(L.name)}</b><small>${q(on ? w.active : w.tapToDraw)}${L.on ? '' : q(w.hidden)}</small></button><button class="pa-btn" type="button" data-k="vis" data-i="${i}" aria-pressed="${L.on}" aria-label="${q(fmt('showNamed', { name: L.name }))}">${svg('eye')}</button>`;
      const g = row.querySelector('canvas').getContext('2d'); g.fillStyle = '#F3EFE7'; g.fillRect(0, 0, cw, ch); g.globalAlpha = L.on ? 1 : .35;
      // the physical (portrait) layer, turned the way the tablet is held
      if (land) { const k = cw / E.PH; g.setTransform(0, k, -k, 0, cw, 0); g.drawImage(L.c, 0, 0); } else g.drawImage(L.c, 0, 0, cw, ch);
      list.append(row);
    }
    sync();
  }
  const focusLayer = () => { const b = $('.pa-layer.act .pa-lname'); if (b && openName === 'layers') b.focus({ preventScroll: true }); };

  /* ---------- the drawing surface ---------- */
  let pid = null;
  const toPhys = (cx, cy) => {
    const r = art.getBoundingClientRect(), fx = clamp((cx - r.left) / r.width, 0, 1), fy = clamp((cy - r.top) / r.height, 0, 1);
    return land ? { x: fy * E.PW, y: (1 - fx) * E.PH, k: r.width / E.PH } : { x: fx * E.PW, y: fy * E.PH, k: r.width / E.PW };
  };
  art.addEventListener('pointerdown', e => {
    if (pid !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); closePop();
    const p = toPhys(e.clientX, e.clientY);
    if (E.T.eyedrop) { E.setColor(E.sample(p.x, p.y)); E.T.eyedrop = false; sync(); return; }
    pid = e.pointerId; art.setPointerCapture(pid); E.setCssPerPx && E.setCssPerPx(p.k);
    E.begin(p.x, p.y, { pressure: e.pointerType === 'pen' ? e.pressure : 0, type: e.pointerType, t: e.timeStamp });
  });
  art.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; for (const ce of (evs.length ? evs : [e])) { const p = toPhys(ce.clientX, ce.clientY); E.extend(p.x, p.y, { pressure: ce.pointerType === 'pen' ? ce.pressure : 0, t: ce.timeStamp }); }
  });
  const end = e => { if (e.pointerId !== pid) return; pid = null; E.end(); sync(); };
  art.addEventListener('pointerup', end); art.addEventListener('pointercancel', end); art.addEventListener('lostpointercapture', end);
  // a stroke in progress is finished, never left hanging (a stale pointer id would ignore every later touch)
  function release() { if (pid === null) return; const id = pid; pid = null; try { if (art.hasPointerCapture(id)) art.releasePointerCapture(id); } catch {} E.end(); }

  // focus stays inside while the app is open
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape' && openName) { e.preventDefault(); e.stopPropagation(); closePop(true); return; }
    if (e.key !== 'Tab') return;
    const f = $$('button:not([disabled]),[tabindex="0"]').filter(x => x.offsetParent !== null);
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  });

  function drawArt() {
    ag.setTransform(1, 0, 0, 1, 0, 0);
    E.composeTo(ag, art.width, art.height, land);
    E.artDirty = false;
  }
  return {
    el, holder,
    layout(o) {
      land = o.land; W = Math.round(o.w); H = Math.round(o.h); dpr = Math.min(2.5, devicePixelRatio || 1);
      Object.assign(el.style, { width: W + 'px', height: H + 'px', borderRadius: o.radius + 'px' });
      Object.assign(holder.style, { width: W + 'px', height: H + 'px' });
      // the safe area: nothing closer to an edge than the corner radius, except the sidebar's
      // side (it is centred vertically, far from the corners) and the bar's top
      const compact = W < 560, p = compact ? 8 : 16, bh = compact ? 52 : 56, r = Math.max(16, Math.ceil(o.radius));
      el.style.setProperty('--r', r + 'px'); el.style.setProperty('--p', p + 'px'); el.style.setProperty('--bh', bh + 'px');
      // sliders share what is left of the height under the bar
      const fixed = 16 + 36 + 44 + 44 + 4 * 8, avail = H - (p + bh + 16) - r;
      el.style.setProperty('--sl', Math.round(clamp((avail - fixed) / 2, 56, 150)) + 'px');
      el.classList.toggle('compact', compact);
      art.width = Math.round(W * dpr); art.height = Math.round(H * dpr); drawArt(); sync();
    },
    update() { if (E.artDirty) drawArt(); },
    sync, closePop,
    // every entry: a clean surface, live controls, fresh thumbnails and art
    attach() { release(); el.inert = false; el.removeAttribute('aria-hidden'); closePop(); val.classList.remove('on'); ring.classList.remove('on'); E.artDirty = true; drawArt(); thumbs(); },
    // every exit: finish any stroke, close popovers, hide the toast, and take the app out of the tab order
    detach() {
      release(); closePop(); clearTimeout(toastT); toast.classList.remove('on'); val.classList.remove('on'); ring.classList.remove('on');
      if (el.contains(document.activeElement)) document.activeElement.blur();
      el.inert = true; el.setAttribute('aria-hidden', 'true');
    },
    busy: () => pid !== null,
    focus() { $('.pa-done').focus({ preventScroll: true }); },
    popOpen: () => openName, openPop,
  };
}
