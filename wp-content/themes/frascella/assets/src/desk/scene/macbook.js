// MacBook Pro 14" (2021+), space black — 31.26 × 22.12 × 1.55 cm.
// The keyboard sits in a black well cut into the deck; each keycap is a dished, filleted cap
// whose legend comes from one texture looked up by position, so it is printed on the cap itself.
import * as THREE from 'three';
import { RectAreaLight } from 'three';
import { V, TAU, mkCanvas, canvasTex, shade, rr, rrPath, slabGeo, flatGeo, at, footprint, tick } from './util.js';
import { M, displayMaterial } from './mats.js';
import { jt } from './jobs.js';

export const MW = 31.26, MD = 22.12, MR = 1.0, BASE_H = .95, FOOT = .1;
const P = 1.8, CAP = 1.54, KB_W = 14.5 * P, KB_D = 6 * P, KB_BACK = -MD / 2 + 1.0;
const TP_W = 15.0, TP_D = 8.6, TP_Z = KB_BACK + KB_D + .88 + TP_D / 2;
const WELL_Y = BASE_H - .17, KEY_TOP = BASE_H + .012;
export const LID_H = 21.3, LID_T = .56, LID_Y0 = .34;
const GLASS_W = MW - .2, GLASS_H = LID_H - .2;
export const SCR_W = 30.2, SCR_H = 19.63;
const SCR_CY = GLASS_H / 2 - .45 - SCR_H / 2;
const NOTCH_W = 3.2, NOTCH_H = .9;                 // the camera housing, cut down into the panel

/* ---------- the keycap: rounded footprint, filleted top edge, a shallow dish ---------- */
function contour(w, d, r, inset, CS) {
  const hw = w / 2 - inset, hd = d / 2 - inset, rr_ = Math.max(.004, r - inset), pts = [];
  const cs = [[hw - rr_, hd - rr_, 0], [-(hw - rr_), hd - rr_, Math.PI / 2], [-(hw - rr_), -(hd - rr_), Math.PI], [hw - rr_, -(hd - rr_), Math.PI * 1.5]];
  for (const [cx, cz, a0] of cs) for (let k = 0; k <= CS; k++) { const a = a0 + k / CS * Math.PI / 2; pts.push([cx + Math.cos(a) * rr_, cz + Math.sin(a) * rr_]); }
  return pts;
}
function keycapGeo(w, d, h, { r = .16, f = .055, dish = .018, CS = 5, FS = 4, TS = 5 } = {}) {
  const rings = [];
  rings.push({ pts: contour(w, d, r, .035, CS), y: 0 });
  rings.push({ pts: contour(w, d, r, 0, CS), y: h - f });
  for (let k = 1; k <= FS; k++) { const a = k / FS * Math.PI / 2; rings.push({ pts: contour(w, d, r, f * (1 - Math.cos(a)), CS), y: h - f + f * Math.sin(a) }); }
  const top = rings[rings.length - 1].pts;
  for (let k = 1; k <= TS; k++) { const s = 1 - k / TS; rings.push({ pts: top.map(([x, z]) => [x * s, z * s]), y: h - dish * (1 - s * s) }); }
  const N = top.length, pos = [], idx = [];
  for (const rg of rings) for (const [x, z] of rg.pts) pos.push(x, rg.y, z);
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < N; j++) {
    const a = i * N + j, b = (i + 1) * N + j, c = i * N + (j + 1) % N, e = (i + 1) * N + (j + 1) % N;
    idx.push(a, b, c, b, e, c);
  }
  const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / w + .5, pos[i + 2] / d + .5);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---------- the layout (US, 2021 MacBook Pro): six rows of 14.5 units ---------- */
const FN = ['bright-', 'bright+', 'mission', 'search', 'mic', 'moon', 'prev', 'play', 'next', 'mute', 'vol-', 'vol+'];
const ROWS = [
  [['esc', 1.5, 'esc'], ...FN.map(f => [f, 1, 'fn']), ['', 1, 'id']],
  [['~\n`', 1], ...'!1 @2 #3 $4 %5 ^6 &7 *8 (9 )0 _- +='.split(' ').map(s => [s[0] + '\n' + s.slice(1), 1]), ['delete', 1.5, 'r']],
  [['tab', 1.5, 'l'], ...'QWERTYUIOP'.split('').map(c => [c, 1]), ['{\n[', 1], ['}\n]', 1], ['|\n\\', 1]],
  [['caps lock', 1.75, 'l'], ...'ASDFGHJKL'.split('').map(c => [c, 1]), [':\n;', 1], ['"\n\'', 1], ['return', 1.75, 'r']],
  [['shift', 2.25, 'l'], ...'ZXCVBNM'.split('').map(c => [c, 1]), ['<\n,', 1], ['>\n.', 1], ['?\n/', 1], ['shift', 2.25, 'r']],
  [['fn', 1, 'globe'], ['control', 1, 'l'], ['option', 1, 'l'], ['command', 1.25, 'l'], ['', 5], ['command', 1.25, 'rl'], ['option', 1, 'rl'], ['◀', 1, 'h'], ['▲▼', 1, 'v'], ['▶', 1, 'h']],
];

function fnIcon(g, name, x, y, s) {
  g.save(); g.translate(x, y); g.strokeStyle = g.fillStyle; g.lineWidth = s * .09; g.lineCap = 'round'; g.lineJoin = 'round';
  const ray = (n, r0, r1) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke(); } };
  const tri = (dx, dir) => { g.beginPath(); g.moveTo(dx - dir * s * .18, -s * .22); g.lineTo(dx + dir * s * .18, 0); g.lineTo(dx - dir * s * .18, s * .22); g.closePath(); g.fill(); };
  switch (name) {
    case 'bright-': g.beginPath(); g.arc(0, 0, s * .16, 0, TAU); g.stroke(); ray(8, s * .27, s * .36); break;
    case 'bright+': g.beginPath(); g.arc(0, 0, s * .2, 0, TAU); g.fill(); ray(8, s * .3, s * .46); break;
    case 'mission': for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.strokeRect(dx * s * .2 - s * .15, dy * s * .15 - s * .1, s * .3, s * .2); } break;
    case 'search': g.beginPath(); g.arc(-s * .06, -s * .06, s * .2, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(s * .09, s * .09); g.lineTo(s * .3, s * .3); g.stroke(); break;
    case 'mic': g.beginPath(); g.roundRect(-s * .09, -s * .34, s * .18, s * .4, s * .09); g.stroke(); g.beginPath(); g.arc(0, -s * .06, s * .2, .2, Math.PI - .2); g.stroke(); g.beginPath(); g.moveTo(0, s * .14); g.lineTo(0, s * .3); g.stroke(); break;
    case 'moon': g.beginPath(); g.arc(0, 0, s * .28, .6, TAU - .6 + 0.0); g.arc(s * .16, -s * .06, s * .2, TAU - .9, .9, true); g.closePath(); g.fill(); break;
    case 'prev': tri(-s * .12, -1); tri(s * .14, -1); g.fillRect(-s * .38, -s * .22, s * .06, s * .44); break;
    case 'play': tri(-s * .14, 1); g.fillRect(s * .1, -s * .22, s * .07, s * .44); g.fillRect(s * .23, -s * .22, s * .07, s * .44); break;
    case 'next': tri(-s * .14, 1); tri(s * .12, 1); g.fillRect(s * .32, -s * .22, s * .06, s * .44); break;
    default: {
      g.beginPath(); g.moveTo(-s * .34, -s * .1); g.lineTo(-s * .2, -s * .1); g.lineTo(-s * .04, -s * .26); g.lineTo(-s * .04, s * .26); g.lineTo(-s * .2, s * .1); g.lineTo(-s * .34, s * .1); g.closePath(); g.fill();
      if (name === 'mute') { g.beginPath(); g.moveTo(s * .1, -s * .12); g.lineTo(s * .34, s * .12); g.moveTo(s * .34, -s * .12); g.lineTo(s * .1, s * .12); g.stroke(); }
      const n = name === 'vol+' ? 3 : name === 'vol-' ? 1 : 0;
      for (let i = 1; i <= n; i++) { g.beginPath(); g.arc(-s * .02, 0, s * (.1 + i * .1), -.8, .8); g.stroke(); }
    }
  }
  g.restore();
}

// async: it yields between its parts (the body, the keys, their legends and glow, the lid)
export async function buildMacBook({ editorTex }) {
  const mac = new THREE.Group();
  const base = new THREE.Group(); base.position.y = FOOT; mac.add(base);

  /* ---------- the unibody, keyboard well and trackpad opening cut out of the deck ---------- */
  const b = .07;
  const shape = rr(MW - 2 * b, MD - 2 * b, MR - b, [3.6, .36]);
  const kbCz = KB_BACK + KB_D / 2;
  shape.holes.push(rrPath(KB_W + .34 + 2 * b, KB_D + .34 + 2 * b, .42 + b, 0, -kbCz));
  shape.holes.push(rrPath(TP_W + .1 + 2 * b, TP_D + .1 + 2 * b, .72 + b, 0, -TP_Z));
  const body = shade(new THREE.Mesh(slabGeo(shape, BASE_H, b, 3, 20), M.alBlack));
  base.add(body);
  // floors of the openings
  base.add(at(shade(new THREE.Mesh(flatGeo(KB_W + .5, KB_D + .5, .5), null), false, true), 0, WELL_Y, kbCz));
  base.add(at(new THREE.Mesh(flatGeo(TP_W + .3, TP_D + .3, .8), M.well), 0, BASE_H - .12, TP_Z));
  // rubber feet
  for (const [x, z] of [[-12.9, -8.7], [12.9, -8.7], [-12.9, 8.7], [12.9, 8.7]]) base.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.62, .66, FOOT + .02, 28), M.rubber), x, -FOOT / 2, z));

  await tick();
  /* ---------- keys ---------- */
  const groups = new Map(), legends = [], caps = [];
  const addKey = (w, d, x, z) => { const k = `${w.toFixed(3)}|${d.toFixed(3)}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push([x, z]); caps.push([x, z, w, d]); };
  let touchId = null;
  ROWS.forEach((row, r) => {
    let x = -KB_W / 2; const zc = KB_BACK + (r + .5) * P;
    for (const [label, u, kind] of row) {
      const cx = x + u * P / 2, cw = u * P - (P - CAP), cd = CAP;
      if (kind === 'h') { const hd = (cd - .1) / 2; addKey(cw, hd, cx, zc + cd / 2 - hd / 2); legends.push([label, cx, zc + cd / 2 - hd / 2, 'arrow', cw, hd]); }
      else if (kind === 'v') { const hd = (cd - .1) / 2; addKey(cw, hd, cx, zc - cd / 2 + hd / 2); addKey(cw, hd, cx, zc + cd / 2 - hd / 2); legends.push(['▲', cx, zc - cd / 2 + hd / 2, 'arrow', cw, hd], ['▼', cx, zc + cd / 2 - hd / 2, 'arrow', cw, hd]); }
      else if (kind === 'id') touchId = [cx, zc, cw, cd];
      else { addKey(cw, cd, cx, zc); legends.push([label, cx, zc, kind || 'c', cw, cd]); }
      x += u * P;
    }
  });

  const LPX = 110, LW = Math.round(KB_W * LPX), LH = Math.round(KB_D * LPX);
  const X = x => (x + KB_W / 2) * LPX, Z = z => (z - KB_BACK) * LPX;
  const legendCanvas = mkCanvas(LW, LH), lg = legendCanvas.getContext('2d');
  lg.fillStyle = '#000'; lg.fillRect(0, 0, LW, LH); lg.fillStyle = '#fff'; lg.textBaseline = 'middle';
  const F = (wt, px) => `${wt} ${px}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const SYM = { command: '⌘', option: '⌥', control: '⌃', shift: '⇧', tab: '⇥', delete: '⌫', return: '↩', 'caps lock': '⇪' };
  for (const [label, x, z, kind, cw, cd] of legends) {
    if (!label) continue;
    const px = X(x), pz = Z(z), hw = cw * LPX / 2, hd = cd * LPX / 2, pad = 13;
    if (kind === 'c') {
      const parts = label.split('\n');
      if (parts.length === 2) { lg.font = F(400, 27); lg.textAlign = 'center'; lg.fillText(parts[0], px, pz - 19); lg.fillText(parts[1], px, pz + 19); }
      else { lg.font = F(400, 40); lg.textAlign = 'center'; lg.fillText(label, px, pz + 1); }
    } else if (kind === 'l' || kind === 'r' || kind === 'rl') {
      lg.font = F(400, 21);
      const right = kind === 'r';
      lg.textAlign = right ? 'right' : 'left'; lg.fillText(label, right ? px + hw - pad : px - hw + pad, pz + hd - 24);
      if (SYM[label]) { lg.font = F(300, 27); lg.textAlign = right ? 'left' : 'right'; lg.fillText(SYM[label], right ? px - hw + pad : px + hw - pad, pz - hd + 26); }
    } else if (kind === 'esc') { lg.font = F(400, 21); lg.textAlign = 'left'; lg.fillText('esc', px - hw + pad, pz + hd - 24); }
    else if (kind === 'globe') {
      lg.font = F(400, 21); lg.textAlign = 'right'; lg.fillText('fn', px + hw - pad, pz - hd + 24);
      lg.save(); lg.strokeStyle = '#fff'; lg.lineWidth = 2.2; const gx = px - hw + 30, gz = pz + hd - 30;
      lg.beginPath(); lg.arc(gx, gz, 13, 0, TAU); lg.stroke(); lg.beginPath(); lg.ellipse(gx, gz, 5.5, 13, 0, 0, TAU); lg.stroke();
      lg.beginPath(); lg.moveTo(gx - 13, gz); lg.lineTo(gx + 13, gz); lg.stroke(); lg.restore();
    } else if (kind === 'fn') fnIcon(lg, label, px, pz - 4, 60);
    else if (kind === 'arrow') { lg.font = F(400, 17); lg.textAlign = 'center'; lg.fillText(label, px, pz); }
  }
  const legendTex = canvasTex(legendCanvas, { srgb: false });

  await tick();
  // light bleeding from under each cap into the gaps (the backlight), and a soft floor
  const glowCanvas = mkCanvas(LW / 2, LH / 2), gg = glowCanvas.getContext('2d');
  gg.fillStyle = '#000'; gg.fillRect(0, 0, LW / 2, LH / 2);
  gg.shadowColor = 'rgba(255,255,255,1)'; gg.shadowBlur = 7; gg.strokeStyle = 'rgba(255,255,255,.55)'; gg.lineWidth = 3;
  for (const [x, z, w, d] of caps) { gg.beginPath(); gg.roundRect(X(x - w / 2) / 2, Z(z - d / 2) / 2, w * LPX / 2, d * LPX / 2, 8); gg.stroke(); }
  const glowTex = canvasTex(glowCanvas, { srgb: false });
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: .85, emissive: 0xffe9cf, emissiveMap: glowTex, emissiveIntensity: .0 });
  base.children[1].material = wellMat;
  // the floor's UVs follow flatGeo (0..1 over KB_W+.5 × KB_D+.5); the glow was drawn over KB_W × KB_D
  { const t = glowTex; t.repeat.set((KB_W + .5) / KB_W, (KB_D + .5) / KB_D); t.offset.set(-.25 / KB_W, -.25 / KB_D); }

  const keyMat = new THREE.MeshPhysicalMaterial({ color: 0x19191c, roughness: .52, roughnessMap: M.smudgeUV, clearcoat: .12, clearcoatRoughness: .45, specularIntensity: .6 });
  const KU = { legendMap: { value: legendTex }, kbMin: { value: new THREE.Vector2(-KB_W / 2, KB_BACK) }, kbSize: { value: new THREE.Vector2(KB_W, KB_D) }, legendCol: { value: new THREE.Color(0xc9c6bf) }, glow: { value: new THREE.Color(0, 0, 0) } };
  keyMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, KU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vKb; varying float vTop;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 kbp = vec4(transformed, 1.);
        #ifdef USE_INSTANCING
          kbp = instanceMatrix * kbp;
        #endif
        vKb = kbp.xz; vTop = smoothstep(.82, .97, normal.y);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec2 vKb; varying float vTop; uniform sampler2D legendMap; uniform vec2 kbMin, kbSize; uniform vec3 legendCol, glow; float gLegend;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec2 luv = (vKb - kbMin) / kbSize; luv.y = 1. - luv.y; gLegend = texture2D(legendMap, luv).r * vTop; diffuseColor.rgb = mix(diffuseColor.rgb, legendCol, gLegend); }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += glow * gLegend;');
  };
  const KEY_H = KEY_TOP - WELL_Y, dm = new THREE.Object3D();
  for (const [k, list] of groups) {
    const [w, d] = k.split('|').map(Number);
    const im = new THREE.InstancedMesh(keycapGeo(w, d, KEY_H), keyMat, list.length);
    list.forEach(([x, z], i) => { dm.position.set(x, WELL_Y, z); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
    im.castShadow = true; im.receiveShadow = true; base.add(im);
  }
  // Touch ID: a glass cap with a thin steel ring
  { const [x, z, w, d] = touchId;
    base.add(at(shade(new THREE.Mesh(keycapGeo(w, d, KEY_H, { dish: 0 }), M.darkGlass)), x, WELL_Y, z));
    const ring = new THREE.Mesh(new THREE.RingGeometry(.6, .66, 48).rotateX(-Math.PI / 2), M.darkSteel); ring.position.set(x, KEY_TOP + .002, z); base.add(ring); }

  await tick();
  // speaker grilles, a hex field of holes either side of the keys
  const grille = jt('grille', 'c', { srgb: false, cost: 8 });
  for (const s of [-1, 1]) {
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, KB_D + .2), new THREE.MeshBasicMaterial({ color: 0x050506, alphaMap: grille, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    gm.rotation.x = -Math.PI / 2; gm.position.set(s * (KB_W / 2 + 1.28), BASE_H + .001, kbCz); base.add(gm);
  }
  // trackpad: glass, flush, satin
  const tpMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, roughness: .3, roughnessMap: M.smudge, metalness: .1, clearcoat: .6, clearcoatRoughness: .22 });
  base.add(at(shade(new THREE.Mesh(slabGeo(rr(TP_W - .04, TP_D - .04, .7), .1, .02, 2), tpMat), false, true), 0, BASE_H - .102, TP_Z));

  // ports: dark openings on the sides (left: MagSafe, 2 × Thunderbolt, audio; right: HDMI, Thunderbolt, SD)
  const portMat = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const port = (side, z, w, h, r) => {
    const g = new THREE.ShapeGeometry(rr(w, h, r), 8); g.rotateY(side * Math.PI / 2);
    const m = new THREE.Mesh(g, portMat); m.position.set(side * (MW / 2 + .001), .47, z); base.add(m);
  };
  port(-1, -7.1, 1.05, .34, .16); port(-1, -5.2, .9, .3, .14); port(-1, -3.8, .9, .3, .14); port(-1, -1.6, .36, .36, .18);
  port(1, -6.2, 1.5, .5, .08); port(1, -4.2, .9, .3, .14); port(1, -2.0, 2.4, .2, .05);

  await tick();
  /* ---------- hinge and lid ---------- */
  const HZ = -MD / 2 + .42, HY = BASE_H - .02;
  { const h = shade(new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, MW - 4.6, 40), new THREE.MeshPhysicalMaterial({ color: 0x141416, metalness: .7, roughness: .38 }))); h.rotation.z = Math.PI / 2; h.position.set(0, HY, HZ); base.add(h); }
  const lid = new THREE.Group(); lid.position.set(0, HY, HZ); lid.rotation.x = -.29; base.add(lid);
  {
    const lb = .08;
    const g = new THREE.ExtrudeGeometry(rr(MW - 2 * lb, LID_H - 2 * lb, MR - lb), { depth: LID_T - 2 * lb, bevelEnabled: true, bevelThickness: lb, bevelSize: lb, bevelSegments: 4, curveSegments: 20 });
    g.translate(0, LID_H / 2 + LID_Y0, -(LID_T - lb));
    lid.add(shade(new THREE.Mesh(g, M.alBlack)));
  }
  const glassGeo = new THREE.ShapeGeometry(rr(GLASS_W, GLASS_H, MR - .1), 20);
  { const uv = glassGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / GLASS_W + .5, uv.getY(i) / GLASS_H + .5); }
  const dispMat = displayMaterial({ glass: [GLASS_W, GLASS_H], scr: [SCR_W, SCR_H, 0, SCR_CY], r: .55, topOnly: true, notch: [NOTCH_W, NOTCH_H], notchR: [.25, .12], bright: 1.35, tex: editorTex });
  const glass = new THREE.Mesh(glassGeo, dispMat); glass.position.set(0, LID_H / 2 + LID_Y0, .012); glass.receiveShadow = true; lid.add(glass);
  // the camera in the notch: a tiny dark lens and a faint ring round it
  { const y = LID_H / 2 + LID_Y0 + SCR_CY + SCR_H / 2 - .4;
    const c = new THREE.Mesh(new THREE.CircleGeometry(.075, 28), M.lens); c.position.set(0, y, .017); lid.add(c);
    const rg = new THREE.Mesh(new THREE.RingGeometry(.075, .125, 28), new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: .3 })); rg.position.set(0, y, .016); lid.add(rg); }

  // the display lights the desk: a rect light the size of the panel
  const scrLight = new RectAreaLight(0xbfcaf0, .35, SCR_W, SCR_H);
  scrLight.position.set(0, LID_H / 2 + LID_Y0 + SCR_CY, .4); scrLight.rotation.y = Math.PI; lid.add(scrLight);

  footprint('macbook', mac, MW, MD, BASE_H + FOOT);

  const ports = {
    magsafe: { p: V(-MW / 2, FOOT + .47, -7.1), d: V(-1, 0, 0) },
    usbc: { p: V(MW / 2, FOOT + .47, -4.2), d: V(1, 0, 0) },
  };
  return { mac, lid, glass, dispMat, scrLight, keyMat, KU, wellMat, ports, scrCenter: () => glass.localToWorld(V(0, SCR_CY, 0)) };
}

/* ---------- what the display shows: an editor with real code, and the three works ---------- */
export function editorTexture() {
  const W = 2048, H = Math.round(2048 * SCR_H / SCR_W);
  const c = mkCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#16161a'; g.fillRect(0, 0, W, H);
  // menu bar, as tall as the notch; its items stay clear of the notch on either side
  const MBH = Math.round(NOTCH_H / SCR_H * H), NX = NOTCH_W / SCR_W * W;
  g.fillStyle = '#0f0f12'; g.fillRect(0, 0, W, MBH);
  g.fillStyle = '#d9d6cf'; g.font = '600 24px "Helvetica Neue", Helvetica, sans-serif'; g.textBaseline = 'middle';
  g.fillText('Code', 70, MBH / 2 + 1); g.font = '400 24px "Helvetica Neue", Helvetica, sans-serif';
  { let mx = 150; for (const t of ['File', 'Edit', 'Selection', 'View', 'Go', 'Terminal']) { if (mx + g.measureText(t).width > W / 2 - NX / 2 - 30) break; g.fillText(t, mx, MBH / 2 + 1); mx += g.measureText(t).width + 34; } }
  g.textAlign = 'right'; g.fillText('21:47', W - 40, MBH / 2 + 1); g.textAlign = 'left';
  // the rest of the window was laid out under a 50 px bar: fit it into what is left
  g.save(); g.translate(0, MBH); g.scale(1, (H - MBH) / (H - 50)); g.translate(0, -50);
  // sidebar
  g.fillStyle = '#1b1b20'; g.fillRect(0, 50, 330, H - 50);
  g.fillStyle = '#8a857c'; g.font = '600 18px "Helvetica Neue", Helvetica, sans-serif'; g.fillText('EXPLORER', 30, 90);
  const files = ['▾ frascella', '  ▾ inc', '     content.php', '     seo.php', '  ▾ widgets', '     agenda.php', '     contact.php', '  ▸ assets', '  ▸ templates', '    functions.php', '    style.css', '    package.json'];
  g.font = '400 21px "Helvetica Neue", Helvetica, sans-serif';
  files.forEach((f, i) => { if (i === 6) { g.fillStyle = '#2a2a31'; g.fillRect(0, 118 + i * 36, 330, 36); } g.fillStyle = i === 6 ? '#f3efe7' : '#a9a49b'; g.fillText(f, 26, 136 + i * 36); });
  // tabs
  g.fillStyle = '#1b1b20'; g.fillRect(330, 50, W - 330, 56);
  g.fillStyle = '#16161a'; g.fillRect(330, 50, 250, 56); g.fillStyle = '#ff4a1c'; g.fillRect(330, 50, 250, 3);
  g.fillStyle = '#e9e5dd'; g.font = '400 21px "Helvetica Neue", Helvetica, sans-serif'; g.fillText('contact.php', 368, 80);
  g.fillStyle = '#8a857c'; g.fillText('agenda.php', 630, 80);
  // code
  const code = [
    [['k', '<?php'], ],
    [],
    [['k', 'namespace '], ['t', 'Frascella\\Widgets'], ['p', ';']],
    [],
    [['k', 'final class '], ['t', 'Contact'], ['k', ' extends '], ['t', 'Widget']],
    [['p', '{']],
    [['c', '    // one form, one inbox: the request reaches me, nobody else']],
    [['k', '    public function '], ['f', 'render'], ['p', '(): '], ['k', 'void']],
    [['p', '    {']],
    [['v', '        $fields'], ['p', ' = '], ['v', '$this'], ['p', '->'], ['f', 'fields'], ['p', '();']],
    [['k', '        if '], ['p', '('], ['p', '! '], ['v', '$fields'], ['p', ') {']],
    [['k', '            return'], ['p', ';']],
    [['p', '        }']],
    [],
    [['v', '        $nonce'], ['p', ' = '], ['f', 'wp_create_nonce'], ['p', '('], ['s', "'contact'"], ['p', ');']],
    [['f', '        get_template_part'], ['p', '('], ['s', "'widgets/contact'"], ['p', ', '], ['k', 'null'], ['p', ', [']],
    [['s', "            'fields'"], ['p', ' => '], ['v', '$fields'], ['p', ',']],
    [['s', "            'nonce'"], ['p', '  => '], ['v', '$nonce'], ['p', ',']],
    [['s', "            'reply'"], ['p', '  => '], ['f', '__'], ['p', '('], ['s', "'Rispondo entro due giorni.'"], ['p', ', '], ['s', "'frascella'"], ['p', '),']],
    [['p', '        ]);']],
    [['p', '    }']],
    [],
    [['k', '    private function '], ['f', 'fields'], ['p', '(): '], ['k', 'array']],
    [['p', '    {']],
    [['k', '        return '], ['f', 'array_filter'], ['p', '('], ['v', '$this'], ['p', '->'], ['f', 'get_settings'], ['p', '('], ['s', "'fields'"], ['p', ') ?? []);']],
    [['p', '    }']],
    [['p', '}']],
  ];
  const COL = { k: '#ff7a52', t: '#e8c48a', p: '#b8b3aa', c: '#6f6b64', v: '#9fc0d8', f: '#f3efe7', s: '#a6c48a' };
  g.font = '400 25px Menlo, "SF Mono", Monaco, monospace'; const cw = g.measureText('M').width;
  code.forEach((line, i) => {
    const y = 150 + i * 38;
    if (i === 18) { g.fillStyle = '#202027'; g.fillRect(330, y - 19, W - 330, 38); }
    g.fillStyle = '#4c4a52'; g.textAlign = 'right'; g.fillText(String(i + 1), 410, y); g.textAlign = 'left';
    let x = 450; for (const [k, t] of line) { g.fillStyle = COL[k]; g.fillText(t, x, y); x += t.length * cw; }
    if (i === 18) { g.fillStyle = '#ff4a1c'; g.fillRect(x + 2, y - 16, 3, 32); }
  });
  // terminal
  g.fillStyle = '#121215'; g.fillRect(330, H - 250, W - 330, 222);
  g.fillStyle = '#8a857c'; g.font = '600 18px "Helvetica Neue", Helvetica, sans-serif'; g.fillText('TERMINAL', 360, H - 222);
  g.font = '400 23px Menlo, "SF Mono", monospace';
  [['#a6c48a', '✓ 38 passed (widgets, editor, languages, a11y)'], ['#b8b3aa', '$ npm run build'], ['#b8b3aa', 'built in 1.84s'], ['#f3efe7', '$ ']].forEach(([cc, t], i) => { g.fillStyle = cc; g.fillText(t, 360, H - 180 + i * 34); });
  // status bar
  g.fillStyle = '#ff4a1c'; g.fillRect(0, H - 28, W, 28);
  g.fillStyle = '#0e0e11'; g.font = '600 18px "Helvetica Neue", Helvetica, sans-serif'; g.fillText('feature/wordpress', 40, H - 14);
  g.restore();
  return canvasTex(c);
}
