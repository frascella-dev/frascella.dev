// iPad Pro 13" (M4) with Apple Pencil Pro, and an iPhone Pro.
import * as THREE from 'three';
import { RectAreaLight } from 'three';
import { V, TAU, shade, rr, slab, slabGeo, flatGeo, at, footprint } from './util.js';
import { M, displayMaterial } from './mats.js';

/* ================= iPad Pro 13" — 28.16 × 21.5 × 0.51 cm, silver ================= */
export const IW = 21.5, ID = 28.16, IH = .51, IR = 1.75, ISW = 19.72, ISD = 26.3, ISR = 1.05;
export const IGW = IW - .16, IGD = ID - .16;

export function buildIpad(padTex) {
  const ipad = new THREE.Group();
  ipad.add(slab(rr(IW - .12, ID - .12, IR - .06), IH, .06, M.alSilver, 3, 24));
  const dispMat = displayMaterial({ glass: [IGW, IGD], scr: [ISW, ISD, 0, 0], r: ISR, bright: 1.25, tex: padTex });
  const glass = new THREE.Mesh(flatGeo(IGW, IGD, IR - .08, 24), dispMat); glass.position.y = IH + .012; glass.receiveShadow = true; ipad.add(glass);
  // front camera on the long edge (landscape top)
  ipad.add(at(new THREE.Mesh(new THREE.CircleGeometry(.09, 20).rotateX(-Math.PI / 2), M.lens), IW / 2 - .42, IH + .006, 0));
  // the screen lights the desk a little
  const light = new RectAreaLight(0xfff3e4, .9, ISW, ISD); light.position.set(0, IH + .3, 0); light.rotation.x = Math.PI / 2; ipad.add(light);
  footprint('ipad', ipad, IW, ID, IH);

  // the pen (Apple Pencil Pro): 16.6 cm long, 0.89 cm across, one flat side along its whole length,
  // lying on it. Built ring by ring from one profile (dome, body, taper), with the flat as a soft
  // clamp of each ring, then the replaceable nib as its own part behind a hairline seam.
  const pencil = new THREE.Group(); pencil.name = 'pencil'; pencil.position.set(IW / 2 + 2.3, .08, .8); pencil.rotation.y = .05; ipad.add(pencil);
  {
    const L = 16.6, R = .445, FLAT = .55, H = Math.sqrt(R * R - FLAT * FLAT / 4), K = .03, SEG = 160;
    const z0 = -L / 2; // s = distance from the dome's end; +z points to the nib
    // one surface of revolution; rings whose radius passes the flat are clamped to it (softly, a small fillet)
    const ringMesh = (prof, mat, flat) => {
      const pos = [], uv = [], idx = [], n = prof.length;
      for (let i = 0; i < n; i++) {
        const [s, r] = prof[i];
        for (let j = 0; j <= SEG; j++) {
          const a = -Math.PI / 2 + j / SEG * TAU; // seam of the ring at the middle of the flat, out of sight
          let y = Math.sin(a) * r;
          if (flat) { const d = y + H; y = -H + (d + Math.sqrt(d * d + K * K)) / 2; }
          pos.push(Math.cos(a) * r, y, z0 + s); uv.push(j / SEG, s / L);
        }
      }
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < SEG; j++) {
        const a = i * (SEG + 1) + j, b = a + SEG + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const nr = g.attributes.normal;
      for (let i = 0; i < n; i++) {
        const a = i * (SEG + 1), b = a + SEG;
        if (prof[i][1] < 1e-4) { // a pole: the normal is the axis
          for (let j = a; j <= b; j++) nr.setXYZ(j, 0, 0, i === 0 ? -1 : 1);
          continue;
        }
        const x = (nr.getX(a) + nr.getX(b)) / 2, y = (nr.getY(a) + nr.getY(b)) / 2, z = (nr.getZ(a) + nr.getZ(b)) / 2;
        nr.setXYZ(a, x, y, z); nr.setXYZ(b, x, y, z);
      }
      return shade(new THREE.Mesh(g, mat));
    };
    const body = [];
    // top: a full round, a little flatter than a hemisphere
    const DOME = .36;
    for (let i = 0; i <= 20; i++) { const f = i / 20 * Math.PI / 2; body.push([DOME * (1 - Math.cos(f)), R * Math.sin(f)]); }
    // the straight body, full diameter until 2.35 cm from the tip (taper 1.4 cm, nib 0.95 cm)
    const S1 = L - 2.35, SEAM = L - .95, TIP_R = .245;
    for (let s = DOME + 1.5; s < S1 - .5; s += 1.5) body.push([s, R]);
    // the taper: short, smooth, slightly convex (tangent to the body where it starts)
    for (let i = 0; i <= 24; i++) { const t = i / 24; body.push([S1 + t * (SEAM - S1), R - (R - TIP_R) * Math.pow(t, 1.7)]); }
    // its end turns inward, round the nib's socket
    body.push([SEAM, .222], [SEAM - .02, .19], [SEAM - .03, 0]);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xf7f8f9, roughness: .25, metalness: 0, clearcoat: .8, clearcoatRoughness: .2, specularIntensity: .6 });
    pencil.add(ringMesh(body, mat, true));
    // the seam: a hairline of shadow between the body and the nib
    pencil.add(ringMesh([[SEAM - .02, .238], [SEAM + .012, .238]], new THREE.MeshStandardMaterial({ color: 0x4a4843, roughness: .7 }), false));
    // the nib: a separate small cone, cooler and a little translucent, ending in a small round tip
    const NB = SEAM + .012, NL = L - NB, NR = .232, RHO = .045;
    // the tangent point on the tip's round, where the cone's line from the base touches it
    let lo = .05, hi = Math.PI / 2 - .01, beta = 1;
    for (let k = 0; k < 40; k++) {
      beta = (lo + hi) / 2;
      const ps = RHO - RHO * Math.cos(beta), pr = RHO * Math.sin(beta);
      const cone = (NR - pr) / (NL - ps), arc = Math.cos(beta) / Math.sin(beta);
      if (arc > cone) lo = beta; else hi = beta;
    }
    const nib = [[NB - .1, .228], [NB, .228], [NB + .004, NR]];
    const ps = RHO - RHO * Math.cos(beta);
    for (let i = 1; i < 14; i++) { const t = i / 14, sp = NL - t * (NL - ps), pr = NR - t * (NR - RHO * Math.sin(beta)); nib.push([L - sp, pr + .006 * Math.sin(t * Math.PI)]); }
    for (let i = 0; i <= 12; i++) { const b = beta * (1 - i / 12); nib.push([L - (RHO - RHO * Math.cos(b)), RHO * Math.sin(b)]); }
    const nibMat = new THREE.MeshPhysicalMaterial({ color: 0xe4e7e9, roughness: .35, clearcoat: .15, clearcoatRoughness: .4, sheen: .5, sheenRoughness: .5, sheenColor: new THREE.Color(0xf6f8f8), emissive: 0x141719, specularIntensity: .45 });
    pencil.add(ringMesh(nib, nibMat, false));
    // rest the flat on the desk
    const CY = H - K * K / (4 * (R - H));
    for (const c of pencil.children) c.position.y = CY;
  }
  footprint('pencil', pencil, 1, 17, .9);
  return { ipad, glass, dispMat, light };
}

/* ================= iPhone Pro — 14.66 × 7.08 × 0.83 cm, natural titanium ================= */
export const PW = 7.08, PD = 14.66, PH = .83, PR = 1.2;

// The phone's glass: a switched-off OLED (deep black, only the room in it, the Dynamic Island a
// slightly different black) that a click turns into a dead display — vertical single-colour lines,
// garbage bands, dead blocks round an impact, an ink bleed from a corner. All procedural, one
// uniform switches it; a second of flicker after the click, then steady.
function phoneScreenMaterial({ glass, scr, r, island }) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, metalness: 0, ior: 1.5, specularIntensity: .8, emissive: 0xffffff, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const U = {
    glassSize: { value: new THREE.Vector2(...glass) }, scrRect: { value: new THREE.Vector4(...scr) }, scrR: { value: r }, island: { value: new THREE.Vector4(...island) },
    broken: { value: 0 }, flick: { value: 0 }, tm: { value: 0 },
  };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGlassUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvGlassUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vGlassUv; uniform vec2 glassSize; uniform vec4 scrRect, island; uniform float scrR, broken, flick, tm;
      float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
      float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h1(i), h1(i + 1.), f); }
      float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h2(i), h2(i + vec2(1., 0.)), f.x), mix(h2(i + vec2(0., 1.)), h2(i + 1.), f.x), f.y); }
      // a dead column driver's colours: blue, red, green, cyan, white, lilac
      vec3 pal(float k){ k = floor(k * 6.); return k < 1. ? vec3(.1, .25, 1.) : k < 2. ? vec3(1., .12, .1) : k < 3. ? vec3(.15, 1., .3) : k < 4. ? vec3(.1, .9, 1.) : k < 5. ? vec3(1.) : vec3(.75, .55, 1.); }
      // u: 0..1 on the panel, y up; t: seconds; fl: flicker amount (0 = steady)
      vec3 deadPanel(vec2 u, float t, float fl){
        float fr = floor(t * 22.);
        vec2 v = u; v.x += fl * (h1(fr + .7) - .5) * .05 * step(.6, h1(fr + 2.3));
        // a few thin horizontal glitch lines near the top shift the columns under them
        float gl = 0.;
        for (int i = 0; i < 4; i++) { float fi = float(i), y0 = .86 + .11 * h1(fi * 3.1 + 1.7);
          float on = step(abs(u.y - y0), .0012 + .0022 * h1(fi + 5.)); gl = max(gl, on); v.x += on * (h1(fi + 9.) - .5) * .08; }
        // dense thin stripes: one random colour and brightness per column, 1-2 px pitch
        float col = floor(v.x * 420.);
        vec3 sc = pal(h1(col * .731 + 2.)) * pow(h1(col * 1.37 + .5), 2.2);
        // soft, curved regions from a low-frequency noise field
        float n = vn2(u * vec2(2.2, 3.4) + 1.3) * .65 + vn2(u * vec2(5., 7.) + 7.1) * .35;
        vec3 navy = vec3(.012, .018, .055);
        // the dense multicolour band across the middle, wavy edges
        float mid = .44 + .09 * sin(u.x * 5.5 + 1.) + .12 * (n - .5);
        float dense = smoothstep(.15, .1, abs(u.y - mid));
        // the dark navy blob above it: stripes sparse and dim
        float dark = smoothstep(.02, -.04, length((u - vec2(.55, .7)) * vec2(1.1, 1.)) - .26 - .18 * (n - .5));
        // the washed-out region: top left, and a strip down the right edge
        float pale = max(smoothstep(.05, -.03, length((u - vec2(-.08, 1.04)) * vec2(1., .75)) - .22 - .2 * (n - .5)),
                         smoothstep(.9, .95, u.x + .06 * (n - .5)) * smoothstep(.3, .5, u.y));
        vec3 c = navy + sc * .13 * step(.35, h1(col * 2.1));                                     // elsewhere: medium stripes on navy
        c = mix(c, navy * .7 + sc * step(.86, h1(col * 3.3)) * .12, dark);
        c = mix(c, navy + sc * .9, dense * (1. - dark));
        c = mix(c, vec3(.62, .6, .75) * (.75 + .3 * h1(col * 5.1)), pale);
        c = mix(c, pal(h1(floor(u.x * 90.) + fr)) * .7, gl);
        // the unmistakable part: thick saturated green bars, full height, on the right
        for (int i = 0; i < 3; i++) { float fi = float(i), x0 = .64 + fi * .075 + .02 * h1(fi + 4.2), w = (8. + 7. * h1(fi + 8.8)) / 390.;
          c = mix(c, vec3(.0, .75, .04), step(abs(v.x - x0), w * .5)); }
        // the flicker: the whole panel stutters
        c *= mix(1., .15 + 1.3 * h1(fr * 1.7 + .2), fl);
        return c;
      }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 phP = (vGlassUv - .5) * glassSize - scrRect.zw;
        vec2 phHb = scrRect.xy * .5;
        float phD = sdRound(phP, phHb, scrR), phAa = fwidth(phD) * .8 + 1e-4;
        float phPanel = 1. - smoothstep(-phAa, phAa, phD);
        float phIsl = 1. - smoothstep(-phAa, phAa, sdRound(phP - island.zw, island.xy * .5, island.y * .5));
        // bezel pure black, the panel a hair lifted and cool, the island blacker and warmer
        diffuseColor.rgb = mix(vec3(.002), vec3(.011, .012, .015), phPanel);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.0005, .0005, .0004), phIsl);`)
      .replace('#include <emissivemap_fragment>', `
        {
          float on = phPanel * (1. - phIsl) * broken;
          vec3 s = on > 0. ? deadPanel(phP / scrRect.xy + .5, tm, flick) : vec3(0.);
          totalEmissiveRadiance = s * on;
        }`);
  };
  m.customProgramCacheKey = () => 'phone-screen';
  return m;
}

export function buildIphone() {
  const phone = new THREE.Group();
  // it rests on its camera plateau and its bottom edge
  const body = new THREE.Group(); body.rotation.x = .0157; body.position.y = .118; phone.add(body);
  body.add(slab(rr(PW - .24, PD - .24, PR - .12), PH, .12, M.titanium, 4, 20));
  const GW = PW - .26, GD = PD - .26, SW = 6.5, SD = 14.1;
  const dispMat = phoneScreenMaterial({ glass: [GW, GD], scr: [SW, SD, 0, 0], r: .95, island: [2.05, .6, 0, SD / 2 - .52] });
  const glass = new THREE.Mesh(flatGeo(GW, GD, PR - .13, 20), dispMat); glass.position.y = PH + .012; body.add(glass);
  // the screen's state: off ↔ broken. toggle(steady) flips it (steady: no flicker, for reduced
  // motion); tick(dt) runs the flicker and says whether a frame is wanted.
  const SU = dispMat.userData.U, FLICK = 1.1;
  let left = 0;
  const screen = {
    broken: () => SU.broken.value > 0,
    toggle(steady = false) {
      SU.broken.value = SU.broken.value > 0 ? 0 : 1;
      left = SU.broken.value && !steady ? FLICK : 0; SU.flick.value = left ? 1 : 0;
      return this.broken();
    },
    tick(dt) {
      if (left <= 0) return false;
      if (dt <= 0) { left = 0; SU.flick.value = 0; return true; }
      left = Math.max(0, left - dt); SU.tm.value += dt;
      SU.flick.value = left > 0 ? Math.min(1, left / FLICK * 1.6) : 0;
      return true;
    },
  };
  for (const [x, z, len] of [[-1, -4.6, .75], [-1, -3.0, 1.3], [-1, -1.35, 1.3], [1, -2.6, 2.1], [1, 1.2, 1.5]]) {
    body.add(at(shade(new THREE.Mesh(slabGeo(rr(.12, len, .05), .26, .05), M.titanium)), x * (PW / 2 + .02), PH / 2 - .13, z));
  }
  // camera plateau on the back, facing the desk
  const pl = new THREE.Group(); pl.position.set(PW / 2 - 2.05, 0, -PD / 2 + 2.05); body.add(pl);
  const plat = slab(rr(3.5, 3.5, .9), .08, .03, new THREE.MeshPhysicalMaterial({ color: 0x8e8983, roughness: .2, clearcoat: 1 })); plat.position.y = -.08; pl.add(plat);
  for (const [x, z] of [[-.82, -.82], [-.82, .82], [.82, 0]]) pl.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(.62, .64, .12, 40), M.titanium)), x, -.14, z));
  footprint('iphone', phone, PW, PD, PH + .24);
  // the USB-C port, bottom edge
  const port = { p: V(0, .118 + PH / 2, PD / 2), d: V(0, 0, 1) };
  return { phone, body, glass, dispMat, port, screen };
}
