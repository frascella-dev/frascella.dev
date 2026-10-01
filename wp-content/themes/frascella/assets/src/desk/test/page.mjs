/**
 * Writes test/index.html: the prototype's page (template.html, its markup and its sheet script
 * unchanged) with the desk loaded from the built theme, the way inc/assets.php will print it:
 * the entry's CSS and the entry as a module (with --preload, also its dynamic chunks as
 * low-priority modulepreloads in the head).
 *
 *   npm run build && node assets/src/desk/test/page.mjs
 *   → http://127.0.0.1:8790/wp-content/themes/frascella/assets/src/desk/test/        (WebGL)
 *     …/test/?soft      draw even on a software GPU (SwiftShader, for headless measurements)
 *     …/test/?fallback  the stills
 *     …/test/index.en.html  the same page with lang="en"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const theme = resolve(import.meta.dirname, "../../../..");
const manifest = JSON.parse(readFileSync(resolve(theme, "assets/dist/.vite/manifest.json"), "utf8"));
const base = "/wp-content/themes/frascella/assets/dist/";
const entry = manifest["assets/src/entries/desk.ts"];
const preload = new Set();
const walk = (key) => { const c = manifest[key]; if (!c || preload.has(c.file)) return; preload.add(c.file); (c.imports || []).forEach(walk); };
(entry.dynamicImports || []).filter((k) => !k.includes("fallback")).forEach(walk);
// --preload: also list the scene's chunks as low-priority modulepreloads in the head
const withPreload = process.argv.includes("--preload");
const head = [
    ...(entry.css || []).map((f) => `<link rel="stylesheet" href="${base}${f}">`),
    ...(withPreload ? [...preload].map((f) => `<link rel="modulepreload" href="${base}${f}" fetchpriority="low">`) : []),
].join("\n");
const body = `<script>
  // test switches: ?soft draws on a software GPU, ?fallback shows the stills
  window.frascellaDeskOptions = { allowSoftware: /[?&]soft/.test(location.search), forceFallback: /[?&]fallback/.test(location.search) };
</script>
<script type="module" src="${base}${entry.file}"></script>`;
const html = readFileSync(resolve(import.meta.dirname, "template.html"), "utf8").replace("<!--DESK-HEAD-->", head).replace("<!--DESK-BODY-->", body);
writeFileSync(resolve(import.meta.dirname, "index.html"), html);
// the same page announced as English, for the desk's words (words.js): …/test/index.en.html
writeFileSync(resolve(import.meta.dirname, "index.en.html"), html.replace('<html lang="it">', '<html lang="en">'));
console.log("test/index.html, index.en.html:", entry.file, [...preload].join(" "));
