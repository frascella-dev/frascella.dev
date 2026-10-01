/**
 * Every interaction of the desk, once, on the test page: the switches, the hotspots, the
 * tablet (open, draw, close), the projects' screens. Fails loudly; writes screenshots.
 *
 *   node server.mjs &   then   node interact.mjs [--gpu] [--out dir] [--url …]
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve(import.meta.dirname, "../../../../../../plugins/frascella/package.json"));
const { chromium } = require("playwright");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const gpu = args.includes("--gpu");
// --lang en: the same page announced as English (index.en.html), and the desk's words checked in it
const lang = opt("lang", "it");
const url = opt("url", "http://127.0.0.1:8790/wp-content/themes/frascella/assets/src/desk/test/" + (lang === "en" ? "index.en.html" : "") + (gpu ? "" : "?soft"));
const WORDS = { it: { levels: ["piena", "media", "spenta"], done: "fatto", layer: "Livello 0", hint: "Disegna sullo schermo del tablet. «fatto» o Esc per tornare." }, en: { levels: ["full", "dim", "off"], done: "done", layer: "Layer 0", hint: 'Draw on the tablet screen. Press "done" or Esc to go back.' } }[lang];
const out = resolve(opt("out", resolve(import.meta.dirname, "../../../../../../../.impeccable/desk-interact")));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: gpu ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) errors.push(m.text()); });
const ok = [], fail = [];
const check = (name, cond, info = "") => (cond ? ok : fail).push(name + (info ? ` (${info})` : ""));
const frames = (n = 10) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const wait = (ms) => page.waitForTimeout(gpu ? ms : ms * 4);
// the desk's switches are visually hidden until the keyboard reaches them: press them that way
const press = async (sel) => { await page.focus(sel); await page.keyboard.press("Enter"); };

await page.goto(url, { waitUntil: "load", timeout: 240000 });
await page.waitForFunction(() => window.__deskReady, null, { timeout: 400000 });
check("ready, webgl", await page.evaluate(() => document.documentElement.classList.contains("desk-webgl")));
await wait(1500);
await page.screenshot({ path: resolve(out, "1-hero.png") });

// the lamp: three levels, the word follows, aria-pressed follows
await press("#lamp-btn");
await wait(600);
check(`lamp → ${WORDS.levels[1]}`, (await page.textContent("#lamp-state")) === WORDS.levels[1]);
await press("#lamp-btn");
await wait(600);
check(`lamp → ${WORDS.levels[2]}, aria-pressed false`, (await page.textContent("#lamp-state")) === WORDS.levels[2] && (await page.getAttribute("#lamp-btn", "aria-pressed")) === "false");
await page.screenshot({ path: resolve(out, "2-lamp-off.png") });
await press("#lamp-btn");
await wait(600);

// the record: the desk's switch and the header's crackle switch stay in step
const playing0 = await page.evaluate(() => window.__desk.ttPlaying());
await press("#tt-btn");
check("turntable toggles", (await page.evaluate(() => window.__desk.ttPlaying())) === !playing0);
check("header switch follows", (await page.getAttribute("#snd-btn", "aria-pressed")) === String(!playing0));
await page.click("#snd-btn");
check("header switch toggles back", (await page.evaluate(() => window.__desk.ttPlaying())) === playing0);

// the phone and the plant
await press("#phone-btn");
check("phone breaks", await page.evaluate(() => window.__desk.phoneBroken()));
await press("#phone-btn");
check("phone off again", !(await page.evaluate(() => window.__desk.phoneBroken())));
await press("#plant-btn");
// the mug's switch: works at any station (here, the first)
if (await page.$("#mug-btn")) {
    await press("#mug-btn"); await frames(3);
    check("mug switch wobbles it", (await page.evaluate(() => window.__desk.mugState())) === "wobble");
    await wait(2600);
}
await frames(5);

// the intermezzo: the sheet lifts, the hotspots show, a click on the mug wobbles it
await page.evaluate(() => { const r = document.getElementById("scrivania").getBoundingClientRect(); scrollTo({ top: r.top + scrollY + innerHeight * 0.5, behavior: "instant" }); });
await wait(2500); await frames(20);
const hs = await page.evaluate(() => window.__desk.hotspots());
check("hotspots visible in the intermezzo", hs.filter((h) => h.vis).length >= 4, hs.filter((h) => h.vis).map((h) => h.n).join(","));
await page.screenshot({ path: resolve(out, "3-desk.png") });
const mug = await page.evaluate(() => window.__desk.xy("mug"));
await page.mouse.click(mug.x, mug.y);
await frames(3);
check("click on the mug wobbles it", (await page.evaluate(() => window.__desk.mugState())) === "wobble");

// the tablet: open, draw a stroke, close; the page is inert meanwhile
await page.evaluate(() => window.__desk.open());
await wait(2200); await frames(10);
check("tablet open", (await page.evaluate(() => window.__desk.state())) === "open");
const said = await page.evaluate(() => ({ done: document.querySelector(".pa-done").textContent, layer: window.__desk.pad.layers[0].name, hint: document.querySelector("#pad-ui .pad-hint").textContent, undo: document.querySelector('.pa [data-k="undo"]').getAttribute("aria-label") }));
check(`the app's words (${lang})`, said.done === WORDS.done && said.layer === WORDS.layer && said.hint === WORDS.hint, JSON.stringify(said));
check("page inert while open", await page.evaluate(() => document.querySelector("main").inert && document.documentElement.classList.contains("ipad")));
const strokes0 = await page.evaluate(() => window.__desk.pad.strokes);
const a = await page.evaluate(() => window.__desk.uiToClient(700, 700)), b = await page.evaluate(() => window.__desk.uiToClient(1300, 900));
await page.mouse.move(a.x, a.y); await page.mouse.down();
for (let i = 1; i <= 20; i++) await page.mouse.move(a.x + (b.x - a.x) * i / 20, a.y + (b.y - a.y) * i / 20);
await page.mouse.up();
check("a stroke on the tablet", (await page.evaluate(() => window.__desk.pad.strokes)) === strokes0 + 1);
await page.screenshot({ path: resolve(out, "4-tablet.png") });
await page.keyboard.press("Escape");
await wait(1600); await frames(10);
check("tablet closed with Esc", (await page.evaluate(() => window.__desk.state())) === "closed" && !(await page.evaluate(() => document.querySelector("main").inert)));

// the projects: the laptop's window opens on each card, with that project's screenshot
for (const i of [0, 1, 2]) {
    await page.evaluate((i) => { const c = document.querySelector(`.card[data-screen="${i}"]`); const r = c.getBoundingClientRect(); scrollTo({ top: r.top + scrollY + r.height / 2 - innerHeight / 2, behavior: "instant" }); }, i);
    await wait(2500); await frames(20);
    const w = await page.evaluate(() => ({ d: document.getElementById("scrwin").getAttribute("d"), fill: document.getElementById("scrwin").getAttribute("fill") }));
    check(`project ${i}: the window opens`, w.d && w.d.length > 10 && w.fill === "rgb(0,0,0)", w.fill);
    await page.screenshot({ path: resolve(out, `5-project-${i}.png`) });
}
await browser.close();
console.log("passed:\n  " + ok.join("\n  "));
if (fail.length) console.log("FAILED:\n  " + fail.join("\n  "));
if (errors.length) console.log("errors:\n  " + errors.join("\n  "));
process.exit(fail.length || errors.length ? 1 : 0);
