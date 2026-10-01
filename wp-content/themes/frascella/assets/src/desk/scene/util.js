// Shared helpers. 1 world unit = 1 cm; the desk top is y = 0.
import * as THREE from 'three';
import { TAU, clamp, sstep, rnd, reseed, EF } from './gen.js';

export { TAU, clamp, sstep, rnd, reseed, EF };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
// one task's worth of work, then let the page breathe (input, paint) before the next
export const tick = () => globalThis.scheduler && scheduler.yield ? scheduler.yield() : new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
export const lerp = (a, b, t) => a + (b - a) * t;

export function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export const ctx = {
  aniso: 8,
  onLoad: null,     // called when an image texture is in (the scene asks for a frame)
};
export function canvasTex(c, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ctx.aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export function drawTex(w, h, fn, opts) { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h, c); return canvasTex(c, opts); }

// An image as a texture, fetched at low priority (it never competes with the page's own requests)
// and decoded off the main thread (createImageBitmap, already flipped the way three.js uploads an
// image) so the upload is a copy. `fn(texture)` runs when it is in; `texture.userData.ready`
// resolves then (or with null). With { lazy: true } nothing is fetched until userData.load().
let flips = null;
// createImageBitmap's imageOrientation "flipY" is ignored by some engines rather than refused:
// check once on a 1 × 2 picture, red over blue
function bitmapFlips() {
  if (!flips) flips = (async () => {
    try {
      const c = document.createElement('canvas'); c.width = 1; c.height = 2; const g = c.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#f00'; g.fillRect(0, 0, 1, 1); g.fillStyle = '#00f'; g.fillRect(0, 1, 1, 1);
      const b = await createImageBitmap(c, { imageOrientation: 'flipY' }); g.clearRect(0, 0, 1, 2); g.drawImage(b, 0, 0); b.close();
      return g.getImageData(0, 0, 1, 1).data[2] > 200;
    } catch { return false; }
  })();
  return flips;
}
export function tex(url, fn, { lazy = false } = {}) {
  const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ctx.aniso;
  let ready = null;
  const done = () => { t.needsUpdate = true; if (fn) fn(t); if (ctx.onLoad) ctx.onLoad(t); return t; };
  const viaImage = () => { const img = new Image(); img.decoding = 'async'; if ('fetchPriority' in img) img.fetchPriority = 'low'; img.src = url; return img.decode().then(() => { t.image = img; t.flipY = true; return done(); }); };
  t.userData.load = () => ready || (ready = t.userData.ready = (async () => {
    if (typeof createImageBitmap === 'function' && await bitmapFlips()) {
      const r = await fetch(url, { priority: 'low' });
      if (!r.ok) throw new Error(String(r.status));
      t.image = await createImageBitmap(await r.blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none' }); t.flipY = false;
      return done();
    }
    return viaImage();
  })().catch(() => viaImage()).catch(() => { console.warn('[desk] could not load', url); return null; }));
  if (!lazy) t.userData.load();
  return t;
}

export function shade(m, cast = true, receive = true) { m.castShadow = cast; m.receiveShadow = receive; return m; }
export function at(m, x, y, z) { m.position.set(x, y, z); return m; }

// a rounded rectangle, centred; `notch` = [width, depth] scoops the bottom edge (a finger lip)
export function rr(w, h, r, notch) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4);
  s.moveTo(x + r, y);
  if (notch) {
    const [nw, nd] = notch;
    s.lineTo(-nw / 2, y);
    s.bezierCurveTo(-nw / 4, y, -nw / 4, y + nd, 0, y + nd);
    s.bezierCurveTo(nw / 4, y + nd, nw / 4, y, nw / 2, y);
  }
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
export function rrPath(w, h, r, cx = 0, cy = 0) {
  const p = new THREE.Path(), x = cx - w / 2, y = cy - h / 2;
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4);
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y); p.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  p.lineTo(x + w, y + h - r); p.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  p.lineTo(x + r, y + h); p.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(x, y + r); p.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
}

// an extruded slab lying on y = 0 with its top at y = h; the footprint is the shape grown by the bevel.
// Shape y maps to world -z.
export function slabGeo(shape, h, b, segs = 3, curve = 16) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-3, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: segs, curveSegments: curve });
  g.translate(0, 0, b); g.rotateX(-Math.PI / 2);
  return g;
}
export function slab(shape, h, b, mat, segs = 3, curve = 16) { return shade(new THREE.Mesh(slabGeo(shape, h, b, segs, curve), mat)); }

// a flat rounded rectangle facing +y with 0..1 UVs (u → +x, v → -z)
export function flatGeo(w, h, r, curve = 16) {
  const g = new THREE.ShapeGeometry(rr(w, h, r), curve);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + .5, uv.getY(i) / h + .5);
  g.rotateX(-Math.PI / 2); return g;
}
export function flat(w, h, r, mat, y = 0) { const m = new THREE.Mesh(flatGeo(w, h, r), mat); m.position.y = y; return m; }

// a solid of revolution about the x axis: profile = [[x, r], ...]; optional flutes on a range
export function turned(profile, { segs = 48, flutes = null, cap = true } = {}) {
  const pos = [], uv = [], idx = [];
  const n = profile.length;
  let len = 0; const acc = [0];
  for (let i = 1; i < n; i++) { len += Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]); acc.push(len); }
  for (let i = 0; i < n; i++) {
    const [x, r] = profile[i];
    for (let j = 0; j <= segs; j++) {
      const a = j / segs * TAU;
      let rr_ = r;
      if (flutes && x >= flutes.x0 && x <= flutes.x1) {
        const edge = Math.min(1, (x - flutes.x0) / .25, (flutes.x1 - x) / .25);
        rr_ = r - flutes.depth * edge * Math.pow(Math.abs(Math.sin(a * flutes.n / 2)), 1.6);
      }
      pos.push(x, Math.cos(a) * rr_, Math.sin(a) * rr_);
      uv.push(j / segs, acc[i] / len);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + segs + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // weld the seam normals
  const nr = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    const a = i * (segs + 1), b = a + segs;
    const x = (nr.getX(a) + nr.getX(b)) / 2, y = (nr.getY(a) + nr.getY(b)) / 2, z = (nr.getZ(a) + nr.getZ(b)) / 2;
    nr.setXYZ(a, x, y, z); nr.setXYZ(b, x, y, z);
  }
  return g;
}

// sweep an ellipse (a across, b normal to the curve's plane) along a curve
export function sweepEllipse(curve, a, b, tub = 64, rad = 20, planeNormal = new THREE.Vector3(0, 0, 1)) {
  const pos = [], nor = [], idx = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= tub; i++) {
    const t = i / tub; curve.getPointAt(t, P); curve.getTangentAt(t, T);
    B.copy(planeNormal).normalize(); N.crossVectors(B, T).normalize(); B.crossVectors(T, N).normalize();
    const taper = 1 + .12 * (Math.pow(Math.abs(t - .5) * 2, 3));
    for (let j = 0; j <= rad; j++) {
      const th = j / rad * TAU, c = Math.cos(th), s = Math.sin(th);
      const x = P.x + (N.x * c * a + B.x * s * b) * taper, y = P.y + (N.y * c * a + B.y * s * b) * taper, z = P.z + (N.z * c * a + B.z * s * b) * taper;
      pos.push(x, y, z);
      const nx = N.x * c / a + B.x * s / b, ny = N.y * c / a + B.y * s / b, nz = N.z * c / a + B.z * s / b, l = Math.hypot(nx, ny, nz);
      nor.push(nx / l, ny / l, nz / l);
    }
  }
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) { const p = i * (rad + 1) + j, q = p + rad + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = []; for (let i = 0; i <= tub; i++) for (let j = 0; j <= rad; j++) uv.push(i / tub, j / rad);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // orient outward: compare with the analytic normals
  const cn = g.attributes.normal; let dot = 0; for (let i = 0; i < cn.count; i++) dot += cn.getX(i) * nor[i * 3] + cn.getY(i) * nor[i * 3 + 1] + cn.getZ(i) * nor[i * 3 + 2];
  if (dot < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

// footprints, for the "nothing intersects anything" check: oriented boxes on the desk
export const footprints = [];
export function footprint(name, obj, w, d, top, { ox = 0, oz = 0, base = 0, tag = '' } = {}) {
  footprints.push({ name, obj, w, d, top, ox, oz, base, tag });
}

// Merge the static meshes under `root` that share a material into one mesh per material
// (fewer draw calls). Instanced meshes, multi-material meshes and anything flagged
// userData.keep (or under such a node) are left alone.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const buckets = new Map();
  const walk = (o, kept) => {
    kept = kept || o.userData.keep;
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !kept && o.visible && !o.material.transparent) {
      const g = o.geometry, key = o.material.uuid + '|' + Object.keys(g.attributes).filter(k => ['position', 'normal', 'uv'].includes(k)).sort().join(',') + '|' + o.renderOrder;
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(o);
    }
    for (const c of o.children) walk(c, kept);
  };
  walk(root, false);
  let merged = 0;
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const names = Object.keys(list[0].geometry.attributes).filter(k => ['position', 'normal', 'uv'].includes(k));
    const data = Object.fromEntries(names.map(n => [n, []])), idx = []; let off = 0, cast = false, recv = false;
    for (const o of list) {
      const g = o.geometry.index ? o.geometry : o.geometry; m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m); data.position.push(v.x, v.y, v.z);
        if (n) { v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); data.normal.push(v.x, v.y, v.z); }
        if (uv && data.uv) data.uv.push(uv.getX(i), uv.getY(i));
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off);
      off += p.count; cast = cast || o.castShadow; recv = recv || o.receiveShadow;
      o.parent.remove(o); merged++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
    if (data.normal && data.normal.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
    if (data.uv && data.uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
    geo.setIndex(off > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    const mesh = new THREE.Mesh(geo, list[0].material); mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.renderOrder = list[0].renderOrder;
    root.add(mesh);
  }
  return merged;
}
