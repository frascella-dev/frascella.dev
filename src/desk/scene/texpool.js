// The procedural textures' queue: a few workers paint them (tex.worker.js) while the page and
// three.js load, each job from the seed the prototype's order gave it (seeds.js). No three.js
// here, so the loader can start it before the scene's chunk has arrived.
//
// run(job, args) → Promise<{ key: ImageBitmap (flipped, unless flip: false) | HTMLCanvasElement
// (never flipped: a CanvasTexture flips it on upload) }>.
// Without workers or OffscreenCanvas the same code runs on the main thread, one job per task.
import { SEEDS, SEEDS_SHOT } from './seeds.js';

// what the scene will ask for, in the order of their cost (gen.js JOBS): [job, args, options]
const PREFETCH = shot => {
  const S = shot ? 512 : 1024;
  return [['board', [], { cost: 300 }], ['vinyl', [], { cost: 200 }], ['spread', [], { cost: 120 }], ['wall', [S], { cost: 90 }],
    ['carpet', [S], { cost: 80 }], ['felt', [], { cost: 80 }], ['laminate', [S], { cost: 60 }], ['efSketch', [2048, 1536], { cost: 60, flip: false }],
    ['cork', [], { cost: 40 }], ['braid', [], { cost: 30 }], ['smudge1', [], { cost: 25 }], ['cookie', [], { cost: 25 }], ['smudge2', [], { cost: 22 }],
    ['vent', [], { cost: 10 }], ['grille', [], { cost: 8 }], ['crema', [], { cost: 5 }], ['grain90', [], { cost: 2 }], ['grain70', [], { cost: 2 }]];
};

export function createPool({ shot = false, workers = 0 } = {}) {
  const seeds = shot ? SEEDS_SHOT : SEEDS;
  const can = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function';
  const n = can ? workers || Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)) : 0;
  const idle = [], all = [], queue = [], pending = new Map(), stats = [];
  let next = 1, mainBusy = null, failed = !can;

  const spawn = () => {
    const w = new Worker(new URL('./tex.worker.js', import.meta.url), { type: 'module' });
    w.onmessage = ({ data }) => {
      const p = pending.get(data.id); pending.delete(data.id);
      if (data.error) { console.warn('[desk] texture job failed in a worker, painting it here:', p.job, data.error); onMain(p); }
      else { stats.push([p.job, data.ms]); p.resolve(data.res); }
      idle.push(w); pump();
    };
    w.onerror = e => { e.preventDefault(); console.warn('[desk] texture worker unavailable, painting on the main thread'); failed = true; for (const p of [...pending.values()]) { pending.delete(p.id); onMain(p); } while (queue.length) onMain(queue.shift()); };
    idle.push(w); all.push(w);
  };
  for (let i = 0; i < n; i++) spawn();

  function pump() {
    if (failed) { while (queue.length) onMain(queue.shift()); return; }
    while (idle.length && queue.length) {
      const p = queue.shift(), w = idle.pop();
      pending.set(p.id, p);
      w.postMessage({ id: p.id, job: p.job, seed: p.seed, args: p.args, flip: p.flip }, p.transfer);
    }
  }
  // the main-thread way: one job per task, after whatever is already queued
  function onMain(p) {
    mainBusy = (mainBusy || Promise.resolve()).then(async () => {
      const G = await import('./gen.js');
      G.setCanvasFactory((w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
      await new Promise(r => setTimeout(r, 0));
      if (p.seed != null) G.reseed(p.seed);
      const t0 = performance.now(); const out = G.JOBS[p.job].run(...p.args); stats.push([p.job + ' (main)', performance.now() - t0]);
      p.resolve(out);
    }).catch(e => p.reject(e));
  }

  // jobs started ahead (prefetch): the first run() with the same name and no tag takes it
  const early = new Map();
  return {
    workers: n,
    stats,
    /** Start the jobs whose inputs are known now, before the scene's code has even arrived. */
    prefetch() { for (const [job, args, opts] of PREFETCH(shot)) if (!early.has(job)) early.set(job, this.run(job, args, { ...opts, fresh: true })); },
    /** Queue a job; the slowest go first. `transfer`: buffers in `args` to hand over. */
    run(job, args = [], { transfer = [], cost = 0, flip = true, tag = null, fresh = false } = {}) {
      if (!fresh && !tag && early.has(job)) { const p = early.get(job); early.delete(job); return p; }
      return new Promise((resolve, reject) => {
        const p = { id: next++, job, args, transfer, flip, seed: seeds[job] ?? null, resolve, reject, cost };
        if (failed) { onMain(p); return; }
        // highest cost first among what is still waiting
        let i = queue.findIndex(q => q.cost < cost); if (i < 0) i = queue.length;
        queue.splice(i, 0, p); pump();
      });
    },
    seed: name => seeds[name],
    /** Let the workers go (their heaps and canvases): later jobs, if any, run on the main thread. */
    close() { for (const w of all) w.terminate(); all.length = idle.length = 0; failed = true; for (const p of [...pending.values()]) { pending.delete(p.id); onMain(p); } },
  };
}
