/**
 * The front page's desk (assets/src/desk): a tiny loader that mounts itself on canvas#desk and
 * imports three.js and the scene after the first paint. Enqueued on the front page next to the
 * page's own entry, or imported by it; see desk/CONTRACT.md.
 */
import { mountDesk } from "../desk/index.ts";

if (document.querySelector("canvas#desk")) void mountDesk().catch((e) => console.warn("[desk]", e));
