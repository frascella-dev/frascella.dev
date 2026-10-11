// The room, after the owner's reference: cream white everywhere — a matte laminate desk on a white
// steel frame, a plaster wall with a white skirting, a carpet over the whole floor, two stretched
// canvases. The night (the lamp and the screens only) is what darkens them.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TAU, mkCanvas, canvasTex, shade, at } from './util.js';
import { M } from './mats.js';
import { jt, job, pending } from './jobs.js';

export const DESK = { w: 166, d: 92, t: 2.6, wallZ: -49, floorY: -75 };

/* ---------- two stretched canvases: a letterform diptych in ink, grey and one vermilion mark ---------- */
// Each canvas is painted as one sheet that wraps the stretcher (front + four sides, gallery wrap).
// Units while painting are cm, origin at the front's top-left corner. `P` maps a pigment to a colour
// (the colour map) or to a roughness (the same painting in greys: ink sits a little satin on the fabric).
const PIG = {
  col:   { ground: '#eee8dc', ink: '#141318', grey: '#8a857c', wash: '#b9b2a6', verm: '#ff4a1c' },
  rough: { ground: '#e2e2e2', ink: '#a4a4a4', grey: '#cfcfcf', wash: '#d8d8d8', verm: '#b4b4b4' },
};
// a loaded brush along a Catmull-Rom path: one inked body with ragged edges that swells and tapers,
// then the bristles' dry streaks (the ground showing through), thicker as the ink runs out
function brush(g, P, pts, w, { dry = .35, streaks = 14, alpha = .93, seed = 1 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  const N = 320, pp = curve.getSpacedPoints(N);
  let s = seed * 9301; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const nrm = i => { const a = pp[Math.max(0, i - 1)], b = pp[Math.min(N, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const hw = t => w / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * .92 + .06)), .6) * (.85 + .15 * Math.sin(t * 7 + seed));
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, [nx, ny] = nrm(i), h = hw(t), jl = 1 + (r() - .5) * .08, jr = 1 + (r() - .5) * .08;
    L.push([pp[i].x + nx * h * jl, pp[i].y + ny * h * jl]); R.push([pp[i].x - nx * h * jr, pp[i].y - ny * h * jr]);
  }
  g.globalAlpha = alpha; g.fillStyle = P.ink; g.beginPath(); g.moveTo(...L[0]);
  for (const q of L) g.lineTo(...q); for (let i = R.length - 1; i >= 0; i--) g.lineTo(...R[i]); g.closePath(); g.fill();
  // the dry streaks: thin runs of ground along the stroke, rare at the start, many near the end
  g.strokeStyle = P.ground; g.lineCap = 'round';
  for (let k = 0; k < streaks; k++) {
    const o = (r() * 2 - 1) * .8, t0 = (1 - dry) + r() * dry * .9 - (r() < .35 ? .5 : 0), t1 = Math.min(1, t0 + .08 + r() * .35);
    g.globalAlpha = .35 + r() * .45; g.lineWidth = w * (.012 + r() * .03);
    g.beginPath();
    for (let i = Math.max(0, Math.round(t0 * N)); i <= Math.round(t1 * N); i++) { const [nx, ny] = nrm(i), h = hw(i / N) * o; const x = pp[i].x + nx * h, y = pp[i].y + ny * h; i === Math.max(0, Math.round(t0 * N)) ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 1;
}
// one letterform used as a shape, never as a word: filled, outlined, or both, cropped by the edges
function glyph(g, ch, x, y, size, { fill = null, stroke = null, lw = .1, alpha = 1, rot = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha; g.font = `400 ${size}px Gloock, serif`;
  if (fill) { g.fillStyle = fill; g.fillText(ch, 0, 0); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.strokeText(ch, 0, 0); }
  g.restore();
}
// the tall one (36 × 50): a ghost "a" filling the sheet, a huge ink ampersand cut by the left edge,
// an outlined "f" leaning over them; the stroke leaves by the right
function paintFlow(g, P, W, H) {
  glyph(g, 'a', 8.5, 53, 64, { fill: P.wash, alpha: .55 });
  glyph(g, '&', -7.5, 41, 42, { fill: P.ink, alpha: .9 });
  glyph(g, 'f', 21, 46, 34, { stroke: P.ink, lw: .08, alpha: .85, rot: .14 });
  glyph(g, 'f', 21.7, 46.7, 34, { fill: P.grey, alpha: .16, rot: .14 });
  brush(g, P, [[-3, 28], [4.5, 21.5], [12, 17.5], [19, 22.5], [24.5, 30], [31, 28.5], [39.5, 25.5]], 2.4, { dry: .3, streaks: 16, seed: 3 });
  g.fillStyle = P.ink; for (const [x, y, rr_] of [[28.4, 33.2, .2], [29.8, 34.3, .09], [27, 35, .06]]) { g.beginPath(); g.arc(x, y, rr_, 0, TAU); g.fill(); }
}
// the short one (27 × 36): the stroke comes in from the left and ends on the vermilion point; a grey g,
// the ampersand again in outline, and a small ink "a" sunk into the bottom edge
function paintSegno(g, P, W, H) {
  glyph(g, 'g', 2.6, 30, 36, { fill: P.grey, alpha: .36 });
  glyph(g, '&', 12.5, 35, 24, { stroke: P.ink, lw: .075, alpha: .7 });
  brush(g, P, [[-3.5, 13.5], [2.5, 14.3], [8, 19], [13.5, 20.3], [18.5, 15.5], [21.8, 11.8]], 2.1, { dry: .45, streaks: 18, seed: 11 });
  g.fillStyle = P.verm; g.beginPath(); g.arc(23.4, 10, .85, 0, TAU); g.fill();
  glyph(g, 'a', .6, 41.2, 15, { fill: P.ink, alpha: .92, rot: -.08 });
}
// one sheet for one canvas: colour, roughness and a weave bump. The glyphs and strokes are painted
// here (they need Gloock, which a worker may not have) once the face is in; the weave, a pass over
// every pixel, is a job (gen.js weave). The prototype painted at once and again when Gloock came;
// waiting for it gives the same final sheet without the first one.
function paintCanvas(W, H, D, paint, s, fontsIn) {
  const TW = W + 2 * D, TH = H + 2 * D, cw = Math.round(TW * s), ch = Math.round(TH * s);
  const col = mkCanvas(cw, ch), rou = mkCanvas(cw, ch);
  const roughMap = canvasTex(rou, { srgb: false });
  const painted = fontsIn.then(() => {
    for (const [c, P] of [[col, PIG.col], [rou, PIG.rough]]) {
      const g = c.getContext('2d', { willReadFrequently: c === col }); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      g.fillStyle = P.ground; g.fillRect(0, 0, cw, ch);
      g.setTransform(s, 0, 0, s, D * s, D * s); paint(g, P, W, H); g.setTransform(1, 0, 0, 1, 0, 0);
    }
    roughMap.needsUpdate = true;
    return col.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cw, ch).data.buffer;
  });
  pending.push(painted);
  // the job starts when its pixels exist; jt() picks it up by name and tag
  const tag = `${W}x${H}`;
  painted.then(buf => job('weave', [buf, cw, ch], { tag, transfer: [buf], cost: 60 }));
  const map = jt('weave', 'col', { lazy: tag }), bumpMap = jt('weave', 'bump', { srgb: false, lazy: tag });
  return { map, roughMap, bumpMap, TW, TH };
}
// a stretcher box (W × H × D) whose UVs unfold the sheet over the front and the four sides
function wrapGeo(W, H, D, TW, TH) {
  const geo = new THREE.BoxGeometry(W, H, D, 1, 1, 1), p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    let u = (x + W / 2 + D) / TW, v = (y + H / 2 + D) / TH;
    if (nx > .5) u = (W + D + (D / 2 - z)) / TW; else if (nx < -.5) u = (D / 2 + z) / TW;
    else if (ny > .5) v = (H + D + (D / 2 - z)) / TH; else if (ny < -.5) v = (D / 2 + z) / TH;
    else if (nz < -.5) { u = .5; v = .5; }
    uv.setXY(i, u, v);
  }
  return geo;
}
// the soft shadow a canvas leaves on the wall (the lamp's own shadow map is too coarse to show it)
function wallShadow(W, H) {
  const m = 5, s = 8, c = mkCanvas(Math.round((W + 2 * m) * s), Math.round((H + 2 * m) * s)), g = c.getContext('2d');
  g.filter = `blur(${1.6 * s}px)`; g.fillStyle = 'rgba(20,14,8,1)'; g.fillRect(m * s, m * s, W * s, H * s);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W + 2 * m, H + 2 * m), new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, opacity: .28, depthWrite: false }));
  mesh.userData.keep = true; return mesh;
}
function stretchedCanvas(W, H, paint, s, fontsIn) {
  const D = 2.5, grp = new THREE.Group(), sh = paintCanvas(W, H, D, paint, s, fontsIn);
  const mat = new THREE.MeshStandardMaterial({ map: sh.map, roughness: 1, roughnessMap: sh.roughMap, bumpMap: sh.bumpMap, bumpScale: .012, envMapIntensity: .6 });
  const box = shade(new THREE.Mesh(wrapGeo(W, H, D, sh.TW, sh.TH), mat)); box.position.z = D / 2 + .15; grp.add(box);
  const shadow = wallShadow(W, H); shadow.position.set(.4, -1.3, .05); grp.add(shadow);
  return grp;
}

export function buildRoom({ shot, fontsIn }) {
  const room = new THREE.Group();
  const { w, d, t, wallZ, floorY } = DESK;

  /* ---------- the desk ---------- */
  const S = shot ? 512 : 1024;
  const top = new THREE.MeshPhysicalMaterial({ map: jt('laminate', 'col', { args: [S], repeat: [1.6, .9], cost: 60 }), bumpMap: jt('laminate', 'bump', { srgb: false, repeat: [8, 4.5] }), bumpScale: .004, roughness: .62, roughnessMap: M.smudge, specularIntensity: .4, sheen: .1, sheenRoughness: .8, sheenColor: new THREE.Color(0xffffff) });
  M.desk = top;
  room.add(at(shade(new THREE.Mesh(new RoundedBoxGeometry(w, t, d, 4, .4), top)), 0, -t / 2, 0));
  const frame = new THREE.MeshPhysicalMaterial({ color: 0xeceae6, roughness: .45, clearcoat: .2, clearcoatRoughness: .5 });
  // the four legs are one shape and the two rails another: made once each (mergeStatic bakes them)
  const legGeo = new RoundedBoxGeometry(3, -floorY - t, 3, 2, .3), railGeo = new RoundedBoxGeometry(3, 2.4, d - 8, 2, .3);
  const leg = (x) => {
    for (const z of [-d / 2 + 5, d / 2 - 5]) room.add(at(shade(new THREE.Mesh(legGeo, frame)), x, (floorY - t) / 2, z));
    room.add(at(shade(new THREE.Mesh(railGeo, frame)), x, -t - 1.2, 0));
  };
  leg(-w / 2 + 8); leg(w / 2 - 8);

  /* ---------- floor: a sand-coloured carpet, wall to wall ---------- */
  { const rug = new THREE.MeshPhysicalMaterial({ map: jt('carpet', 'col', { args: [S], repeat: [12, 8], cost: 80 }), bumpMap: jt('carpet', 'bump', { srgb: false, repeat: [12, 8] }), bumpScale: .9, roughness: 1, specularIntensity: .15, sheen: .6, sheenRoughness: .9, sheenColor: new THREE.Color(0xfbf6ec) });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), rug);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, floorY, 100); floor.receiveShadow = true; room.add(floor); }

  /* ---------- the wall: warm beige plaster, white skirting ---------- */
  { const plasterMat = new THREE.MeshStandardMaterial({ map: jt('wall', 'col', { args: [S], repeat: [1, 1], cost: 90 }), bumpMap: jt('wall', 'bump', { srgb: false, repeat: [1, 1] }), bumpScale: .04, roughness: .95 });
    const wgeo = new THREE.PlaneGeometry(560, 275); { const uv = wgeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 560 / 110, uv.getY(i) * 275 / 110); }
    const wall = new THREE.Mesh(wgeo, plasterMat); wall.position.set(20, floorY + 137.5, wallZ); wall.receiveShadow = true; room.add(wall);
    const skirting = new THREE.MeshPhysicalMaterial({ color: 0xeeebe6, roughness: .5, roughnessMap: M.smudge2 });
    room.add(at(shade(new THREE.Mesh(new RoundedBoxGeometry(560, 9, 1.4, 2, .3), skirting)), 20, floorY + 4.5, wallZ + .7)); }

  /* ---------- the diptych: two unframed canvases, the tall one a little higher ---------- */
  const px = shot ? 20 : 26;
  const flow = stretchedCanvas(36, 50, paintFlow, px, fontsIn); flow.position.set(-9, 60, wallZ); room.add(flow);
  const segno = stretchedCanvas(27, 36, paintSegno, px, fontsIn); segno.position.set(28, 55, wallZ); room.add(segno);
  return { room };
}
