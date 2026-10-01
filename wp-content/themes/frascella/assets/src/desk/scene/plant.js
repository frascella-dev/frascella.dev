// An echeveria in a small faceted white ceramic pot, topped with fine black gravel.
// Pot: one lathe-like grid whose outside is the soft intersection of triangular facet planes
// (diamond rows, slightly rounded edges), a rounded rim of visible thickness and a narrower foot.
// Gravel: a dark bed and a few thousand irregular grains in two meshes (matte, and glinting).
// Rosette: ~36 thick lofted leaves on a 137.5° spiral, merged into one mesh with vertex colours
// (glaucous green at the heart, pink-red at tips and edges) and a powdery sheen.
// Touch it (plant.poke()): the leaves tremble — a damped micro-oscillation in the vertex shader,
// stronger at the tips, one phase per leaf — and ~20 faint warm motes rise from the rosette and fade
// (one additive Points draw call, hidden when idle). plant.tick(dt) returns true while either runs.
import * as THREE from 'three';
import { TAU, rnd, reseed, shade, footprint, tick } from './util.js';

const H = 7.5;          // pot height
const RIM_T = .42;      // rim thickness
const SOIL = H - .55;   // top of the gravel

/* ---------- the pot ---------- */
function facetPlanes() {
  const N = 9;
  // rings of facet corners [y, r], each rotated half a facet from the one below
  const rings = [[.45, 3.3], [2.1, 4.35], [3.95, 4.8], [5.8, 4.62], [H, 4.08]];
  const pt = (k, j) => { const [y, r] = rings[k], a = (j + (k % 2) * .5) / N * TAU; return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r); };
  const planes = [];
  const add = (a, b, c) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    const mid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    if (n.x * mid.x + n.z * mid.z < 0) n.negate();
    planes.push({ n, d: n.dot(a) });
  };
  for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < N; j++) {
    const a0 = pt(k, j), a1 = pt(k, j + 1), b0 = pt(k + 1, j), b1 = pt(k + 1, j + 1);
    if (k % 2 === 0) { add(a0, b0, a1); add(a1, b0, b1); } else { add(a0, b0, b1); add(a0, b1, a1); }
  }
  return planes;
}

function potGeometry() {
  const planes = facetPlanes(), NA = 126, K = .025;
  // distance from the axis to the (softly) faceted surface, along a horizontal ray
  const radius = (a, y) => {
    const dx = Math.cos(a), dz = Math.sin(a); let s = 0, tmin = 1e9; const ts = [];
    for (const { n, d } of planes) { const nd = n.x * dx + n.z * dz; if (nd < 1e-3) continue; const t = (d - n.y * y) / nd; ts.push(t); tmin = Math.min(tmin, t); }
    for (const t of ts) s += Math.exp(-(t - tmin) / K);
    return tmin - K * Math.log(s);
  };
  const rIn = 3.45;
  // the profile: bottom, foot, faceted body, rounded rim, inner wall, hidden inner floor
  const rows = [];
  rows.push(() => [0, 0], () => [3.05, 0], () => [3.22, .06], () => [3.3, .2], () => [3.32, .38]);
  const NB = 44;
  for (let i = 0; i <= NB; i++) { const y = .5 + (H - .62) * i / NB; rows.push(a => [radius(a, y), y]); }
  rows.push(a => [radius(a, H - .04) - .05, H - .01], a => [radius(a, H) - .14, H], () => [rIn + .12, H], () => [rIn + .02, H - .06], () => [rIn, H - .16], () => [rIn, SOIL - .35], () => [0, SOIL - .35]);
  const pos = [], idx = [];
  for (const f of rows) for (let j = 0; j < NA; j++) { const a = j / NA * TAU, [r, y] = f(a); pos.push(Math.cos(a) * r, y, Math.sin(a) * r); }
  for (let r = 0; r < rows.length - 1; r++) for (let j = 0; j < NA; j++) {
    const a = r * NA + j, b = r * NA + (j + 1) % NA, u = a + NA, ub = b + NA;
    idx.push(a, u, b, b, u, ub);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return { g, rIn };
}

/* ---------- the gravel ---------- */
// 32 random draws per grain: tools/seeds.mjs counts them, keep it in step
function gravel(rIn, seed) {
  reseed(seed);   // the numbers the prototype drew at this point (seeds.js)
  const out = [[], []], col = [[], []];
  const R = rIn - .06, v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const base = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  const NG = 2700;
  for (let i = 0; i < NG; i++) {
    const r = Math.sqrt(rnd()) * R, a = rnd() * TAU, s = .055 + rnd() * rnd() * .1;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = SOIL - .04 + rnd() * .09 + .06 * (1 - r / R);
    e.set(rnd() * TAU, rnd() * TAU, rnd() * TAU); q.setFromEuler(e);
    const sc = [s * (.8 + rnd() * .5), s * (.45 + rnd() * .35), s * (.7 + rnd() * .5)];
    const vs = base.map(b => v.set(b[0] * sc[0] * (.75 + rnd() * .5), b[1] * sc[1] * (.75 + rnd() * .5), b[2] * sc[2] * (.75 + rnd() * .5)).applyQuaternion(q).toArray());
    const glint = rnd() < .2 ? 1 : 0, P = out[glint];
    const g = glint ? .7 + rnd() * .3 : .025 + rnd() * .05, tint = rnd() < .5 ? [1, 1, 1.05] : [1.04, 1, 1];
    for (const f of faces) for (const k of f) { P.push(vs[k][0] + cx, vs[k][1] + cy, vs[k][2] + cz); col[glint].push(g * tint[0], g * tint[1], g * tint[2]); }
  }
  const mk = (p, c, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals(); const m = shade(new THREE.Mesh(g, mat), false, true); m.userData.keep = true; return m;
  };
  const matte = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1d, vertexColors: true, roughness: .5, specularIntensity: .7, flatShading: true });
  const shiny = new THREE.MeshPhysicalMaterial({ color: 0x2a2a30, vertexColors: true, roughness: .06, metalness: .9, clearcoat: 1, clearcoatRoughness: .04, flatShading: true });
  const bed = new THREE.Mesh(new THREE.CircleGeometry(rIn + .01, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: .95 }));
  bed.position.y = SOIL - .03; bed.receiveShadow = true;
  return [bed, mk(out[0], col[0], matte), mk(out[1], col[1], shiny)];
}

/* ---------- the rosette ---------- */
function rosette() {
  const NL = 36, NU = 13, NV = 12;
  const pos = [], colr = [], idx = [], sway = [];
  let hs = 7; const hr = () => (hs = (hs * 16807) % 2147483647) / 2147483647;   // local: keeps util's rnd() sequence
  const srgb = h => new THREE.Color().setStyle(h, THREE.SRGBColorSpace);
  const HEART = srgb('#a9c79a'), BODY = srgb('#78a384'), OUTER = srgb('#6a9780'), TIP = srgb('#b83e4c'), EDGE = srgb('#d27c86');
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), p = new THREE.Vector3(), c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < NL; i++) {
    const t = i / (NL - 1);                                  // 0 outer … 1 heart
    const L = 3.5 - 2.55 * Math.pow(t, .8), W = L * (.36 - .06 * t), T = W * .36;
    const tilt = .16 + 1.05 * Math.pow(t, 1.3), bend = .1 + .22 * t;
    const ang = i * 137.5 * Math.PI / 180, r0 = .55 * (1 - t) + .08;
    e.set(-tilt, Math.PI / 2 - ang, 0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(Math.cos(ang) * r0, SOIL + .12 + t * 1.25, Math.sin(ang) * r0), q, new THREE.Vector3(1, 1, 1));
    const base = pos.length / 3, ph = hr() * TAU, fm = .85 + hr() * .3;
    for (let a = 0; a <= NU; a++) {
      const u = a / NU;
      const f = u < .62 ? .42 + .58 * Math.sin(Math.PI / 2 * u / .62) : 1 - Math.pow((u - .62) / .38, 1.5);
      const w = W * Math.max(f, 0), tt = T * Math.pow(1 - u, .55) + .015, tb = T * 1.45 * Math.pow(1 - u, .7) + .02;
      const sz = L * u, sy = L * bend * u * u;
      for (let b = 0; b < NV; b++) {
        const th = b / NV * TAU, s = Math.cos(th), sn = Math.sin(th);
        const y = sn >= 0 ? tt * Math.sqrt(sn) - tt * .55 * sn * sn : -tb * Math.sqrt(-sn);
        p.set(w * s, y + sy, sz).applyMatrix4(m); pos.push(p.x, p.y, p.z);
        sway.push(Math.pow(u, 1.6) * (1 - .45 * t), ph, fm);            // how far along the leaf, its phase, its pitch
        // colour: heart green → body → pink-red tip; the margins blush first; the underside a shade darker
        c.copy(HEART).lerp(t > .5 ? HEART : OUTER, 1 - Math.min(1, t * 2)).lerp(BODY, (1 - t) * .4);
        const blush = Math.min(1, Math.pow(u, 3.2) * (1.3 - .9 * t) + Math.pow(Math.abs(s), 8) * u * (.8 - .6 * t));
        c2.copy(EDGE).lerp(TIP, Math.pow(u, 3));
        c.lerp(c2, blush);
        if (sn < 0) c.multiplyScalar(.82);
        colr.push(c.r, c.g, c.b);
      }
    }
    for (let a = 0; a < NU; a++) for (let b = 0; b < NV; b++) {
      const i0 = base + a * NV + b, i1 = base + a * NV + (b + 1) % NV, j0 = i0 + NV, j1 = i1 + NV;
      idx.push(i0, i1, j0, i1, j1, j0);
    }
    // close the base
    const cb = pos.length / 3; p.set(0, 0, 0).applyMatrix4(m); pos.push(p.x, p.y, p.z); colr.push(HEART.r * .8, HEART.g * .8, HEART.b * .8); sway.push(0, ph, fm);
    for (let b = 0; b < NV; b++) idx.push(cb, base + (b + 1) % NV, base + b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const uSway = { value: 0 }, uPhase = { value: 0 };
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .62, sheen: .7, sheenRoughness: .8, sheenColor: srgb('#d9e2e6'), specularIntensity: .4, clearcoat: .15, clearcoatRoughness: .5 });
  // a soft back-lit glow: light through the thin tips, tinted by the leaf's own colour
  // the tremble: each vertex moves round the axis (a small twist) and bobs, by its distance along
  // its leaf; uSway is the damped envelope (cm at a tip), uPhase the oscillator's time × 2π·f
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSway = uSway; sh.uniforms.uPhase = uPhase;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aSway; uniform float uSway, uPhase;`).replace('#include <begin_vertex>', `#include <begin_vertex>
      if (uSway > 0.) {
        float k = aSway.x * uSway, o = sin(uPhase * aSway.z + aSway.y);
        vec2 rad = transformed.xz; float rl = max(length(rad), .05);
        transformed.xz += vec2(-rad.y, rad.x) / rl * o * k;
        transformed.y += cos(uPhase * aSway.z * 1.3 + aSway.y * 1.7) * k * .45;
      }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(1., .75, .7) * .06;`);
  };
  const mesh = shade(new THREE.Mesh(g, mat)); mesh.userData.keep = true;
  mesh.userData.sway = { uSway, uPhase };
  return mesh;
}

/* ---------- the sparkle: a few warm motes rising from the rosette ---------- */
const MOTES = 20, SPARK_T = 3;
function sparkle() {
  let hs = 11; const hr = () => (hs = (hs * 16807) % 2147483647) / 2147483647;
  const pos = new Float32Array(MOTES * 3), seed = new Float32Array(MOTES * 4), look = new Float32Array(MOTES * 4);
  for (let i = 0; i < MOTES; i++) {
    const a = hr() * TAU, r = Math.sqrt(hr()) * 1.9;
    pos.set([Math.cos(a) * r, SOIL + 1.1 + hr() * 1.1, Math.sin(a) * r], i * 3);
    // delay, life, rise speed (cm/s), sideways drift direction
    seed.set([hr() * .55, 1.7 + hr() * .8, .9 + hr() * .9, hr() * TAU], i * 4);
    // size (cm), brightness, wobble phase, wobble rate
    look.set([.09 + hr() * .1, .45 + hr() * .55, hr() * TAU, 1.2 + hr() * 1.6], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('aLook', new THREE.BufferAttribute(look, 4));
  const u = { uT: { value: 0 }, uPx: { value: 800 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      attribute vec4 aSeed, aLook; uniform float uT, uPx; varying float vA;
      void main() {
        float t = uT - aSeed.x, life = clamp(t / aSeed.y, 0., 1.);
        vec3 p = position;
        p.y += t * aSeed.z * (1. - .35 * life);
        p.xz += vec2(cos(aSeed.w), sin(aSeed.w)) * t * .35 + vec2(sin(t * aLook.w + aLook.z), cos(t * aLook.w * .8 + aLook.z)) * .25 * life;
        vA = step(0., t) * smoothstep(0., .18, life) * (1. - smoothstep(.45, 1., life)) * aLook.y
           * (.75 + .25 * sin(t * 9. + aLook.z * 3.));
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.5, aLook.x * uPx / -mv.z);
      }`,
    fragmentShader: `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        float a = exp(-d * d * 3.5) * (1. - d) * vA;
        if (a < .002) discard;
        gl_FragColor = vec4(vec3(1., .8, .52) * a * .55, 1.);
      }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 5;
  const sz = new THREE.Vector2();
  // point size in pixels per cm at depth 1: the drawing buffer's height over the frustum's height
  pts.onBeforeRender = (r, s, cam) => { r.getDrawingBufferSize(sz); u.uPx.value = sz.y * cam.projectionMatrix.elements[5] / 2; };
  return { pts, u };
}

// async: it yields between the pot, the gravel and the rosette
export async function buildPlant({ reduced = () => false, seed } = {}) {
  const plant = new THREE.Group();
  const glaze = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: .9, envMapIntensity: .15 }); // matte, no reflections (owner)
  const { g, rIn } = potGeometry();
  plant.add(shade(new THREE.Mesh(g, glaze)));
  await tick();
  plant.add(...gravel(rIn, seed));
  await tick();
  const leaves = rosette(), { uSway, uPhase } = leaves.userData.sway;
  plant.add(leaves);
  const sp = sparkle(); plant.add(sp.pts);
  footprint('plant', plant, 9.6, 9.6, 10.5);

  // touch: under reduced motion nothing moves (the caller still announces it)
  let t = -1;
  plant.poke = () => { if (reduced()) return false; t = 0; sp.pts.visible = true; return true; };
  plant.tick = dt => {
    if (t < 0) return false;
    t = reduced() ? 1e9 : t + dt;
    const TR = 1.6, F = 4.2;                                   // tremble: settles in ~1.5 s, ~4 Hz
    uSway.value = t < TR ? .2 * (1 - Math.exp(-t / .05)) * Math.exp(-t / .36) : 0;
    uPhase.value = t * F * TAU;
    sp.u.uT.value = t;
    if (t >= Math.max(TR, SPARK_T)) { t = -1; uSway.value = 0; sp.pts.visible = false; }
    return true;
  };
  return plant;
}
