/**
 * The desk without WebGL: the station stills (design/scene, baked by tools/bake.mjs) shown in
 * the veil, one per station, cross-faded as the page scrolls past the same anchors the camera
 * uses; the laptop's window (#scrwin) opens on the projects as it does over the live scene. Only
 * the current station's picture and its neighbours are fetched.
 */
import data from "../../desk/stills.json";

type Set = "desktop" | "mobile";
const urls = import.meta.glob<string>("../../desk/still-*.webp", { eager: true, query: "?url", import: "default" });
const url = (set: Set, name: string) => urls[`../../desk/still-${set}-${name}.webp`];
const stations = data as unknown as Record<Set, { w: number; h: number; scr: Record<string, string> }>;

export async function mountStills(veil: HTMLElement): Promise<void> {
    const layers = [0, 1].map(() => {
        const d = document.createElement("div");
        d.className = "desk-still";
        veil.append(d);
        return d;
    });
    const stops = [...document.querySelectorAll<HTMLElement>("[data-stop]")];
    const cards = [...document.querySelectorAll<HTMLElement>(".card")];
    const win = document.getElementById("scrwin"), rim = document.getElementById("scrrim");
    const RM = matchMedia("(prefers-reduced-motion: reduce)");
    let W = innerWidth, H = innerHeight, set: Set = W < 900 ? "mobile" : "desktop";
    let tops: { top: number; h: number }[] = [], cardBox: { top: number; h: number }[] = [], max = 0, dirty = true;
    let front = 0, showing = "", seq = 0;

    const loaded = new Map<string, Promise<void>>();
    const load = (name: string) => {
        const u = url(set, name);
        if (!u) return Promise.resolve();
        if (!loaded.has(u)) {
            const img = new Image();
            img.decoding = "async";
            img.src = u;
            loaded.set(u, img.decode().catch(() => undefined));
        }
        return loaded.get(u)!;
    };
    function measure() {
        const y = scrollY;
        dirty = false;
        max = document.documentElement.scrollHeight - innerHeight;
        tops = stops.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + y, h: r.height }; });
        cardBox = cards.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + y, h: r.height }; });
    }
    // the station whose picture shows: the camera's anchors (scene/main.js computeGoal), halfway
    function station(): string {
        if (dirty) measure();
        const y = scrollY;
        const a = tops.map((b, i) => i === 0 ? 0 : Math.min(max, Math.max(0, b.top + Math.min(b.h, H) / 2 - H / 2)));
        for (let i = 1; i < a.length; i++) a[i] = Math.max(a[i], a[i - 1] + 1);
        let i = 0;
        while (i < a.length - 2 && y >= a[i + 1]) i++;
        const f = Math.min(1, Math.max(0, (y - a[i]) / (a[i + 1] - a[i])));
        return stops[Math.min(stops.length - 1, f < 0.5 ? i : i + 1)]?.dataset.stop ?? "hero";
    }
    async function show(name: string) {
        if (name === showing) return;
        showing = name;
        const my = ++seq;
        await load(name);
        if (my !== seq) return;
        const back = layers[1 - front];
        back.style.backgroundImage = `url("${url(set, name)}")`;
        back.classList.add("on");
        layers[front].classList.remove("on");
        front = 1 - front;
        // the neighbours, so the next cross-fade has its picture
        const i = stops.findIndex((s) => s.dataset.stop === name);
        for (const n of [stops[i + 1], stops[i - 1]]) if (n?.dataset.stop) void load(n.dataset.stop);
    }
    // the laptop's window: the station's screen outline, scaled as `background-size: cover` scales the picture
    function placeWindow() {
        if (!win || !rim) return;
        const y = scrollY;
        let a = 0;
        for (const c of cardBox) { const top = c.top - y, t = Math.min(1, Math.max(0, Math.min(H * 0.7 - top, top + c.h - H * 0.3) / (H * 0.25))); a = Math.max(a, t * t * (3 - 2 * t)); }
        const d = stations[set].scr[showing];
        if (!d || a === 0) { win.setAttribute("fill", "rgb(255,255,255)"); win.setAttribute("stroke", "rgb(255,255,255)"); rim.setAttribute("stroke-opacity", "0"); return; }
        const { w, h } = stations[set], s = Math.max(W / w, H / h), ox = (W - w * s) / 2, oy = (H - h * s) / 2;
        const path = d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, yy) => `${(+x * s + ox).toFixed(1)} ${(+yy * s + oy).toFixed(1)}`);
        const v = Math.round((1 - a) * 255);
        win.setAttribute("d", path); rim.setAttribute("d", path);
        win.setAttribute("fill", `rgb(${v},${v},${v})`); win.setAttribute("stroke", `rgb(${v},${v},${v})`);
        rim.setAttribute("stroke-opacity", (a * 0.3).toFixed(3));
    }
    let queued = false;
    const update = () => { queued = false; void show(station()); placeWindow(); };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", () => {
        W = innerWidth; H = innerHeight; dirty = true;
        const next: Set = W < 900 ? "mobile" : "desktop";
        if (next !== set) { set = next; showing = ""; }
        queue();
    });
    if ("ResizeObserver" in window) new ResizeObserver(() => { dirty = true; queue(); }).observe(document.documentElement);
    if (RM.matches) layers.forEach((l) => (l.style.transition = "none"));

    // resolve when the first picture is in (or after 3 s, so `desk:ready` is never held up)
    const first = station();
    await Promise.race([load(first), new Promise((r) => setTimeout(r, 3000))]);
    update();
}
