// Textures whose pixels come from the job queue (texpool.js): each one is created at once, so
// the materials and their shader programs exist before the pixels do, and fills in when its job
// is done. Every promise is kept, so the scene can wait for all of them before its first frame.
import * as THREE from 'three';
import { ctx } from './util.js';

let pool = null;
const runs = new Map();
export const pending = [];

export function usePool(p) { pool = p; }
// one slot per job (and tag, when the same job runs on different inputs): its promise exists as
// soon as anyone asks, the job starts when job() is called with its arguments
function slot(key) {
  if (!runs.has(key)) { let res; const promise = new Promise(r => { res = r; }); runs.set(key, { promise, res, started: false }); }
  return runs.get(key);
}
/** Start a job (once, whoever asks first) → its outputs. */
export function job(name, args = [], opts = {}) {
  const s = slot(name + (opts.tag ? ':' + opts.tag : ''));
  if (!s.started) { s.started = true; const p = pool.run(name, args, opts); pending.push(p); s.res(p); }
  return s.promise;
}

/** A texture filled by `key` of job `name`. Its clones (made before or after) share the pixels. */
// `lazy: tag` waits for job(name, args, { tag }) to be started elsewhere (its inputs come later).
export function jt(name, key, { srgb = true, repeat = null, wrap = null, args, cost, lazy = null } = {}) {
  const t = new THREE.Texture(), family = [t];
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ctx.aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  if (wrap === 's') t.wrapS = THREE.RepeatWrapping;
  const clone = t.clone.bind(t);
  t.clone = () => { const c = clone(); family.push(c); if (t.image) { c.flipY = t.flipY; c.needsUpdate = true; } return c; };
  families.push(family);
  (lazy ? slot(name + ':' + lazy).promise : job(name, args, { cost })).then(out => {
    const img = out[key], bitmap = typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap;
    t.image = img;                                   // the source, shared by every clone
    for (const x of family) { x.flipY = !bitmap; x.needsUpdate = true; }
  });
  return t;
}
const families = [];

/** Every texture made here, for uploading them ahead of the first frame. */
export const jobTextures = () => families.flat();
/** After the upload, the bitmaps' own copies of the pixels are not needed (the GPU has them). */
export function releaseBitmaps() {
  for (const f of families) { const img = f[0].image; if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) img.close(); }
}
