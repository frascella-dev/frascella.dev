/**
 * The desk's loader: everything the page needs before three.js arrives, and nothing more.
 *
 * At once (this file runs as soon as the module is parsed): `html.desk-loading`, the warm grey
 * veil the cut-out letters show while the desk loads, and the progress hairline under the
 * header. Once the words are painted in their own faces, when the browser is idle: the texture workers start painting
 * (scene/texpool.js) and the scene's chunks are imported; the scene builds itself in slices and
 * resolves on its first frame; then the veil fades and the desk shows through the letters.
 * Without WebGL 2 (or with only a software one, or Save-Data on) the veil shows the station
 * stills instead (fallback.ts). Either way `desk:ready` fires once; see CONTRACT.md.
 */
import "./desk.css";
import { createPool } from "./scene/texpool.js";

export type DeskMode = "webgl" | "fallback";
export interface DeskOptions {
    /** The canvas to draw on (default `canvas#desk`). */
    canvas?: HTMLCanvasElement | null;
    /** Draw even when the only WebGL is a software one (tests). Default false. */
    allowSoftware?: boolean;
    /** Skip WebGL and show the stills (tests). */
    forceFallback?: boolean;
}

declare global {
    interface Window {
        frascellaDesk?: { ready: Promise<DeskMode> };
        frascellaDeskOptions?: DeskOptions;
    }
}

const html = document.documentElement;
const emit = (name: string, detail: unknown) => document.dispatchEvent(new CustomEvent(name, { detail }));

/**
 * After the words are on screen in their own faces: the fonts and the page loaded, then two
 * frames painted, then when the main thread is free (or after `timeout` ms anyway). The scene's
 * first seconds are long tasks (three.js, the room, the shaders); started any earlier, they hold
 * back the paint of the opening's text, the page's largest.
 */
async function afterWordsIdle(timeout: number): Promise<void> {
    const loaded = document.readyState === "complete" ? Promise.resolve() : new Promise<void>((r) => addEventListener("load", () => r(), { once: true }));
    await Promise.all([document.fonts.ready, loaded]);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise<void>((r) => ("requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout }) : setTimeout(r, 1)));
}

/** The scene's chunks (named by the build in `<meta name="desk-chunks">`), fetched at low priority once the faces are in. */
function prefetchScene(): void {
    const list = document.querySelector<HTMLMetaElement>('meta[name="desk-chunks"]')?.content.split(" ").filter(Boolean) ?? [];
    void document.fonts.ready.then(() => {
        for (const href of list) document.head.append(Object.assign(document.createElement("link"), { rel: "modulepreload", href, fetchPriority: "low" }));
    });
}

export function mountDesk(options: DeskOptions = {}): Promise<DeskMode> {
    const opts = { ...window.frascellaDeskOptions, ...options };
    const canvas = opts.canvas ?? document.querySelector<HTMLCanvasElement>("canvas#desk");
    if (!canvas) return Promise.reject(new Error("no canvas#desk"));

    html.classList.add("desk-loading");
    const veil = document.createElement("div");
    veil.className = "desk-veil";
    veil.setAttribute("aria-hidden", "true");
    const line = document.createElement("div");
    line.className = "desk-progress";
    line.setAttribute("aria-hidden", "true");
    canvas.after(veil, line);
    const head = document.querySelector<HTMLElement>(".top");
    const placeLine = () => line.style.setProperty("--desk-top", `${head ? head.offsetHeight : 0}px`);
    placeLine();
    addEventListener("resize", placeLine);

    let shown = 0;
    const progress = (p: number) => {
        // only forward, and in steps a person can see
        if (p < shown + 0.01 && p < 1) return;
        shown = Math.max(shown, Math.min(1, p));
        line.style.setProperty("--p", shown.toFixed(3));
        emit("desk:progress", { progress: shown });
    };
    progress(0.02);

    const done = (mode: DeskMode) => {
        html.classList.remove("desk-loading");
        html.classList.add("desk-ready", mode === "webgl" ? "desk-webgl" : "desk-fallback");
        removeEventListener("resize", placeLine);
        emit("desk:ready", { mode });
        return mode;
    };
    const still = async (reason: unknown, announce = true): Promise<DeskMode> => {
        if (reason) console.info("[desk] showing the stills:", reason instanceof Error ? reason.message : reason);
        canvas.style.visibility = "hidden";
        html.classList.remove("desk-webgl");
        const { mountStills } = await import("./fallback.ts");
        await mountStills(veil);
        if (!announce) { html.classList.add("desk-fallback"); return "fallback"; }
        return done("fallback");
    };

    const shot = location.search.includes("shot");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const ready = (async (): Promise<DeskMode> => {
        if (opts.forceFallback || !("WebGL2RenderingContext" in window)) return still(opts.forceFallback ? "asked" : "no WebGL 2");
        if (conn?.saveData) return still("Save-Data");
        prefetchScene();
        await afterWordsIdle(1500);
        const pool = createPool({ shot });
        pool.prefetch();
        progress(0.05);
        try {
            const { start } = await import("./scene/main.js");
            progress(0.18);
            await start({ canvas, pool, progress: (p) => progress(0.18 + p * 0.82), allowSoftware: !!opts.allowSoftware, shot });
        } catch (e) {
            pool.close();
            return still(e);
        }
        // a lost context (the GPU reset, the tab evicted) does not come back: the stills take over
        addEventListener("desk:lost", () => { void still("context lost", false); }, { once: true });
        return done("webgl");
    })();
    window.frascellaDesk = { ready };
    return ready;
}
