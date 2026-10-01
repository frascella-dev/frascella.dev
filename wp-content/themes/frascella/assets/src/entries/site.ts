/**
 * The home page, and any page built with widgets that ask for `site`.
 *
 * The desk scene is its own entry (`desk.ts`, enqueued next to this one where the stage is
 * printed: inc/assets.php), so a page without the desk never downloads it.
 */
import "../css/site.css";
import { initReveal } from "../lib/reveal.ts";
import { initSheet } from "../lib/sheet.ts";
import { initHeader } from "../lib/header.ts";
import { initForm } from "../lib/form.ts";
import { onElementorRender } from "../lib/editor.ts";

initHeader();
initSheet();
initForm();
initReveal();
onElementorRender((root) => initReveal(root));
