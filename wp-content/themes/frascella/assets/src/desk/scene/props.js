// The notebook, the polaroids, the repair kit and the 5G router.
import * as THREE from 'three';
import { V, TAU, rnd, reseed, drawTex, shade, rr, rrPath, slab, slabGeo, at, turned, footprint, tex } from './util.js';
import { M } from './mats.js';
import { knurl, stripes, T, rep } from './tex.js';
import { jt } from './jobs.js';
import { NB } from './gen.js';

/* ================= the open notebook ================= */
export { NB };
const yTop = x => NB.ct + .04 + NB.T * (1 - Math.exp(-x / 1.25)) * (1 - .06 * Math.pow(x / NB.pw, 2));

function pageBlock(sign, nx = 44, nz = 10) {
  const { pw, ph, ct } = NB, pos = [], uv = [], idx = [], grp = [];
  const xs = []; for (let i = 0; i <= nx; i++) xs.push(pw * Math.pow(i / nx, 1.5));
  // top
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = xs[i], z = -ph / 2 + ph * j / nz;
    pos.push(sign * x, yTop(x), z); uv.push(.5 + sign * .5 * x / pw, 1 - j / nz);
  }
  const tri = (a, b, c) => sign > 0 ? idx.push(a, b, c) : idx.push(a, c, b);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; tri(a, c, b); tri(b, c, d); }
  const topCount = idx.length;
  // front and back profiles
  for (const zs of [ph / 2, -ph / 2]) {
    const o = pos.length / 3;
    for (let i = 0; i <= nx; i++) { const x = xs[i]; pos.push(sign * x, ct, zs, sign * x, yTop(x), zs); uv.push(x / pw, 0, x / pw, 1); }
    for (let i = 0; i < nx; i++) { const a = o + i * 2, b = a + 1, c = a + 2, d = a + 3; if (zs > 0) { tri(a, c, b); tri(b, c, d); } else { tri(a, b, c); tri(b, d, c); } }
  }
  // outer edge
  { const o = pos.length / 3, x = pw, y1 = yTop(pw);
    for (let j = 0; j <= nz; j++) { const z = -ph / 2 + ph * j / nz; pos.push(sign * x, ct, z, sign * x, y1, z); uv.push(j / nz, 0, j / nz, 1); }
    for (let j = 0; j < nz; j++) { const a = o + j * 2, b = a + 1, c = a + 2, d = a + 3; tri(a, b, c); tri(b, d, c); } }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.addGroup(0, topCount, 0); g.addGroup(topCount, idx.length - topCount, 1);
  g.computeVertexNormals(); return g;
}

export function buildNotebook() {
  const nb = new THREE.Group();
  const coverMat = new THREE.MeshPhysicalMaterial({ color: 0x2b2a2e, roughness: .68, roughnessMap: M.smudge2, bumpMap: jt('grain90', 'c', { srgb: false, repeat: [.45, .45], cost: 2 }), bumpScale: .006, sheen: .3, sheenRoughness: .7, sheenColor: new THREE.Color(0x6a6660) });
  const cover = slab(rr(2 * NB.pw + .9, NB.ph + .7, .35), NB.ct, .05, coverMat, 2); nb.add(cover);
  // the spread: paper, dot grid and handwriting, painted in a worker (gen.js spread)
  const pageTex = jt('spread', 'c', { cost: 120 });
  const topMat = new THREE.MeshStandardMaterial({ map: pageTex, roughness: .88, bumpMap: jt('grain70', 'c', { srgb: false, repeat: [40, 28], cost: 2 }), bumpScale: .003 });
  const edgeMat = new THREE.MeshStandardMaterial({ map: rep(T(stripes(64, 32, .12)), 1, 1), color: 0xe4ddcf, roughness: .92 });
  for (const s of [1, -1]) nb.add(shade(new THREE.Mesh(pageBlock(s), [topMat, edgeMat])));
  // ribbon bookmark from the gutter over the bottom edge onto the desk
  {
    const pts = [], x = .55, w = .55;
    for (let i = 0; i <= 24; i++) { const z = -NB.ph / 2 + .5 + (NB.ph - .5) * i / 24; pts.push([z, yTop(x) + .012]); }
    pts.push([NB.ph / 2 + .18, NB.ct + .1], [NB.ph / 2 + .5, .15], [NB.ph / 2 + .9, .03], [NB.ph / 2 + 3.2, .03]);
    const pos = [], idx = [];
    pts.forEach(([z, y], i) => { const xx = x + Math.sin(i * .35) * .08 + (i > 24 ? (i - 24) * .35 : 0); pos.push(xx - w / 2, y, z, xx + w / 2, y, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    nb.add(shade(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x8d2a1b, roughness: .45, sheen: .6, sheenColor: new THREE.Color(0xff8a6a), side: THREE.DoubleSide }))));
  }
  // a black ballpoint, resting on the right page
  const pen = new THREE.Group();
  {
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x1e1e21, roughness: .38, roughnessMap: M.smudge2, clearcoat: .5, clearcoatRoughness: .2 });
    const body = turned([[0, 0], [0, .3], [.15, .41], [.6, .42], [11.2, .42], [11.25, .44], [11.9, .44], [12.9, .2], [13.2, .1]], { segs: 40 });
    pen.add(shade(new THREE.Mesh(body, mat)));
    pen.add(shade(new THREE.Mesh(turned([[13.15, .1], [13.45, .06], [13.6, .03], [13.62, 0]], { segs: 20 }), M.steel)));
    pen.add(shade(new THREE.Mesh(turned([[11.2, .445], [11.95, .445]], { segs: 40 }), M.steel)));
    pen.add(at(shade(new THREE.Mesh(slabGeo(rr(5.0, .28, .12), .07, .02), M.steel)), 6.2, .43, 0));
  }
  pen.position.set(3.6, yTop(9) + .42, 4.6); pen.rotation.y = .52; nb.add(pen);
  footprint('notebook', nb, 2 * NB.pw + .9, NB.ph + .7, .8);
  return { nb, pageTex };
}

/* ================= polaroids: 8.8 × 10.7 cm, image 7.9 × 7.9 ================= */
export function polaroid(url, curl = .12) {
  const g = new THREE.Group();
  const FW = 8.8, FH = 10.7, IS = 7.9, top = .55;
  const lift = (x, z) => curl * (Math.pow(x / (FW / 2), 2) * .7 + Math.pow(z / (FH / 2), 2) * .3);
  const plane = (w, h, cz, nx, nz) => { const pg = new THREE.PlaneGeometry(w, h, nx, nz); pg.rotateX(-Math.PI / 2); pg.translate(0, 0, cz); const p = pg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, lift(p.getX(i), p.getZ(i))); pg.computeVertexNormals(); return pg; };
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0xebe7de, roughness: .62, roughnessMap: M.smudge2, side: THREE.DoubleSide, sheen: .2, sheenColor: new THREE.Color(0xffffff) });
  const f = shade(new THREE.Mesh(plane(FW, FH, 0, 16, 20), frameMat)); f.position.y = .04; g.add(f);
  const edge = shade(new THREE.Mesh(plane(FW, FH, 0, 16, 20), new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: .8, side: THREE.DoubleSide }))); edge.position.y = .0; g.add(edge);
  // fetched after the first frame (main.js): at the first station the photos are a few pixels
  const t = tex(url, tx => { const a = tx.image.width / tx.image.height; if (a > 1) { tx.repeat.set(1 / a, 1); tx.offset.set((1 - 1 / a) / 2, 0); } else { tx.repeat.set(1, a); tx.offset.set(0, (1 - a) / 2); } tx.needsUpdate = true; }, { lazy: true });
  const imgMat = new THREE.MeshPhysicalMaterial({ map: t, roughness: .16, clearcoat: .9, clearcoatRoughness: .06, color: 0xd8d4cc });
  const cz = -FH / 2 + top + IS / 2;
  const img = new THREE.Mesh(plane(IS, IS, cz, 14, 14), imgMat); img.position.y = .052; img.receiveShadow = true; g.add(img);
  g.userData.photo = t;
  return g;
}

/* ================= repair kit: precision drivers, spudger, tray, screws ================= */
function screwdriver(capColor, bodyMat) {
  const sd = new THREE.Group();
  const capMat = new THREE.MeshPhysicalMaterial({ color: capColor, metalness: .85, roughness: .32, roughnessMap: M.smudge2, clearcoat: .3 });
  // rotating cap with a domed end and a fine groove before the grip
  sd.add(shade(new THREE.Mesh(turned([[0, 0], [.02, .3], [.08, .47], [.2, .58], [.4, .62], [1.15, .62], [1.2, .56]], { segs: 48 }), capMat)));
  sd.add(shade(new THREE.Mesh(turned([[1.2, .5], [1.32, .5]], { segs: 32 }), M.darkSteel)));
  // ribbed grip
  sd.add(shade(new THREE.Mesh(turned([[1.32, .56], [1.4, .6], [7.6, .6], [8.3, .5], [8.6, .44]], { segs: 72, flutes: { x0: 1.5, x1: 7.5, n: 12, depth: .07 } }), bodyMat)));
  // knurled fingertip section
  const kn = rep(T(knurl(128), { srgb: false }), 6, 7);
  const knMat = bodyMat.clone(); knMat.bumpMap = kn; knMat.bumpScale = .05; knMat.roughness = .4;
  sd.add(shade(new THREE.Mesh(turned([[8.6, .44], [10.4, .44]], { segs: 48 }), knMat)));
  sd.add(shade(new THREE.Mesh(turned([[10.4, .44], [10.9, .32], [11.2, .24]], { segs: 40 }), bodyMat)));
  // magnetic hex socket and a hex bit with a Torx tip
  const hex = (x0, x1, r, m) => { const c = new THREE.CylinderGeometry(r, r, x1 - x0, 6); c.rotateZ(-Math.PI / 2); c.translate((x0 + x1) / 2, 0, 0); return shade(new THREE.Mesh(c, m)); };
  sd.add(hex(11.2, 12.1, .26, M.steel));
  sd.add(hex(12.1, 13.8, .17, M.darkSteel));
  sd.add(shade(new THREE.Mesh(turned([[13.8, .17], [14.0, .1], [14.45, .08], [14.55, .05], [14.6, 0]], { segs: 6 }), M.darkSteel)));
  return sd;
}
// precision ESD tweezers: two thin blades welded at the back, black anti-static coating, bare
// steel tips that curve slightly; one blade lies flat, the other springs up and meets it at the tip
function tweezers() {
  const L = 12.2, T = .075, grp = new THREE.Group();
  const coat = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1e, roughness: .72, roughnessMap: M.smudge2UV, bumpMap: rep(T_(stripes(64, 20, .35), { srgb: false }), 1, 6), bumpScale: .006, specularIntensity: .4, side: THREE.DoubleSide });
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xb8bbbf, metalness: 1, roughness: .22, side: THREE.DoubleSide });
  // centreline x ∈ [0, L]; width tapers from 1.0 cm at the back to .06 at the tip
  const width = x => { const t = x / L; return .96 - .5 * t - .4 * Math.pow(Math.max(0, t - .72) / .28, 1.4); };
  const blade = (lift, side) => {
    const posC = [], posM = [], idxC = [], idxM = [], LC = L - 1.7;
    const y = x => { const t = x / L; return lift > 0 ? T + .12 * (1 - t) + lift * Math.sin(Math.PI * t) * .9 + .01 : 0; };   // opens in the middle, meets at the tip
    const z = x => { const t = x / L; return t > .86 ? .35 * Math.pow((t - .86) / .14, 2) : 0; };        // the tips curve a little
    const ring = (x, pos) => { const w = width(x) / 2, yy = y(x), zz = z(x); for (const v of [[x, yy, zz - w], [x, yy, zz + w], [x, yy + T, zz + w], [x, yy + T, zz - w]]) pos.push(...v); };
    for (let i = 0; i <= 48; i++) ring(LC * i / 48, posC);
    for (let i = 0; i <= 14; i++) ring(LC + (L - LC) * i / 14, posM);
    const quads = (pos, idx) => { const n = pos.length / 12; for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); } };
    quads(posC, idxC); quads(posM, idxM);
    const mk = (pos, idx, m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i + 2] + .5, pos[i] / L); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return shade(new THREE.Mesh(g, m)); };
    grp.add(mk(posC, idxC, coat), mk(posM, idxM, metal));
  };
  blade(0, -1); blade(.95, 1);
  // the welded back
  grp.add(at(shade(new THREE.Mesh(new THREE.BoxGeometry(.9, .32, 1.0), coat)), .45, .16, 0));
  return grp;
}
const T_ = (c, o) => T(c, o);
function screw(kind) {
  const s = new THREE.Group();
  const recess = drawTex(64, 64, (g, w) => {
    g.fillStyle = '#9da0a4'; g.fillRect(0, 0, w, w); g.fillStyle = '#16171a'; g.beginPath();
    const n = kind === 'penta' ? 5 : 6;
    for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU - Math.PI / 2, r = i % 2 ? 9 : 19; i ? g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r) : g.moveTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.fill();
  });
  const hm = new THREE.MeshPhysicalMaterial({ color: 0x3a3b3e, metalness: .9, roughness: .3 });
  const hr = kind === 'penta' ? .17 : .22;
  s.add(shade(new THREE.Mesh(turned([[0, 0], [0, hr * .8], [.02, hr], [.08, hr], [.09, .07]], { segs: 24 }), hm)));
  const top = new THREE.Mesh(new THREE.CircleGeometry(hr * .8, 24).rotateY(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: recess, metalness: .8, roughness: .35 })); top.position.x = -.001; s.add(top);
  const th = rep(T(stripes(32, 4, .6), { srgb: false }), 1, 5);
  s.add(shade(new THREE.Mesh(turned([[.09, .07], [.42, .07], [.46, .03]], { segs: 16 }), new THREE.MeshPhysicalMaterial({ color: 0x55575b, metalness: .9, roughness: .35, bumpMap: th, bumpScale: .02 }))));
  return { s, hr };
}
export function buildTools({ seed }) {
  const tools = new THREE.Group();
  // where the screws lie: the random numbers the prototype drew at this point (seeds.js)
  reseed(seed);
  const alBody = new THREE.MeshPhysicalMaterial({ color: 0xb7b9bc, metalness: .95, roughness: .3, roughnessMap: M.smudge2 });
  const blackBody = new THREE.MeshPhysicalMaterial({ color: 0x2e2f33, metalness: .85, roughness: .36, roughnessMap: M.smudge2 });
  const d1 = screwdriver(0xc9431f, alBody); d1.position.set(-6.8, .62, 5.2); d1.rotation.y = -.12; tools.add(d1);
  const d2 = screwdriver(0x4d6f86, blackBody); d2.position.set(-9.2, .62, 7.4); d2.rotation.y = .05; tools.add(d2);
  const tw = tweezers(); tw.position.set(-14.5, 0, -3.2); tw.rotation.y = .95; tools.add(tw);
  // a small magnetic tray, soft grey silicone
  const tray = new THREE.Group(); tray.position.set(6.4, 0, -1); tray.rotation.y = -.18; tools.add(tray);
  const trayMat = new THREE.MeshPhysicalMaterial({ color: 0x3b3d41, roughness: .74, roughnessMap: M.smudge2, sheen: .2 });
  { const sh = rr(10.6, 7.2, 1.3); sh.holes.push(rrPath(9.6, 6.2, .85)); tray.add(slab(sh, 1.15, .1, trayMat, 3)); tray.add(slab(rr(10.4, 7, 1.2), .3, .08, trayMat, 2)); }
  const scr = [];
  for (let i = 0; i < 9; i++) {
    const kind = i % 3 === 0 ? 'penta' : 'torx', { s, hr } = screw(kind);
    const inTray = i < 6;
    const x = inTray ? -3.5 + (i % 3) * 2.6 + (rnd() - .5) * .9 : 0, z = inTray ? -1.6 + (i / 3 | 0) * 3 + (rnd() - .5) * .8 : 0;
    // lying on its side: head rim and thread tip touch the floor
    s.rotation.set(0, rnd() * TAU, 0);
    const tilt = Math.atan2(hr - .03, .46);
    const holder = new THREE.Group(); holder.add(s); s.rotation.set(0, 0, -tilt); s.position.y = hr;
    holder.rotation.y = rnd() * TAU;
    if (inTray) { holder.position.set(x, .3, z); tray.add(holder); }
    else { holder.position.set([9.5, 12, 11][i - 6], 0, [5.6, 6.9, 4.1][i - 6]); tools.add(holder); }
    scr.push(holder);
  }
  footprint('tray', tray, 10.6, 7.2, 1.15, { tag: 'tools' });
  footprint('driver1', d1, 14.6, 1.3, .7, { ox: 7.3, base: -.7, tag: 'tools' });
  footprint('driver2', d2, 14.6, 1.3, .7, { ox: 7.3, base: -.7, tag: 'tools' });
  footprint('tweezers', tw, 12.4, 1.1, 1.1, { ox: 6.1, tag: 'tools' });
  return { tools };
}

/* ================= a white 5G home router: 11 × 11 × 22 cm, no marks ================= */
export function buildRouter() {
  const r = new THREE.Group();
  const FOOT = .8, H = 22, S = 11, CR = 3.0;
  const body = new THREE.MeshPhysicalMaterial({ color: 0xe4e1db, roughness: .58, roughnessMap: M.smudge2, specularIntensity: .5, sheen: .25, sheenRoughness: .9, sheenColor: new THREE.Color(0xffffff) });
  // the body: a rounded square tower built ring by ring (same parametrisation on every ring, so
  // the surface is smooth and closed): 3 cm vertical corners, a flat top with only a 1.5 mm
  // edge break (enough to catch a thin highlight), .5 cm below; flat faces between the rounds
  const NS = 6, NC = 16;
  const contour = (inset) => {           // [x, z, nx, nz] around a rounded square, CCW from +x
    const h = S / 2 - inset, rc = Math.max(.01, CR - inset), c = h - rc, pts = [];
    const corners = [[c, c, 0], [-c, c, Math.PI / 2], [-c, -c, Math.PI], [c, -c, Math.PI * 1.5]];
    corners.forEach(([cx, cz, a0], k) => {
      for (let j = 0; j < NC; j++) { const a = a0 + j / NC * Math.PI / 2; pts.push([cx + Math.cos(a) * rc, cz + Math.sin(a) * rc, Math.cos(a), Math.sin(a)]); }
      const [nx, nz] = [Math.cos(a0 + Math.PI / 2), Math.sin(a0 + Math.PI / 2)], [ex, ez] = [corners[(k + 1) % 4][0] + nx * rc, corners[(k + 1) % 4][1] + nz * rc], [sx, sz] = [cx + nx * rc, cz + nz * rc];
      for (let j = 0; j < NS; j++) { const t = j / NS; pts.push([sx + (ex - sx) * t, sz + (ez - sz) * t, nx, nz]); }
    });
    return pts;
  };
  const rings = [];
  const FB = .5, FT = .15, NF = 14;
  for (let k = 0; k <= NF; k++) { const a = k / NF * Math.PI / 2; rings.push([FB * (1 - Math.sin(a)), FOOT + FB * (1 - Math.cos(a))]); }
  for (let k = 0; k <= NF; k++) { const a = k / NF * Math.PI / 2; rings.push([FT * (1 - Math.cos(a)), FOOT + H - FT + FT * Math.sin(a)]); }
  { const pos = [], idx = [], M_ = contour(0).length;
    for (const [inset, y] of rings) for (const [x, z] of contour(inset)) pos.push(x, y, z);
    const R = rings.length;
    for (let i = 0; i < R - 1; i++) for (let j = 0; j < M_; j++) { const a = i * M_ + j, b2 = a + M_, c = i * M_ + (j + 1) % M_, e = (i + 1) * M_ + (j + 1) % M_; idx.push(a, b2, c, c, b2, e); }
    const top = pos.length / 3; pos.push(0, FOOT + H, 0); for (let j = 0; j < M_; j++) idx.push((R - 1) * M_ + j, top, (R - 1) * M_ + (j + 1) % M_);
    const bot = pos.length / 3; pos.push(0, FOOT, 0); for (let j = 0; j < M_; j++) idx.push(j, (j + 1) % M_, bot);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    r.add(shade(new THREE.Mesh(g, body)));
  }
  r.add(slab(rr(8.4, 8.4, 2.2), FOOT + .1, .15, new THREE.MeshPhysicalMaterial({ color: 0x5b5a58, roughness: .7 }), 2));
  // vent band: a perforated skin 0.4 mm proud of the body, following its outline exactly
  const per = jt('vent', 'c', { srgb: false, wrap: 's', cost: 10 });
  {
    const cn = contour(0), pos = [], uv = [], idx = [], y0 = FOOT + 1.9, y1 = FOOT + 5.2, n = cn.length;
    let acc = 0; const L = [0]; for (let i = 1; i <= n; i++) { const p0 = cn[i - 1], p1 = cn[i % n]; acc += Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); L.push(acc); }
    // a whole number of hole columns round the body (128 per tile), so the wrap leaves no seam
    const U1 = Math.round(acc / 52.8 * 128) / 128;
    for (let i = 0; i <= n; i++) { const [x, z, nx, nz] = cn[i % n], o = .04, u = L[i] / acc * U1; pos.push(x + nx * o, y0, z + nz * o, x + nx * o, y1, z + nz * o); uv.push(u, 0, u, 1); }
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    r.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1d1c1b, roughness: .9, alphaMap: per, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  }
  // the light strip: slim smoked glass with six status icons behind it
  const icons = drawTex(64, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = g.fillStyle = '#fff'; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
    const cy = i => 110 + i * 150, cx = 32;
    // power
    g.beginPath(); g.arc(cx, cy(0), 15, -Math.PI / 2 + .6, Math.PI * 1.5 - .6); g.stroke(); g.beginPath(); g.moveTo(cx, cy(0) - 20); g.lineTo(cx, cy(0) - 4); g.stroke();
    // mobile signal bars
    for (let k = 0; k < 4; k++) g.fillRect(cx - 17 + k * 9, cy(1) + 14 - k * 8, 6, 6 + k * 8);
    // 5G
    g.font = '700 26px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('5G', cx, cy(2));
    // wi-fi
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy(3) + 14, k * 8, -Math.PI * .78, -Math.PI * .22); g.stroke(); } g.beginPath(); g.arc(cx, cy(3) + 14, 2.6, 0, TAU); g.fill();
    // ethernet port
    g.strokeRect(cx - 14, cy(4) - 12, 28, 22); g.fillRect(cx - 7, cy(4) + 6, 14, 6); for (let k = 0; k < 4; k++) g.fillRect(cx - 9 + k * 5, cy(4) - 9, 2, 6);
    // phone line
    g.beginPath(); g.moveTo(cx - 14, cy(5) - 8); g.quadraticCurveTo(cx, cy(5) - 18, cx + 14, cy(5) - 8); g.lineTo(cx + 12, cy(5) - 2); g.lineTo(cx + 5, cy(5) - 4); g.lineTo(cx - 5, cy(5) - 4); g.lineTo(cx - 12, cy(5) - 2); g.closePath(); g.fill();
    g.fillRect(cx - 10, cy(5) + 2, 20, 12);
  }, { srgb: true });
  const glassStrip = new THREE.Mesh(slabGeo(rr(.62, 9.6, .3), .04, .015, 2), new THREE.MeshPhysicalMaterial({ color: 0x151517, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }));
  glassStrip.rotation.x = Math.PI / 2; glassStrip.position.set(0, FOOT + 13.2, S / 2 - .006); r.add(glassStrip);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(.5, 9.2), new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: .1, clearcoat: 1, clearcoatRoughness: .04, emissive: 0xd9f0ff, emissiveMap: icons, emissiveIntensity: 5.5 }));
  strip.position.set(0, FOOT + 13.2, S / 2 + .036); r.add(strip);
  r.userData.strip = strip;
  footprint('router', r, S, S, H + FOOT);
  r.userData.port = { p: V(0, 1.6, -S / 2), d: V(0, 0, -1) };
  return r;
}
