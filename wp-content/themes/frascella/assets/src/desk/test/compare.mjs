/**
 * Is the port the prototype? Renders both in ?shot mode (still: no motion, no grain change,
 * DPR 1) at every station, with the sheet and the words hidden, and compares the pixels.
 *
 *   node server.mjs &   then   node compare.mjs [--gpu] [--width 1440 --height 900] [--out dir]
 *
 * Prints, per station, the mean difference (0–255) and the share of pixels that differ by more
 * than 8 and by more than 32, and writes the pairs and a difference picture to --out.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve(import.meta.dirname, "../../../../../../plugins/frascella/package.json"));
const { chromium } = require("playwright");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const gpu = args.includes("--gpu"), W = +opt("width", 1440), H = +opt("height", 900);
const out = resolve(opt("out", resolve(import.meta.dirname, "../../../../../../../.impeccable/desk-compare")));
mkdirSync(out, { recursive: true });
const HOST = "http://127.0.0.1:8790";
const PAGES = {
    proto: `${HOST}/.impeccable/mocks/sketches/t3-scrivania/?shot`,
    port: `${HOST}/wp-content/themes/frascella/assets/src/desk/test/?shot&soft`,
};
const launch = () => chromium.launch({ args: gpu ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

async function grab(name) {
    const browser = await launch();
    const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
    page.on("pageerror", (e) => console.log(name, "pageerror:", e.message));
    await page.goto(PAGES[name], { waitUntil: "load", timeout: 240000 });
    await page.waitForFunction(() => window.__deskReady, null, { timeout: 400000, polling: 250 });
    await page.waitForTimeout(4000);  // the prototype's prints and photos arrive after its first frame
    await page.addStyleTag({ content: ".sheet,.top,main,footer,.cue,.hotspots,.desk-veil,.desk-progress{visibility:hidden!important}" });
    const stops = await page.evaluate(() => [...document.querySelectorAll("[data-stop]")].map((el, i) => {
        const r = el.getBoundingClientRect(), top = r.top + scrollY, h = Math.min(r.height, innerHeight);
        return { name: el.dataset.stop + (el.dataset.stop === "desk" ? i : ""), y: i === 0 ? 0 : Math.max(0, top + h / 2 - innerHeight / 2) };
    }));
    const shots = {};
    for (const s of stops) {
        await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), s.y);
        // a few frames: the camera snaps in shot mode, the screen's picture fades in one frame
        await page.evaluate(() => new Promise((r) => { let n = 0; const f = () => (++n > 12 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
        await page.waitForTimeout(gpu ? 300 : 3000);
        shots[s.name] = await page.screenshot();
    }
    await browser.close();
    return shots;
}

const A = await grab("proto"), B = await grab("port");
const browser = await chromium.launch();
const page = await browser.newPage();
const rows = [];
for (const name of Object.keys(A)) {
    if (!B[name]) continue;
    writeFileSync(resolve(out, `${name}-proto.png`), A[name]);
    writeFileSync(resolve(out, `${name}-port.png`), B[name]);
    const r = await page.evaluate(async ([a, b]) => {
        const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = "data:image/png;base64," + d; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const c = document.createElement("canvas"); c.width = ia.width; c.height = ia.height;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
        g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
        const diff = g.createImageData(c.width, c.height);
        let sum = 0, over8 = 0, over32 = 0; const n = da.length / 4;
        for (let p = 0; p < da.length; p += 4) {
            const d = (Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2])) / 3;
            sum += d; if (d > 8) over8++; if (d > 32) over32++;
            const v = Math.min(255, d * 8); diff.data[p] = v; diff.data[p + 1] = v * 0.3; diff.data[p + 2] = 0; diff.data[p + 3] = 255;
        }
        g.putImageData(diff, 0, 0);
        return { mean: sum / n, over8: over8 / n, over32: over32 / n, png: c.toDataURL("image/png").split(",")[1] };
    }, [A[name].toString("base64"), B[name].toString("base64")]);
    writeFileSync(resolve(out, `${name}-diff.png`), Buffer.from(r.png, "base64"));
    rows.push({ station: name, mean: +r.mean.toFixed(2), over8: (r.over8 * 100).toFixed(2) + "%", over32: (r.over32 * 100).toFixed(3) + "%" });
}
await browser.close();
console.table(rows);
writeFileSync(resolve(out, "compare.json"), JSON.stringify(rows, null, 2));
