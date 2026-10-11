/**
 * The site, checked in a browser: every page, in both languages, on a desktop and a phone.
 *
 * - every page answers, the 404 too;
 * - no script error, no failed request, nothing loaded from another host;
 * - no cookie and nothing in the browser's storage (the privacy notice says so);
 * - axe: WCAG 2.1 AA and best practice, serious and critical violations fail;
 * - the home page: the desk in WebGL, the cut-out words cut, the phone's menu (focus, inert,
 *   Esc), and the keyboard never stopping on a hidden control;
 * - the sitemap and the canonical/hreflang of every page.
 *
 * Screenshots go to tests/shots/ (not committed): look at them.
 *
 *   npm run build && npm test                      against dist/, served here
 *   BASE=https://www.frascella.dev npm test        against a published site (read-only)
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const SHOTS = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

let failed = 0;
const check = (name, ok, detail = "") => {
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
};

let server;
let BASE = process.env.BASE?.replace(/\/$/, "");
if (!BASE) {
    // dist/ as Pages serves it: a directory's index.html, and 404.html for anything else.
    const root = new URL("../dist/", import.meta.url).pathname;
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
    server = createServer((req, res) => {
        let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (path.endsWith("/")) path += "index.html";
        const file = join(root, normalize(path));
        const found = file.startsWith(root) && existsSync(file) && statSync(file).isFile();
        res.writeHead(found ? 200 : 404, { "Content-Type": types[extname(found ? file : "404.html")] ?? "application/octet-stream" });
        res.end(readFileSync(found ? file : join(root, "404.html")));
    }).listen(4329, "127.0.0.1");
    BASE = "http://127.0.0.1:4329";
}
const host = new URL(BASE).host;

const pages = [
    ["/", 200],
    ["/en/", 200],
    ["/privacy/", 200],
    ["/en/privacy/", 200],
    ["/not-a-page/", 404],
];

// waitForFunction polls on animation frames, which the scene keeps busy: poll on a timer instead
async function until(page, fn, ms = 60000) {
    for (let t = 0; t < ms; t += 500) {
        if (await page.evaluate(fn)) return true;
        await page.waitForTimeout(500);
    }
    return false;
}

// a screenshot straight from the compositor: Playwright's own waits for a quiet frame, and the
// scene's render loop never gives it one
async function shot(page, path) {
    const cdp = await page.context().newCDPSession(page);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path, Buffer.from(data, "base64"));
    await cdp.detach();
}

async function audit(page, name) {
    await page.addScriptTag({ content: AXE });
    const result = await page.evaluate(async () => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] }));
    const bad = result.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    check(`a11y: ${name}`, bad.length === 0, bad.map((v) => `${v.id}: ${v.nodes[0].target.join(" ")}`).join(" | "));
}

const browser = await chromium.launch();
try {
    for (const [width, height, label] of [
        [1440, 900, "desktop"],
        [390, 844, "phone"],
    ]) {
        for (const [url, status] of pages) {
            const context = await browser.newContext({ viewport: { width, height } });
            const page = await context.newPage();
            const errors = [];
            const bad = [];
            const hosts = new Set();
            page.on("pageerror", (e) => errors.push(e.message));
            page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));
            page.on("response", (r) => {
                hosts.add(new URL(r.url()).host);
                if (r.status() >= 400 && r.url() !== BASE + url) bad.push(`${r.status()} ${r.url()}`);
            });
            const response = await page.goto(BASE + url, { waitUntil: "load" });
            const name = `${url} (${label})`;
            check(`${name}: answers ${status}`, response?.status() === status, String(response?.status()));
            if (url.endsWith("/") && !url.includes("not-a-page") && url.split("/").length <= 3 && !url.includes("privacy")) {
                if (!(await until(page, () => document.documentElement.classList.contains("desk-ready")))) errors.push("desk never ready: " + (await page.evaluate(() => document.documentElement.className)));
                const mode = await page.evaluate(() => (document.documentElement.classList.contains("desk-webgl") ? "webgl" : "fallback"));
                check(`${name}: the desk, in WebGL`, mode === "webgl", mode);
                check(`${name}: the words are cut out of the sheet`, await page.evaluate(() => document.documentElement.classList.contains("cutting")));
                await page.waitForTimeout(1500);
                await shot(page, `${SHOTS}${label}${url.replace(/\//g, "-")}0.png`);
                // a few screens down: the desk, a service, the work, the contact
                for (const [i, id] of ["scrivania", url === "/" ? "servizi" : "services", url === "/" ? "lavori" : "work", url === "/" ? "contatti" : "contact"].entries()) {
                    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: "start" }), id);
                    await page.waitForTimeout(1800);
                    await shot(page, `${SHOTS}${label}${url.replace(/\//g, "-")}${i + 1}.png`);
                }
            } else {
                await page.screenshot({ path: `${SHOTS}${label}${url.replace(/\//g, "-")}.png`, fullPage: true });
            }
            check(`${name}: no script errors`, errors.length === 0, errors.join(" | "));
            check(`${name}: no failed requests`, bad.length === 0, bad.join(" | "));
            check(`${name}: nothing from another host`, [...hosts].every((h) => h === host), [...hosts].join(", "));
            const storage = await page.evaluate(() => localStorage.length + sessionStorage.length);
            const cookies = await context.cookies();
            check(`${name}: no cookies, nothing stored`, cookies.length === 0 && storage === 0, `${cookies.length} cookies, ${storage} stored`);
            await page.emulateMedia({ reducedMotion: "reduce" });
            await audit(page, name);
            await context.close();
        }
    }

    // The phone's menu: opens, takes the focus, the page behind is inert; Esc gives it back.
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
    await phone.goto(BASE + "/", { waitUntil: "load" });
    await phone.click(".menu-btn");
    const open = await phone.evaluate(() => ({
        expanded: document.querySelector(".menu-btn").getAttribute("aria-expanded"),
        focus: document.activeElement?.closest("#site-drawer") !== null,
        inert: document.querySelector("main").inert,
    }));
    check("phone menu: opens, takes the focus, and the page behind is inert", open.expanded === "true" && open.focus && open.inert, JSON.stringify(open));
    await audit(phone, "/ menu open (phone)");
    await phone.keyboard.press("Escape");
    const closed = await phone.evaluate(() => ({
        expanded: document.querySelector(".menu-btn").getAttribute("aria-expanded"),
        focus: document.activeElement?.classList.contains("menu-btn"),
        inert: document.querySelector("main").inert,
    }));
    check("phone menu: Esc closes it and gives the focus back", closed.expanded === "false" && closed.focus && !closed.inert, JSON.stringify(closed));

    // The keyboard: after «scrivimi» comes the page, never a hidden control.
    const desk = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await desk.goto(BASE + "/", { waitUntil: "load" });
    await until(desk, () => document.documentElement.classList.contains("desk-ready"));
    await desk.evaluate(() => document.querySelector(".top-cta").focus());
    await desk.keyboard.press("Tab");
    const next = await desk.evaluate(() => {
        const el = document.activeElement;
        const r = el?.getBoundingClientRect();
        return { id: el?.id || el?.className, visible: !!r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight };
    });
    check("keyboard: after «scrivimi» the next stop is visible", next.visible, JSON.stringify(next));

    // The owl: it arrives on the desk, flies when touched, and lands again.
    check("owl: loaded on the desk", await until(desk, () => window.__desk?.owlLoaded?.()));
    await desk.evaluate(() => document.getElementById("scrivania").scrollIntoView({ block: "start" }));
    const shown = await until(desk, () => window.__desk.hotspots().find((h) => h.n === "owl")?.vis, 30000);
    check("owl: its dot is on screen in the intermezzo", shown, JSON.stringify(await desk.evaluate(() => window.__desk.hotspots().find((h) => h.n === "owl"))));
    await desk.evaluate(() => document.getElementById("owl-btn").click());
    check("owl: the switch sends it flying", await desk.evaluate(() => window.__desk.owlFlying()));
    check("owl: its dot is gone while it flies", await until(desk, () => !window.__desk.hotspots().find((h) => h.n === "owl")?.vis, 10000));
    // the rest of the flight at once: a headless browser draws a few frames a second
    check("owl: it comes back and lands", (await desk.evaluate(() => window.__desk.owlStep(20))) === false);
    check("owl: its dot is back once it has landed", await until(desk, () => window.__desk.hotspots().find((h) => h.n === "owl")?.vis, 30000));

    // The owl's flight touches nothing: a centimetre at least from everything, and never into the desk.
    const clear = await desk.evaluate(() => window.__desk.owlClearance());
    const tight = Object.entries(clear.gap).filter(([, g]) => g < 1);
    check("owl: the flight touches nothing on the desk", tight.length === 0 && clear.low > -0.5, JSON.stringify(clear));

    // The head and the sitemap: one canonical per page, its languages, on the custom domain.
    const sitemap = await (await fetch(BASE + "/sitemap.xml")).text();
    for (const path of ["", "en/", "privacy/", "en/privacy/"]) {
        const html = await (await fetch(BASE + "/" + path)).text();
        const url = "https://www.frascella.dev/" + path;
        check(`head: /${path} canonical`, html.includes(`<link rel="canonical" href="${url}"`));
        check(`head: /${path} hreflang it, en, x-default`, ['hreflang="it"', 'hreflang="en"', 'hreflang="x-default"'].every((h) => html.includes(h)));
        check(`sitemap: /${path}`, sitemap.includes(`<loc>${url}</loc>`));
    }
} finally {
    await browser.close();
    server?.close();
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
