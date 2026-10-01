// Canvas textures made on the main thread, from the small patterns in gen.js (the big procedural
// surfaces are painted in workers: jobs.js).
import * as THREE from 'three';
import { canvasTex } from './util.js';

export { knurl, stripes } from './gen.js';
export function T(c, o) { return canvasTex(c, o); }
export function rep(t, x, y) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; }
