// A matte white ceramic mug on a cork base (8.5 × 10 cm), a slim D handle set high,
// full of coffee. Click: it wobbles on its base and the coffee sloshes, then it settles.
import * as THREE from 'three';
import { V, TAU, shade, footprint } from './util.js';
import { M } from './mats.js';
import { jt } from './jobs.js';

export const MUG = { R: 4.25, H: 10, level: 8.85, CORK: 3 };

// a tube of oval section (`a` in the loop's plane, `b` across it) along `curve` in the xy plane,
// swelling into a fillet where it meets a cylinder wall of radius `R` about the y axis
function handleGeo(curve, a, b, R, tub = 200, rad = 32, L = 1.1) {
  const pos = [], uv = [], idx = [], P = V(0, 0, 0), T = V(0, 0, 0), N = V(0, 0, 0), B = V(0, 0, -1);
  for (let i = 0; i <= tub; i++) {
    const t = i / tub; curve.getPointAt(t, P); curve.getTangentAt(t, T); N.crossVectors(B, T).normalize();
    // the section swells gently over the last cm before the wall (flat where it enters it, so it
    // widens into the body like a slip-cast joint instead of standing on it as a collar)
    const d = Math.hypot(P.x, P.z) - R, x = Math.min(1, Math.max(0, d / L)), g = 1 - x * x * (3 - 2 * x);
    const sa = a * (1 + .55 * g), sb = b * (1 + .22 * g);
    for (let j = 0; j <= rad; j++) {
      const th = j / rad * TAU, c = Math.cos(th), s = Math.sin(th);
      pos.push(P.x + N.x * c * sa + B.x * s * sb, P.y + N.y * c * sa + B.y * s * sb, P.z + N.z * c * sa + B.z * s * sb); uv.push(t, j / rad);
    }
  }
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) { const p = i * (rad + 1) + j, q = p + rad + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  // weld the normals across the section's seam (j = 0 and j = rad are the same points)
  const n = g.attributes.normal;
  for (let i = 0; i <= tub; i++) { const p = i * (rad + 1), q = p + rad, v = V(n.getX(p) + n.getX(q), n.getY(p) + n.getY(q), n.getZ(p) + n.getZ(q)).normalize(); n.setXYZ(p, v.x, v.y, v.z); n.setXYZ(q, v.x, v.y, v.z); }
  // outward: a vertex's normal must point away from its section's centre
  { curve.getPointAt(.5, P); const k = (tub >> 1) * (rad + 1); const out = V(pos[k * 3] - P.x, pos[k * 3 + 1] - P.y, pos[k * 3 + 2] - P.z);
    if (out.dot(V(n.getX(k), n.getY(k), n.getZ(k))) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals();
      for (let i = 0; i <= tub; i++) { const p = i * (rad + 1), q = p + rad, v = V(n.getX(p) + n.getX(q), n.getY(p) + n.getY(q), n.getZ(p) + n.getZ(q)).normalize(); n.setXYZ(p, v.x, v.y, v.z); n.setXYZ(q, v.x, v.y, v.z); } } }
  return g;
}

export function buildMug({ reduced }) {
  const { R, H, CORK } = MUG, RC = R + .07;
  const root = new THREE.Group();            // on the desk; local +z is the way it falls
  const pivot = new THREE.Group(); pivot.position.set(0, 0, RC); root.add(pivot);
  const body = new THREE.Group(); body.position.set(0, 0, -RC); pivot.add(body);

  const outside = new THREE.MeshPhysicalMaterial({ color: 0xeeebe5, roughness: .62, roughnessMap: M.smudge2UV, clearcoat: .12, clearcoatRoughness: .55, specularIntensity: .5, sheen: .2, sheenRoughness: .8, sheenColor: new THREE.Color(0xffffff) });
  const inside = new THREE.MeshPhysicalMaterial({ color: 0xe9e5dd, roughness: .3, clearcoat: .5, clearcoatRoughness: .2 });
  // outer skin: rounded bottom edge (centre 3.45, .87; r .8), straight wall, thick rounded rim
  const arc = (cx, cy, r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const outer = [[0, .07], ...arc(3.45, .87, .8, -Math.PI / 2, 0, 10), [R, H - .26], ...arc(R - .24, H - .26, .24, 0, Math.PI / 2, 8)];
  body.add(shade(new THREE.Mesh(new THREE.LatheGeometry(outer.map(([x, y]) => new THREE.Vector2(x, y)), 128), outside)));
  const inner = [...arc(R - .24, H - .26, .24, Math.PI / 2, Math.PI, 8), [R - .48, 1.5], ...arc(R - 1.08, 1.5, .6, 0, -Math.PI / 2, 8), [0, .9]];
  body.add(shade(new THREE.Mesh(new THREE.LatheGeometry(inner.map(([x, y]) => new THREE.Vector2(x, y)), 128), inside)));
  // the cork sleeve: follows the rounded bottom, ends in a crisp edge at 3 cm
  const ck = { map: jt('cork', 'map', { repeat: [3, 1], cost: 40 }), bump: jt('cork', 'bump', { srgb: false, repeat: [3, 1] }) };
  const corkMat = new THREE.MeshStandardMaterial({ map: ck.map, bumpMap: ck.bump, bumpScale: .05, roughness: .92 });
  const cork = [[0, 0], [3.3, 0], ...arc(3.45, .87, .87, -Math.PI / 2 + .18, 0, 9), [RC, CORK], [R + .005, CORK + .004]];
  { const cg2 = new THREE.LatheGeometry(cork.map(([x, y]) => new THREE.Vector2(x, y)), 128), p = cg2.attributes.position, uv = cg2.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z); uv.setY(i, r < RC - .15 ? r / 2.25 : y / 2.25 + 2); }
    body.add(shade(new THREE.Mesh(cg2, corkMat))); }
  // the handle: a slim D set high (upper joint 1.5 cm under the rim, lower one just above the cork),
  // oval in section (.8 cm in the plane of the loop, 1.1 cm across), and slip-cast into the wall:
  // the section swells as it nears the body and both ends sink .4 cm into it, so there is no seam
  const hc = new THREE.CatmullRomCurve3([V(-3.8, 8.55, 0), V(-4.45, 8.57, 0), V(-5.6, 8.72, 0), V(-6.5, 8.3, 0), V(-6.88, 7.15, 0),
    V(-6.84, 5.65, 0), V(-6.4, 4.55, 0), V(-5.45, 4.0, 0), V(-4.45, 3.95, 0), V(-3.8, 3.95, 0)], false, 'centripetal');
  body.add(shade(new THREE.Mesh(handleGeo(hc, .4, .55, R), outside)));

  // coffee: dark, a crema ring at the wall, a meniscus that climbs the glaze, a slow ripple
  const coffeeU = { time: { value: 0 }, center: { value: new THREE.Vector3() }, amp: { value: 1 } };
  const coffee = new THREE.MeshPhysicalMaterial({ map: jt('crema', 'c', { cost: 5 }), roughness: .07, ior: 1.34, specularIntensity: .9, side: THREE.DoubleSide });
  coffee.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, coffeeU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <project_vertex>', '#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float time, amp; uniform vec3 center;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 d = vWp.xz - center.xz; float r = length(d) + 1e-3;
          float dh = amp * (.018 * cos(r * 5.5 - time * 2.1) + .01 * cos(r * 9.1 - time * 3.3 + 1.7)) * smoothstep(3.6, 1.0, r);
          normal = normalize((viewMatrix * vec4(normalize(vec3(-dh * d.x / r, 1., -dh * d.y / r)), 0.)).xyz); }`);
  };
  const RI = R - .48;
  const surf = new THREE.Mesh(new THREE.RingGeometry(0, RI - .28, 72, 10).rotateX(-Math.PI / 2), coffee); surf.position.y = MUG.level; body.add(surf);
  const menMat = new THREE.MeshPhysicalMaterial({ color: 0x5a3519, roughness: .08, ior: 1.34, side: THREE.DoubleSide, transparent: true, opacity: .92 });
  const men = new THREE.Mesh(new THREE.LatheGeometry([[RI - .3, 0], [RI - .15, .03], [RI - .06, .1], [RI - .015, .2], [RI, .32]].map(([x, y]) => new THREE.Vector2(x, y)), 96), menMat);
  men.position.y = MUG.level; body.add(men);

  /* ---------- click: it wobbles on its cork base, the coffee sloshes, it settles ----------
     (A full spill with a particle pour and a simulated puddle was built and tried; it did not read
     as real liquid, so, as agreed, the mug only wobbles.) */
  let state = 'full', t = 0, phase = 0;
  const tip = new THREE.Vector2();
  function click() {
    if (reduced()) return;           // nothing moves under reduced motion
    state = 'wobble'; t = 0; phase = Math.random() * TAU;
  }
  function update(dt, time) {
    coffeeU.time.value = time * (state === 'wobble' ? 2.6 : 1); surf.getWorldPosition(coffeeU.center.value);
    coffeeU.amp.value = reduced() ? 0 : state === 'wobble' ? 1 + 3 * Math.exp(-t * 1.6) : 1;
    if (state !== 'wobble') return false;
    t += dt;
    // a damped rock around the rim of the base: the tilt axis turns slowly, as a mug circles on its edge
    const amp = .11 * Math.exp(-t * 2.4) * Math.min(1, t * 8), w = 9.5;
    const a = Math.abs(Math.sin(t * w)) * amp, dir = phase + t * 2.2;
    tip.set(Math.cos(dir), Math.sin(dir));
    // tilt about the point of the cork's edge that stays on the desk
    pivot.position.set(tip.x * RC, 0, tip.y * RC); body.position.set(-tip.x * RC, 0, -tip.y * RC);
    pivot.rotation.set(tip.y * a, 0, -tip.x * a);
    men.rotation.set(-tip.y * a * .6, 0, tip.x * a * .6); surf.rotation.set(-tip.y * a * .6, 0, tip.x * a * .6);
    if (t > 2.2) { state = 'full'; pivot.rotation.set(0, 0, 0); pivot.position.set(0, 0, RC); body.position.set(0, 0, -RC); men.rotation.set(0, 0, 0); surf.rotation.set(0, 0, 0); }
    return true;
  }
  footprint('mug', root, 2 * RC + 3.8, 2 * RC, H, { ox: -1.8, oz: 0 });
  return { root, click, update, hit: [body], puddle: null, state: () => state, attach() {}, active: () => state === 'wobble' };
}
