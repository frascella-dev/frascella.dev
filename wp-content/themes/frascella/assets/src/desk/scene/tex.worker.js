// Paints the procedural textures off the main thread (gen.js), each job from its own seed, and
// hands them back as ImageBitmaps already flipped the way a CanvasTexture would be uploaded
// (WebGL ignores UNPACK_FLIP_Y for ImageBitmaps).
import { JOBS, reseed, setCanvasFactory } from './gen.js';

// CPU-backed canvases (willReadFrequently): the GPU process stays free for the page's own frames
// and the shader compiles running at the same time, and the pixels do not depend on the GPU
setCanvasFactory((w, h) => {
  const c = new OffscreenCanvas(w, h), get = c.getContext.bind(c);
  c.getContext = (type, opts) => get(type, { ...opts, willReadFrequently: true });
  return c;
});

function flipped(c) {
  const f = new OffscreenCanvas(c.width, c.height), g = f.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, -1, 0, c.height); g.drawImage(c, 0, 0);
  return f.transferToImageBitmap();
}

self.onmessage = ({ data: { id, job, seed, args = [], flip = true } }) => {
  try {
    if (seed != null) reseed(seed);
    const t0 = performance.now(), out = JOBS[job].run(...args), res = {}, tr = [];
    for (const [k, c] of Object.entries(out)) { const b = flip ? flipped(c) : c.transferToImageBitmap(); res[k] = b; tr.push(b); }
    self.postMessage({ id, res, ms: performance.now() - t0 }, tr);
  } catch (e) {
    self.postMessage({ id, error: String(e && e.message || e) });
  }
};
