// Cables as tubes on Catmull-Rom paths that rest on the desk, go round things and drop over
// the back edge; plugs at their ends; and a check that nothing passes through anything.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { V, shade, footprints } from './util.js';
import { rep } from './tex.js';
import { jt } from './jobs.js';

// the braid's weave (gen.js braid), painted in a worker; each cable's clone repeats it its own way
let braidTex = null;
export const cables = [];

// the height a cable of radius r can rest at over (x, z): the desk, or a surface on it (the mat)
export const ground = { desk: null };
function floorAt(x, z, r) {
  const d = ground.desk; let y = -Infinity;
  if (d && Math.abs(x) < d.w / 2 && Math.abs(z) < d.d / 2) {
    // the desk's rounded top edge (r .5): let the cable roll over it
    const e = Math.min(d.w / 2 - Math.abs(x), d.d / 2 - Math.abs(z));
    y = e > .5 ? 0 : -(.5 - Math.sqrt(Math.max(0, .25 - (.5 - e) * (.5 - e))));
  }
  const q = V(0, 0, 0);
  for (const f of footprints) if (f.tag === 'surface') {
    q.set(x, 0, z).applyMatrix4(f.inv || (f.inv = f.obj.matrixWorld.clone().invert()));
    if (Math.abs(q.x) < f.w / 2 + r && Math.abs(q.z) < f.d / 2 + r) y = Math.max(y, f.top);
  }
  return y + r + .01;
}
// lay a path down: sample it densely, lift every sample onto whatever is under it, relax
function settle(pts, r) {
  const c0 = new THREE.CatmullRomCurve3(pts, false, 'centripetal', .5), n = Math.max(40, Math.round(c0.getLength() * 1.2));
  let s = c0.getSpacedPoints(n).map(p => p.clone());
  for (let it = 0; it < 3; it++) {
    for (let i = 1; i < s.length - 1; i++) { const f = floorAt(s[i].x, s[i].z, r); if (s[i].y < f) s[i].y = f; }
    if (it < 2) s = s.map((p, i) => (i === 0 || i === s.length - 1) ? p : p.clone().lerp(s[i - 1].clone().add(s[i + 1]).multiplyScalar(.5), .35));
  }
  for (let i = 1; i < s.length - 1; i++) { const f = floorAt(s[i].x, s[i].z, r); if (s[i].y < f) s[i].y = f; }
  // a cable cannot fold down a step: limit how fast it drops after being lifted (drape)
  for (let i = 1; i < s.length - 1; i++) { const ds = s[i].distanceTo(s[i - 1]); if (s[i].y < s[i - 1].y - .45 * ds && floorAt(s[i].x, s[i].z, r) > -1) s[i].y = Math.max(s[i].y, s[i - 1].y - .45 * ds); }
  for (let i = s.length - 2; i > 0; i--) { const ds = s[i].distanceTo(s[i + 1]); if (s[i].y < s[i + 1].y - .45 * ds && floorAt(s[i].x, s[i].z, r) > -1) s[i].y = Math.max(s[i].y, s[i + 1].y - .45 * ds); }
  return s;
}

// Per-cable adjustments the scene's paths are drawn through. The phone's USB-C cable is a slim
// 3 mm one with slack in it: one soft loop lies on the desk between the MacBook and the phone.
// `loop.at` picks the path point the loop replaces; `rho` its radius, `pitch` how far it advances
// per radian (rho > pitch makes it cross itself), `side` which way it curls (+1 towards +z).
const TUNE = {
  'usb-c': { r: .15, loop: { at: V(15.5, 0, 12.4), rho: 3.1, pitch: 1.35, side: 1 } },
};

// replace the path point nearest `at` with a prolate-trochoid loop along the path's direction there
function withLoop(pts, { at, rho, pitch, side }) {
  let k = 1, best = Infinity;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.hypot(pts[i].x - at.x, pts[i].z - at.z); if (d < best) { best = d; k = i; } }
  const dir = V(pts[k + 1].x - pts[k - 1].x, 0, pts[k + 1].z - pts[k - 1].z).normalize(), lat = V(-dir.z, 0, dir.x);
  if (lat.z * side < 0) lat.negate();
  const c = pts[k], y = c.y, loop = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20 * Math.PI * 2, u = pitch * (t - Math.PI) + rho * Math.sin(t), w = rho * (1 - Math.cos(t));
    loop.push(V(c.x + dir.x * u + lat.x * w, y, c.z + dir.z * u + lat.z * w));
  }
  return [...pts.slice(0, k), ...loop, ...pts.slice(k + 1)];
}

// where a cable crosses itself, the later pass rides over the earlier one and eases back down
function overCrossings(path, r) {
  const c0 = new THREE.CatmullRomCurve3(path, false, 'catmullrom', .2), s = c0.getSpacedPoints(Math.round(c0.getLength() / .2));
  const need = s.map(p => p.y), arc = [0];
  for (let i = 1; i < s.length; i++) arc.push(arc[i - 1] + s[i].distanceTo(s[i - 1]));
  for (let j = 0; j < s.length; j++) for (let i = 0; i < j; i++) {
    if (arc[j] - arc[i] < 6 * r + 1) continue;
    if (Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z) < 2 * r + .12) need[j] = Math.max(need[j], s[i].y + 2 * r + .03);
  }
  // a soft bump, 3.4 cm either side of each point that has to clear the other pass
  const lift = s.map(p => p.y), W = 3.4;
  for (let j = 0; j < s.length; j++) if (need[j] > s[j].y)
    for (let i = 0; i < s.length; i++) { const x = Math.abs(arc[i] - arc[j]) / W; if (x < 1) lift[i] = Math.max(lift[i], s[i].y + (need[j] - s[j].y) * .5 * (1 + Math.cos(Math.PI * x))); }
  return s.map((p, i) => V(p.x, lift[i], p.z));
}

export function cable(name, pts, { r = .2, color = 0x1f1f22, braided = true, rough = .55 } = {}) {
  const tune = TUNE[name] || {};
  if (tune.r) r = tune.r;
  if (tune.loop) pts = withLoop(pts, tune.loop);
  let path = settle(pts, r);
  if (tune.loop) path = overCrossings(path, r);
  const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', .2);
  const len = curve.getLength();
  const segs = Math.max(60, Math.round(len * 3));
  const g = new THREE.TubeGeometry(curve, segs, r, 14, false);
  braidTex = braidTex || jt('braid', 'c', { srgb: false, cost: 30 });
  const b = braided ? rep(braidTex.clone(), len / (r * 5), 2) : null;
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: rough, bumpMap: braided ? b : null, bumpScale: braided ? .025 : 0, sheen: braided ? .5 : 0, sheenRoughness: .6, sheenColor: new THREE.Color(braided ? 0x999999 : 0x000000) });
  const m = shade(new THREE.Mesh(g, mat));
  cables.push({ name, curve, r, mesh: m });
  return m;
}

// a plug: body along +x from the port face, a strain relief, and an optional LED
export function plug(port, { len = 1.8, w = .95, h = .36, color = 0x2a2a2e, metal = false, led = null } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, metalness: metal ? .8 : 0, roughness: metal ? .35 : .45, clearcoat: metal ? 0 : .3 });
  const body = shade(new THREE.Mesh(new RoundedBoxGeometry(len, h, w, 3, Math.min(h, w) * .45), mat)); body.position.x = len / 2; g.add(body);
  const relief = shade(new THREE.Mesh(new THREE.CylinderGeometry(.24, .3, .9, 20).rotateZ(Math.PI / 2), mat)); relief.position.x = len + .4; g.add(relief);
  if (led) { const l = new THREE.Mesh(new THREE.CircleGeometry(.06, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: led })); l.position.set(.5, h / 2 + .002, 0); g.add(l); g.userData.led = l; }
  g.position.copy(port.p); g.quaternion.setFromUnitVectors(V(1, 0, 0), port.d);
  g.userData.end = port.p.clone().addScaledVector(port.d, len + .8);
  return g;
}

// Check every cable against every footprint, the desk and the wall; and footprints against each other.
export function collisions({ desk, wallZ }) {
  const out = [], inv = new THREE.Matrix4(), q = V(0, 0, 0), p = V(0, 0, 0);
  for (const f of footprints) f.inv = inv.copy(f.obj.matrixWorld).invert().clone();
  for (const c of cables) {
    const n = Math.round(c.curve.getLength() * 2);
    for (let i = 0; i <= n; i++) {
      c.curve.getPointAt(i / n, p);
      const t = i / n;
      if (Math.abs(p.x) < desk.w / 2 && Math.abs(p.z) < desk.d / 2 && p.y < c.r - .03) out.push(`${c.name} under the desk top at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
      if (p.z < wallZ + c.r - .02) out.push(`${c.name} in the wall`);
      for (const f of footprints) {
        if (f.cableOk && f.cableOk.includes(c.name) && (t < .06 || t > .94)) continue;
        q.copy(p).applyMatrix4(f.inv);
        if (Math.abs(q.x - f.ox) < f.w / 2 + c.r - .02 && Math.abs(q.z - f.oz) < f.d / 2 + c.r - .02 && q.y - c.r < f.top - .02 && q.y + c.r > f.base) {
          out.push(`${c.name} through ${f.name} at ${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)}`); break;
        }
      }
    }
  }
  // footprint pairs (2D OBB overlap), except things meant to rest on others
  const corners = f => { const pts = []; for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push(V(f.ox + sx * f.w / 2, 0, f.oz + sz * f.d / 2).applyMatrix4(f.obj.matrixWorld)); return pts; };
  const axes = pts => [V(pts[1].x - pts[0].x, 0, pts[1].z - pts[0].z).normalize(), V(pts[3].x - pts[0].x, 0, pts[3].z - pts[0].z).normalize()];
  for (let i = 0; i < footprints.length; i++) for (let j = i + 1; j < footprints.length; j++) {
    const a = footprints[i], b = footprints[j];
    if (a.tag === 'surface' || b.tag === 'surface' || (a.tag && a.tag === b.tag) || (a.on === b.name) || (b.on === a.name)) continue;
    const A = corners(a), B = corners(b); let sep = false;
    for (const ax of [...axes(A), ...axes(B)]) {
      const pa = A.map(v => v.x * ax.x + v.z * ax.z), pb = B.map(v => v.x * ax.x + v.z * ax.z);
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) { sep = true; break; }
    }
    if (!sep) out.push(`${a.name} overlaps ${b.name}`);
  }
  return out;
}
