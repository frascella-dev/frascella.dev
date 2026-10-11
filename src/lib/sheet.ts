/**
 * The perforation: the giant words cut out of the Ink sheet, as windows onto the desk.
 *
 * Each `.cut` (template-parts/cut.php) is broken into lines and fitted to its column; its
 * lines are mirrored as SVG text into the sheet's mask (template-parts/stage.php), and on
 * scroll the holes move with the page. A word arriving at the middle of the screen opens:
 * its letters go from almost closed to clear, and its tracking settles. In the intermezzo
 * (`#scrivania`) the whole sheet opens from the middle (`#iris`) and closes again after it.
 *
 * The scene reads `window.__lift` (0 = sheet down, 1 = desk bare) every frame
 * (src/desk/CONTRACT.md §3), and writes the laptop's window into `#scrwin` itself.
 *
 * Runs only where the stage is printed (a page with the desk). Elsewhere
 * `.cut` stays plain text (`html:not(.cutting)` in sheet.css).
 */

declare global {
    interface Window {
        __lift?: number;
        __relayout?: () => void;
    }
}

const NS = "http://www.w3.org/2000/svg";
const SHY = "­";
const TRACK = -0.022;
const LOOSE = 0.05;
const FILL = 0.96;
const MAX_LINES = 4;

interface Block {
    g: SVGGElement;
    rim: SVGGElement;
    wsh: SVGGElement;
    top: number;
    bot: number;
    mid: number;
    a: number;
    on: boolean | null;
    loose: number;
}

/** Every way to break a text into lines: at its spaces, and at soft hyphens inside a word
 * (broken there without a hyphen, as a poster would). */
function splits(text: string): string[][] {
    const parts: string[] = [];
    const joins: string[] = [];
    text.trim()
        .split(/\s+/)
        .forEach((w) =>
            w.split(SHY).forEach((p, j) => {
                if (parts.length) joins.push(j ? "" : " ");
                parts.push(p);
            }),
        );
    const out: string[][] = [];
    for (let m = 0; m < 1 << joins.length; m++) {
        const lines = [parts[0]];
        joins.forEach((j, k) => {
            if (m & (1 << k)) lines.push(parts[k + 1]);
            else lines[lines.length - 1] += j + parts[k + 1];
        });
        if (lines.length <= MAX_LINES) out.push(lines);
    }
    return out;
}

export function initSheet(): void {
    const sheet = document.getElementById("sheet");
    if (!sheet) return;
    const html = document.documentElement;
    const byId = <T extends Element>(id: string) => document.getElementById(id) as unknown as T | null;
    const holes = byId<SVGGElement>("holes");
    const rims = byId<SVGGElement>("rims");
    const wash = byId<SVGGElement>("wash");
    const cover = byId<SVGRectElement>("headcover");
    const clip = byId<SVGRectElement>("headclip");
    const iris = byId<SVGRectElement>("iris");
    if (!holes || !rims || !wash || !cover || !clip || !iris) return;
    const deskEl = document.getElementById("scrivania");
    const cue = document.getElementById("cue");
    const head = document.querySelector<HTMLElement>(".top");

    const RM = matchMedia("(prefers-reduced-motion: reduce)");
    const still = () => RM.matches || location.search.includes("shot");
    let blocks: Block[] = [];
    let W = 0;
    let H = 0;
    let t0 = performance.now();
    let queued = false;
    let liftWas = -1;

    // The cue goes on: from the opening to the bare desk, from the desk to the services.
    cue?.addEventListener("click", () => {
        const behavior: ScrollBehavior = RM.matches ? "auto" : "smooth";
        const next = (window.__lift ?? 0) > 0.9 ? document.querySelector<HTMLElement>(".services") : null;
        if (next) {
            scrollTo({ top: next.getBoundingClientRect().top + scrollY, behavior });
        } else if (deskEl) {
            scrollTo({ top: deskEl.getBoundingClientRect().top + scrollY + H * 0.5, behavior });
        }
    });

    // Widths at 100 px with the lines' own tracking, in the real font: measured, so kerning counts.
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font:400 100px/1 Gloock,serif;letter-spacing:${TRACK}em;font-kerning:normal;font-feature-settings:"kern","liga"`;
    const widths = new Map<string, number>();
    const w100 = (t: string): number => {
        if (!widths.has(t)) {
            probe.textContent = t;
            widths.set(t, probe.getBoundingClientRect().width);
        }
        return widths.get(t) ?? 0;
    };

    function layout(): void {
        W = innerWidth;
        H = innerHeight;
        if (!probe.isConnected) document.body.append(probe);
        const cuts = [...document.querySelectorAll<HTMLElement>(".cut")];
        const rg = document.createRange();
        const byCut: { c: HTMLElement; fs: number; slack: number; chars: number }[] = [];
        for (const c of cuts) {
            if (!c.dataset.src) c.dataset.src = c.textContent ?? "";
            const style = getComputedStyle(c);
            const avail = c.clientWidth * FILL;
            const cap = parseFloat(style.fontSize);
            const lh = parseFloat(style.lineHeight) / parseFloat(style.fontSize) || 0.86;
            // The break that gives the biggest type, a little against every extra line (and,
            // at a tie, the evenest). A block may fix its own breaks ("|" between lines):
            // data-lines above 760 px, data-lines-n below.
            let best: { lines: string[]; fs: number; score: number } | null = null;
            const fx = W > 760 ? c.dataset.lines : c.dataset.linesN;
            const candidates = fx ? [fx.split("|")] : splits(c.dataset.src);
            for (const lines of candidates) {
                const ws = lines.map(w100);
                const wmax = Math.max(...ws);
                const fs = Math.min((avail / wmax) * 100, cap / (lines.length * lh));
                const score = fs * (1 - 0.07 * (lines.length - 1)) * (1 - 0.015 * (wmax / Math.min(...ws) - 1));
                if (!best || score > best.score) best = { lines, fs, score };
            }
            if (!best) continue;
            const chosen = best;
            c.replaceChildren(
                ...chosen.lines.map((t) => {
                    const l = document.createElement("span");
                    l.className = "ln";
                    l.textContent = t;
                    l.insertAdjacentHTML("beforeend", '<i class="bl"></i>');
                    l.style.fontSize = chosen.fs.toFixed(2) + "px";
                    return l;
                }),
            );
            // Check the result as laid out, and shrink if any line still runs past its column.
            let wmax = 0;
            for (const l of c.children) {
                if (!l.firstChild) continue;
                rg.selectNodeContents(l.firstChild);
                wmax = Math.max(wmax, rg.getBoundingClientRect().width);
            }
            let fs = chosen.fs;
            if (wmax > c.clientWidth * 0.985) {
                fs *= (c.clientWidth * 0.985) / wmax;
                for (const l of c.children) (l as HTMLElement).style.fontSize = fs.toFixed(2) + "px";
                wmax *= fs / chosen.fs;
            }
            byCut.push({ c, fs, slack: Math.max(0, c.clientWidth - wmax), chars: Math.max(...chosen.lines.map((t) => t.length)) });
        }

        // Read the boxes, in page coordinates.
        const y = scrollY;
        holes!.replaceChildren();
        rims!.replaceChildren();
        wash!.replaceChildren();
        blocks = byCut.map(({ c, fs, slack, chars }) => {
            const right = getComputedStyle(c).textAlign === "right";
            const g = document.createElementNS(NS, "g");
            g.setAttribute("font-family", "Gloock, serif");
            g.setAttribute("font-size", fs.toFixed(2));
            const bases: number[] = [];
            for (const l of c.children) {
                if (!l.firstChild) continue;
                rg.selectNodeContents(l.firstChild);
                const r = rg.getBoundingClientRect();
                const base = (l.querySelector(".bl")?.getBoundingClientRect().top ?? r.bottom) + y;
                bases.push(base);
                const t = document.createElementNS(NS, "text");
                t.textContent = l.firstChild.textContent;
                t.setAttribute("x", (right ? r.right : r.left).toFixed(1));
                t.setAttribute("y", base.toFixed(1));
                t.setAttribute("text-anchor", right ? "end" : "start");
                g.append(t);
            }
            holes!.append(g);
            const rim = g.cloneNode(true) as SVGGElement;
            rims!.append(rim);
            const wsh = g.cloneNode(true) as SVGGElement;
            wash!.append(wsh);
            const top = Math.min(...bases) - fs;
            const bot = Math.max(...bases) + fs * 0.3;
            // The opening's extra tracking never takes a line past its column.
            const loose = Math.min(LOOSE, slack / (chars * fs));
            return { g, rim, wsh, top, bot, mid: (top + bot) / 2, a: -1, on: null, loose };
        });
        const hh = head?.offsetHeight ?? 0;
        cover!.setAttribute("height", String(hh));
        clip!.setAttribute("y", String(hh));
        html.classList.add("cutting");
        liftWas = -1;
        paint();
    }

    const smooth = (x: number) => x * x * (3 - 2 * x);
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

    // The intermezzo: 0 → 1 as its top climbs from 55% of the screen to the top, 1 while it
    // fills the screen, 1 → 0 as its bottom goes from the foot of the screen to 45%.
    // Reduced motion: a cut.
    function lift(): number {
        if (!deskEl) return 0;
        const r = deskEl.getBoundingClientRect();
        const k = Math.min(clamp01((H * 0.55 - r.top) / (H * 0.55)), clamp01((r.bottom - H * 0.45) / (H * 0.55)));
        return RM.matches ? (k > 0.5 ? 1 : 0) : smooth(k);
    }

    window.__lift = 0;
    function paintLift(): void {
        const e = Math.round(lift() * 1000) / 1000;
        window.__lift = e;
        // Keep scrolling: at the top of the page, and while the desk is bare.
        cue?.classList.toggle("on", scrollY < H * 0.3 || e > 0.9);
        if (e === liftWas) return;
        liftWas = e;
        html.style.setProperty("--lift", String(e));
        // An eye opening: a slit across the middle that widens and grows past the edges.
        const hw = (W / 2 + 60) * (0.4 + 0.6 * e);
        const hh = (H / 2 + 60) * e;
        iris!.setAttribute("x", (W / 2 - hw).toFixed(1));
        iris!.setAttribute("width", (2 * hw).toFixed(1));
        iris!.setAttribute("y", (H / 2 - hh).toFixed(1));
        iris!.setAttribute("height", (2 * hh).toFixed(1));
        iris!.setAttribute("rx", Math.min(hh, 28).toFixed(1));
    }

    function paint(): void {
        queued = false;
        const y = scrollY;
        for (const el of [holes!, rims!, wash!]) el.setAttribute("transform", `translate(0 ${-y})`);
        paintLift();
        // The opening word, on arrival (once, at load).
        const intro = still() ? 1 : Math.min(1, (performance.now() - t0) / 1400);
        for (const b of blocks) {
            const on = b.bot > y - 40 && b.top < y + H + 40;
            if (on !== b.on) {
                const display = on ? "" : "none";
                b.g.style.display = b.rim.style.display = b.wsh.style.display = display;
                b.on = on;
            }
            if (!on) continue;
            // 0 while the word is still low on the screen, 1 once its middle reaches 55% of the height.
            let a = still() ? 1 : 1 - smooth(Math.min(1, Math.max(0, ((b.mid - y) / H - 0.55) / 0.45)));
            if (b === blocks[0]) a = Math.min(a, 1 - Math.pow(1 - intro, 3));
            a = Math.round(a * 100) / 100;
            if (a === b.a) continue;
            b.a = a;
            const v = Math.round((1 - a) * 205);
            b.g.setAttribute("fill", `rgb(${v},${v},${v})`);
            const spacing = (TRACK + (1 - a) * b.loose).toFixed(4) + "em";
            b.g.style.letterSpacing = b.rim.style.letterSpacing = b.wsh.style.letterSpacing = spacing;
            b.rim.setAttribute("stroke-opacity", (0.18 + a * 0.32).toFixed(3));
            b.wsh.setAttribute("fill-opacity", (a * 0.11).toFixed(3));
        }
        if (intro < 1) queue();
    }

    function queue(): void {
        if (!queued) {
            queued = true;
            requestAnimationFrame(paint);
        }
    }

    addEventListener("scroll", queue, { passive: true });
    let rz = 0;
    const relayout = () => {
        cancelAnimationFrame(rz);
        rz = requestAnimationFrame(layout);
    };
    addEventListener("resize", relayout);
    window.__relayout = layout;
    void document.fonts.ready.then(() => {
        t0 = performance.now();
        layout();
        const main = document.querySelector("main");
        if (main) new ResizeObserver(relayout).observe(main);
    });
}
