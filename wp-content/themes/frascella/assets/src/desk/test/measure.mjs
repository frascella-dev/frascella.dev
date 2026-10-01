/**
 * Load-time and frame-time measurements of the desk, in headless Chromium through the
 * DevTools protocol. Run `node server.mjs` first, then:
 *
 *   node measure.mjs <url> [--profile desktop|mobile] [--runs 3] [--label name] [--out file.json]
 *
 * desktop: 1440 × 900 @1, no throttling. mobile: 390 × 844 @2, CPU 4× slower, "Fast 3G"
 * (562.5 ms RTT, 1.44 Mbit/s down, 675 kbit/s up). WebGL runs on SwiftShader (software), so
 * GPU-bound numbers are only comparable with each other, never with a real phone. With --gpu
 * it runs on this machine's GPU (Metal), which is closer to what a visitor sees.
 *
 * "First scene frame" is the time from navigation to the first frame the scene rendered
 * (`desk:ready` for the port; `window.__frames` turning 1 for the prototype). "TBT" sums each
 * long task's time over 50 ms between FCP and five seconds after the first scene frame.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve(import.meta.dirname, "../../../../../../plugins/frascella/package.json"));
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a) && !["desktop", "mobile"].includes(a) && a.includes("://"));
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const profile = opt("profile", "desktop"), runs = Number(opt("runs", 3)), label = opt("label", "run"), gpu = args.includes("--gpu");

const PROFILES = {
    desktop: { viewport: { width: 1440, height: 900 }, dpr: 1, cpu: 1, net: null },
    mobile: { viewport: { width: 390, height: 844 }, dpr: 2, cpu: 4, net: { latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 } },
};
const P = PROFILES[profile];

// in the page, before anything else: the observers, and a timer round every rAF callback
const INIT = () => {
    const M = (window.__m = { lcp: 0, fcp: 0, long: [], cb: [], frameAt: 0, readyAt: 0, raf: [] });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) M.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") M.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) M.long.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true });
    document.addEventListener("desk:ready", () => { M.readyAt = performance.now(); });
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (fn) => raf((t) => { const t0 = performance.now(); fn(t); const d = performance.now() - t0; if (M.rec) M.cb.push(d); });
    // the first frame: the prototype counts its frames in window.__frames
    const poll = () => { if (!M.frameAt && (window.__frames || 0) >= 1) M.frameAt = performance.now(); if (!M.frameAt) raf(poll); };
    raf(poll);
};

async function once(i) {
    // --gpu: the machine's own GPU (ANGLE on Metal on a Mac) instead of SwiftShader
    const browser = await chromium.launch({ args: [...(gpu ? ["--use-angle=metal", "--enable-gpu"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]), "--ignore-gpu-blocklist", "--enable-precise-memory-info"] });
    const ctx = await browser.newContext({ viewport: P.viewport, deviceScaleFactor: P.dpr });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Performance.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (P.net) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...P.net });
    if (P.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: P.cpu });
    const res = new Map();
    cdp.on("Network.responseReceived", (e) => res.set(e.requestId, { url: e.response.url, type: e.type, mime: e.response.mimeType, bytes: 0 }));
    cdp.on("Network.loadingFinished", (e) => { const r = res.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.addInitScript(INIT);
    const t0 = Date.now();
    await page.goto(url, { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__m.frameAt || window.__m.readyAt, null, { timeout: 240000, polling: 100 });
    // let the loading settle (late textures, idle work), then read the load metrics
    await page.waitForTimeout(5000);
    const load = await page.evaluate(() => {
        const M = window.__m, first = M.readyAt || M.frameAt, end = first + 5000;
        const inWin = M.long.filter(([s, d]) => s + d > M.fcp && s < end);
        return {
            fcp: M.fcp, lcp: M.lcp, firstFrame: first, frameAt: M.frameAt, readyAt: M.readyAt,
            tbt: inWin.reduce((a, [, d]) => a + Math.max(0, d - 50), 0),
            longTasks: M.long.filter(([s]) => s < end).length,
            maxLong: Math.max(0, ...M.long.filter(([s]) => s < end).map(([, d]) => d)),
            longSum: M.long.filter(([s]) => s < end).reduce((a, [, d]) => a + d, 0),
            heap: performance.memory ? performance.memory.usedJSHeapSize : 0,
        };
    });
    // the heap after a full collection, so the two pages are compared on what they keep
    await cdp.send("HeapProfiler.collectGarbage");
    const pm = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    // at rest: 3 s with no input
    const sample = async (fn) => page.evaluate(async (scroll) => {
        const M = window.__m; M.cb = []; M.rec = true;
        const iv = []; let last = performance.now(), y = scrollY;
        await new Promise((done) => {
            const t0 = performance.now();
            const step = (t) => {
                const now = performance.now(); iv.push(now - last); last = now;
                if (scroll) { y += 9; scrollTo({ top: y, behavior: "instant" }); }
                if (now - t0 < 3000) requestAnimationFrame(step); else done();
            };
            requestAnimationFrame(step);
        });
        M.rec = false;
        const s = (a) => a.slice().sort((x, z) => x - z), q = (a, p) => s(a)[Math.min(a.length - 1, Math.floor(a.length * p))];
        const cb = M.cb.filter((d) => d > 0.05);
        return { frames: iv.length, intervalAvg: iv.reduce((a, b) => a + b, 0) / iv.length, intervalP95: q(iv, 0.95), cbAvg: cb.length ? cb.reduce((a, b) => a + b, 0) / cb.length : 0, cbP95: cb.length ? q(cb, 0.95) : 0 };
    }, fn);
    const rest = await sample(false);
    const scroll = await sample(true);
    const bytes = { js: 0, img: 0, font: 0, css: 0, other: 0, total: 0, count: 0 };
    for (const r of res.values()) {
        const k = r.type === "Script" ? "js" : r.type === "Image" ? "img" : r.type === "Font" ? "font" : r.type === "Stylesheet" ? "css" : "other";
        bytes[k] += r.bytes; bytes.total += r.bytes; bytes.count++;
    }
    await browser.close();
    return { run: i, wall: Date.now() - t0, ...load, jsHeapMB: (pm.JSHeapUsedSize || load.heap) / 1048576, rest, scroll, bytes, errors: errors.slice(0, 5) };
}

const out = [];
for (let i = 0; i < runs; i++) {
    const r = await once(i);
    out.push(r);
    console.log(`[${label} ${profile} #${i}] first frame ${r.firstFrame.toFixed(0)} ms · LCP ${r.lcp.toFixed(0)} · TBT ${r.tbt.toFixed(0)} · long ${r.longTasks} (max ${r.maxLong.toFixed(0)}) · JS ${(r.bytes.js / 1024).toFixed(0)} KB · total ${(r.bytes.total / 1024).toFixed(0)} KB · heap ${r.jsHeapMB.toFixed(1)} MB · rest ${r.rest.intervalAvg.toFixed(1)}/${r.rest.cbAvg.toFixed(2)} ms · scroll ${r.scroll.intervalAvg.toFixed(1)}/${r.scroll.cbAvg.toFixed(2)} ms${r.errors.length ? " · errors: " + r.errors.join(" | ") : ""}`);
}
const med = (k) => { const v = out.map(k).sort((a, b) => a - b); return v[v.length >> 1]; };
const summary = {
    label, profile, url, runs,
    firstFrame: med((r) => r.firstFrame), lcp: med((r) => r.lcp), fcp: med((r) => r.fcp), tbt: med((r) => r.tbt),
    longTasks: med((r) => r.longTasks), maxLong: med((r) => r.maxLong), longSum: med((r) => r.longSum), jsHeapMB: med((r) => r.jsHeapMB),
    jsKB: med((r) => r.bytes.js) / 1024, imgKB: med((r) => r.bytes.img) / 1024, totalKB: med((r) => r.bytes.total) / 1024, requests: med((r) => r.bytes.count),
    restInterval: med((r) => r.rest.intervalAvg), restCb: med((r) => r.rest.cbAvg), restCbP95: med((r) => r.rest.cbP95),
    scrollInterval: med((r) => r.scroll.intervalAvg), scrollIntervalP95: med((r) => r.scroll.intervalP95), scrollCb: med((r) => r.scroll.cbAvg), scrollCbP95: med((r) => r.scroll.cbP95),
};
summary.gpu = gpu;
console.log(JSON.stringify(summary));
const file = opt("out", null);
if (file) writeFileSync(file, JSON.stringify({ summary, runs: out }, null, 2));
