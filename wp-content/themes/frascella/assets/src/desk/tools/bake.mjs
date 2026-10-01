/**
 * The desk's static pictures, made from their sources at the size they are seen at, into
 * assets/desk/ (committed; Vite fingerprints them into dist when the scene references them).
 *
 *   node test/server.mjs &   then   node tools/bake.mjs      (needs cwebp; Chromium via Playwright)
 *
 * - print-sleeve.webp, print-label.webp: the record's prints, painted by the prototype's own code
 *   (illustration.js: the owner's 1536² artwork, Schibsted Grotesk, wear) from the seed it had
 *   reached at that point (seeds.js "sleeve"). The sleeve is ≤ 400 px on screen at any station.
 * - photo-*.webp: the polaroids' photos, cropped square as the scene crops them, 512².
 * - shot-*.webp: the projects' screenshots (1440 × 900: the laptop's screen at a project fills
 *   about half a 1440 px window at 2×).
 * - still-{desktop,mobile}-{station}.webp + stills.json: the fallback (design/scene renders) and
 *   the laptop screen's outline at each station.
 *
 * The sources live in .impeccable/mocks/sketches/assets and design/scene; once the prototype
 * is gone, the outputs here are the sources.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { SEEDS } from "../scene/seeds.js";

const root = resolve(import.meta.dirname, "../../../../../../..");
const out = resolve(import.meta.dirname, "../../../desk");
const src = resolve(root, ".impeccable/mocks/sketches/assets");
const scene = resolve(root, "design/scene");
const tmp = resolve(tmpdir(), "desk-bake");
mkdirSync(out, { recursive: true });
mkdirSync(tmp, { recursive: true });
const webp = (from, to, args) => execFileSync("cwebp", ["-quiet", "-mt", "-m", "6", ...args, from, "-o", resolve(out, to)]);
const size = (f) => execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", f]).toString().match(/\d+/g).slice(-2).map(Number);

// 1. the record's prints, from the prototype's code in a real page (fonts, canvas)
{
    const require = createRequire(resolve(root, "wp-content/plugins/frascella/package.json"));
    const { chromium } = require("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    // a blank page on the same origin, with the prototype's faces
    await page.goto("http://127.0.0.1:8790/.impeccable/mocks/sketches/t3-scrivania/scene/");
    const png = await page.evaluate(async (seed) => {
        const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/.impeccable/mocks/sketches/assets/base.css" });
        document.head.append(link);
        const map = Object.assign(document.createElement("script"), { type: "importmap", textContent: JSON.stringify({ imports: { three: "/.impeccable/mocks/sketches/assets/three/three.module.js", "three/addons/": "/.impeccable/mocks/sketches/assets/three/addons/" } }) });
        document.head.append(map);
        await new Promise((r) => (link.onload = r));
        await Promise.all(["800 64px", "400 64px", "500 64px", "600 64px"].map((w) => document.fonts.load(`${w} "Schibsted Grotesk"`)));
        const U = await import("/.impeccable/mocks/sketches/t3-scrivania/scene/util.js");
        const I = await import("/.impeccable/mocks/sketches/t3-scrivania/scene/illustration.js");
        await document.fonts.ready;
        const art = I.lofiIllustration(1536);
        U.reseed(seed);
        const sp = I.sleevePrint(art, 2048), lp = I.labelPrint(art, 1024);
        await Promise.all([sp.ready, lp.ready]);
        return [sp.canvas.toDataURL("image/png"), lp.canvas.toDataURL("image/png")];
    }, SEEDS.sleeve);
    await browser.close();
    png.forEach((d, i) => writeFileSync(resolve(tmp, i ? "label.png" : "sleeve.png"), Buffer.from(d.split(",")[1], "base64")));
    webp(resolve(tmp, "sleeve.png"), "print-sleeve.webp", ["-q", "80", "-resize", "1024", "1024"]);
    // the label is a disc: its corners are never sampled, so no alpha
    webp(resolve(tmp, "label.png"), "print-label.webp", ["-q", "84", "-noalpha", "-resize", "512", "512"]);
}

// 2. the polaroids' photos: the centre square, as polaroid() crops them
for (const [from, to] of [["portrait.webp", "photo-portrait.webp"], ["old-town-alley.webp", "photo-alley.webp"], ["swing-bridge.webp", "photo-bridge.webp"]]) {
    const f = resolve(src, from), [w, h] = size(f), s = Math.min(w, h);
    webp(f, to, ["-q", "82", "-crop", String((w - s) >> 1), String((h - s) >> 1), String(s), String(s), "-resize", "512", "512"]);
}

// 3. the projects' screenshots, as they are (already 1440 wide, ~40 KB)
for (const [from, to] of [["sevenink-home.webp", "shot-sevenink.webp"], ["skeda-home.webp", "shot-skeda.webp"], ["vitrine-hero.webp", "shot-vitrine.webp"]]) {
    writeFileSync(resolve(out, to), readFileSync(resolve(src, from)));
}

// 4. the fallback: one picture per station and width, and the screen's outline
{
    const st = JSON.parse(readFileSync(resolve(scene, "stations.json"), "utf8"));
    const data = { desktop: { w: 1440, h: 900, scr: {} }, mobile: { w: 390, h: 844, scr: {} } };
    for (const set of ["desktop", "mobile"]) for (const name of Object.keys(st[set])) {
        data[set].scr[name] = st[set][name].scr;
        webp(resolve(scene, `${set}-${name}.png`), `still-${set}-${name}.webp`, ["-q", "70", ...(set === "desktop" ? ["-resize", "1920", "1200"] : [])]);
    }
    writeFileSync(resolve(out, "stills.json"), JSON.stringify(data));
}
rmSync(tmp, { recursive: true, force: true });
console.log(execFileSync("ls", ["-la", out]).toString());
