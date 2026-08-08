/**
 * The tracker. Loaded only after consent has been granted — `main.ts` will
 * not import this module otherwise, so a visitor who refused never downloads
 * it, let alone runs it.
 *
 * What it measures is shaped by the page it measures. This is one document
 * with four sections and a form at the end, so "pageviews" says almost
 * nothing: everybody has exactly one. The questions worth asking are how far
 * down people get, which sections hold them, and where the contact form
 * loses them — which is why depth, dwell and the funnel are first-class here
 * and navigation is barely mentioned.
 *
 * Events are queued and flushed in batches, and the batch is posted as
 * `text/plain` on purpose: it keeps the request CORS-simple, so it never
 * needs a preflight — which `sendBeacon`, on the way out of the page, has no
 * way to answer.
 */

import { apiBase } from "./api.ts";
import { connect, track, type TrackEvent } from "./track.ts";

const ENDPOINT = `${apiBase}/api/track`;

/** Batches are small and frequent; a reader who leaves mid-visit still counts. */
const FLUSH_MS = 5000;
const MAX_BATCH = 25;

/** Sections carry the page's own ids; `top` reads better as `hero`. */
const SECTION_NAMES: Record<string, string> = {
    top: "hero",
    bio: "bio",
    work: "work",
    contact: "contact",
};

let queue: TrackEvent[] = [];
let timer: number | null = null;
let started = 0;
let visibleMs = 0;
let visibleSince = 0;

// --- transport ---------------------------------------------------------------

function context() {
    return {
        path: location.pathname + location.search,
        ref: document.referrer,
        vw: innerWidth,
        vh: innerHeight,
        sw: screen.width,
        sh: screen.height,
        lang: navigator.language,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
}

function flush(final = false): void {
    if (timer !== null) {
        clearTimeout(timer);
        timer = null;
    }
    if (queue.length === 0) return;

    const events = queue.splice(0, queue.length);
    const body = JSON.stringify({ ctx: context(), events });

    // On the way out the page may already be frozen, and only a beacon is
    // guaranteed to survive it.
    if (final && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain;charset=UTF-8" }));
        return;
    }

    fetch(ENDPOINT, {
        method: "POST",
        body,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        credentials: "include",
        keepalive: true,
    }).catch(() => {
        // A dropped batch is a dropped batch. Retrying would mean holding
        // events across a failure that is usually the network going away.
    });
}

function enqueue(event: TrackEvent): void {
    queue.push(event);
    if (queue.length >= MAX_BATCH) {
        flush();
        return;
    }
    if (timer === null) timer = window.setTimeout(() => flush(), FLUSH_MS);
}

// --- what gets measured -------------------------------------------------------

/** Milestones, each fired once — the API reads them as cumulative. */
function watchScroll(): void {
    const marks = [25, 50, 75, 100];
    let next = 0;
    let ticking = false;

    const measure = () => {
        ticking = false;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - innerHeight;
        // A page shorter than the viewport is 100% read the moment it opens.
        const depth = scrollable <= 0 ? 100 : ((scrollY / scrollable) * 100);
        while (next < marks.length && depth >= marks[next] - 0.5) {
            track("scroll_depth", undefined, marks[next]);
            next++;
        }
        if (next >= marks.length) removeEventListener("scroll", onScroll);
    };

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(measure);
    };

    addEventListener("scroll", onScroll, { passive: true });
    measure();
}

/**
 * Section reach and dwell. A section counts as being read when half a
 * screenful of it is on screen — a ratio threshold alone would never fire
 * for the work stage, which is six viewports tall.
 */
function watchSections(): void {
    const sections = [...document.querySelectorAll<HTMLElement>("main > section[id]")].filter(
        (el) => el.id in SECTION_NAMES,
    );
    if (sections.length === 0) return;

    const seen = new Set<string>();
    const openedAt = new Map<string, number>();

    const close = (name: string) => {
        const from = openedAt.get(name);
        if (from === undefined) return;
        openedAt.delete(name);
        const ms = Date.now() - from;
        // Under a second is a section scrolled past, not one read.
        if (ms >= 1000) track("section_time", name, ms);
    };

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const name = SECTION_NAMES[(entry.target as HTMLElement).id];
                const enough =
                    Math.min(entry.boundingClientRect.height, innerHeight) * 0.5;
                const visible = entry.isIntersecting && entry.intersectionRect.height >= enough;

                if (visible) {
                    if (!seen.has(name)) {
                        seen.add(name);
                        track("section_view", name);
                    }
                    if (!openedAt.has(name)) openedAt.set(name, Date.now());
                } else {
                    close(name);
                }
            }
        },
        // Enough steps that a tall section still reports as it passes.
        { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );

    for (const section of sections) observer.observe(section);

    // A backgrounded tab is not dwell time.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            for (const name of [...openedAt.keys()]) close(name);
        }
    });
    addEventListener("pagehide", () => {
        for (const name of [...openedAt.keys()]) close(name);
    });
}

/** Clicks worth a name, read off the markup that is already there. */
function watchInteractions(): void {
    document.addEventListener(
        "click",
        (e) => {
            const target = e.target as Element | null;
            if (!target) return;

            const row = target.closest<HTMLElement>("[data-acc-head]");
            if (row) track("bio_open", row.dataset.img ?? "");

            if (target.closest("[data-nav-toggle]")) track("nav_open");

            const link = target.closest<HTMLAnchorElement>("a[href]");
            if (!link) return;

            const href = link.getAttribute("href") ?? "";
            if (href.startsWith("#")) {
                if (link.closest("[data-nav-drawer]") || link.closest("header")) {
                    track("nav_link", href.slice(1));
                }
                return;
            }

            try {
                const url = new URL(link.href, location.href);
                if (url.host === location.host) return;
                // A link out of the work section is somebody following a
                // project; anywhere else it is just a link out.
                track(link.closest("#work") ? "project_click" : "outbound", url.host);
            } catch {
                // A malformed href is not an event.
            }
        },
        { capture: true, passive: true },
    );

    // How far into the corridor people actually travel. `lib/scroll.ts`
    // names the project in frame on `data-work-shown`; watching an attribute
    // it sets deliberately beats watching text it happened to rewrite, which
    // is what this did until the captions became one block per project and
    // there was nothing left to mutate.
    const caption = document.querySelector<HTMLElement>("[data-work-shown]");
    if (caption) {
        let last = "";
        let index = 0;
        new MutationObserver(() => {
            const now = (caption.dataset.workShown ?? "").trim();
            if (now === "" || now === last) return;
            last = now;
            track("work_step", now, index++);
        }).observe(caption, { attributes: true, attributeFilter: ["data-work-shown"] });
    }
}

/** Total time the page was actually on screen, sent once, on the way out. */
function watchPageTime(): void {
    started = Date.now();
    visibleSince = document.visibilityState === "visible" ? started : 0;

    const pause = () => {
        if (visibleSince === 0) return;
        visibleMs += Date.now() - visibleSince;
        visibleSince = 0;
    };
    const resume = () => {
        if (visibleSince === 0) visibleSince = Date.now();
    };

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            pause();
            flush(true);
        } else {
            resume();
        }
    });

    addEventListener("pagehide", () => {
        pause();
        track("page_exit", undefined, visibleMs);
        flush(true);
    });
}

let running = false;

/** Called by main.ts, and only with consent granted. */
export function initAnalytics(): void {
    if (running) return;
    running = true;

    // Anything the page reported while the module was still loading — the
    // splash is several seconds long — arrives here first, in order.
    connect(enqueue);

    track("pageview");
    watchPageTime();
    watchScroll();
    watchSections();
    watchInteractions();
}
