// The record's artwork: the owner's own illustration (a girl with a black bob, round glasses and
// a mustard cardigan writing at a desk by a window over a rainy harbour town at dusk), printed on
// the sleeve with its typography and wear, and cropped round on the label.
//
// The prototype painted both prints at load from the 1536² original (856 KB) and Schibsted
// Grotesk. The painting is deterministic, so tools/bake.mjs runs that same code once and keeps
// the two results at the size they are seen at: nothing to paint here, and 0.8 MB less to fetch.
import { tex } from './util.js';

const SLEEVE = new URL('../../../desk/print-sleeve.webp', import.meta.url).href;
const LABEL = new URL('../../../desk/print-label.webp', import.meta.url).href;

// the first frame waits for these two: main.js asks for them before it builds anything, so they
// download while the scene builds (and not while three.js is still arriving)
let made = null;
export function prints() {
  return made || (made = { sleeve: tex(SLEEVE), label: tex(LABEL) });
}
