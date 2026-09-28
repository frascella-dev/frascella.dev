/**
 * The home page, and any page built with widgets that ask for `site`.
 */
import "../css/site.css";
import { initReveal } from "../lib/reveal.ts";
import { onElementorRender } from "../lib/editor.ts";

initReveal();
onElementorRender((root) => initReveal(root));
