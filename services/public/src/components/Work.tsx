import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowUpRight } from "@tabler/icons-react";
import { useReveal } from "./Hooks.tsx";
import { projects } from "../data/projects.ts";

// three.js is heavy, so the corridor showcase is a separate chunk fetched
// only once the section is near the viewport — same lazy pattern Contact.tsx
// uses for SocialBlocks3D. Until then (and always under reduced motion) the
// plain-text manifest below stands in, so the section is never an empty
// pinned box.
const WorkCorridor3D = lazy(() => import("./WorkCorridor3D.tsx"));

// Same real project data the Work grid always showed (src/data/projects.ts),
// plus the same honest "coming soon" placeholders the old scatter-field
// showed — no invented ships.
const WIP_ITEMS = [
    {
        slug: "wip-01",
        tone: "ink",
        title: "Untitled · 01",
        tagline: "Parked behind this block. Nearly ready.",
        year: 2026,
        metric: { n: "WIP", l: "Status" },
        stack: ["TypeScript", "React"],
        kind: "wip",
    },
    {
        slug: "wip-02",
        tone: "paper",
        title: "Untitled · 02",
        tagline: "Locked for now — case study on the way.",
        year: 2026,
        metric: { n: "WIP", l: "Status" },
        stack: ["Go", "Postgres"],
        kind: "wip",
    },
    {
        slug: "wip-03",
        tone: "accent",
        title: "Untitled · 03",
        tagline: "Still drafting. Drop a line for an early look.",
        year: 2026,
        metric: { n: "WIP", l: "Status" },
        stack: ["Laravel", "Inertia"],
        kind: "wip",
    },
];

function buildItems() {
    return [...projects.map((p) => ({ ...p, kind: "shipped" })), ...WIP_ITEMS];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// --- The pinned stage's beat sheet, in screens of scroll ------------------
//
// LEAD   still on the first project, before the corridor starts moving.
// (n-1)  one screen of travel per gap between projects.
// HOLD   still on the LAST project — the beat that used to be TAIL. The
//        corridor no longer releases from here, so this is what stops the
//        last card being read while the camera is already walking away.
// FINALE the walk past the last frame to the threshold at the end of the
//        aisle, and the copy resolving on it. Longer than a project gap
//        because it covers empty aisle, an arrival, and four lines of text
//        that have to be legible before anything else happens.
// TAIL   still on the arrival, before the stage releases into the archive
//        strip and § 03. Both ends of the pin are stillness; so is the
//        seam between the last project and the finale.
//
// The wrapper is grown by exactly this much, so every beat is bought with
// added page height rather than taken out of the travel between projects.
const LEAD = 0.75;
const HOLD = 0.75;
const FINALE = 1.15;
const TAIL = 0.65;

/** Sub-range of a 0..1 progress value, clamped — the stagger primitive for
 *  the finale's reveal. Scroll-linked, so scrubbing backwards unplays it
 *  exactly as it played. */
const seg = (v: number, a: number, b: number) =>
    Math.max(0, Math.min(1, (v - a) / (b - a)));

function useIsMobile(bp = 1000) {
    const [mob, setMob] = useState(
        () => typeof window !== "undefined" && window.innerWidth < bp,
    );
    useEffect(() => {
        const onResize = () => setMob(window.innerWidth < bp);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [bp]);
    return mob;
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const on = () => setReduced(mq.matches);
        mq.addEventListener("change", on);
        return () => mq.removeEventListener("change", on);
    }, []);
    return reduced;
}

/** True once the element is within `rootMargin` of the viewport — latches on. */
function useNearViewport(
    ref: React.MutableRefObject<HTMLElement | null>,
    rootMargin = "600px",
) {
    const [near, setNear] = useState(false);
    useEffect(() => {
        if (near) return;
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setNear(true);
                    io.disconnect();
                }
            },
            { rootMargin },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [ref, near, rootMargin]);
    return near;
}

/** The accessible, no-3D read of the same corridor: a plain manifest. Shown
 *  under reduced motion, before the WorkCorridor3D chunk has loaded, and
 *  always present in spirit — every title here is real, crawlable text. */
function WorkCorridorFallback({
    items,
    activeIndex,
    onSelect,
}: {
    items: any[];
    activeIndex: number;
    onSelect: (i: number) => void;
}) {
    const shipped = items.filter((it) => it.kind !== "wip").length;
    return (
        <div className="ef-work-fallback">
            <ol className="ef-work-fallback-list">
                {items.map((it, i) => (
                    <li
                        key={it.slug}
                        className={`ef-work-fallback-item ${
                            i === activeIndex ? "is-active" : ""
                        } ${it.kind === "wip" ? "is-wip" : ""}`}
                    >
                        <button
                            type="button"
                            onClick={() => onSelect(i)}
                            data-cursor="view"
                        >
                            <span className="ef-mono ef-work-fallback-idx">
                                № {pad2(i + 1)}
                            </span>
                            <span className="ef-work-fallback-title">
                                {it.title}
                            </span>
                            <span className="ef-work-fallback-tag">
                                {it.tagline}
                            </span>
                            <span className="ef-work-fallback-meta">
                                <ul
                                    className="ef-work-fallback-stack"
                                    aria-hidden
                                >
                                    {(it.stack || [])
                                        .slice(0, 4)
                                        .map((s: string) => (
                                            <li key={s}>{s}</li>
                                        ))}
                                </ul>
                                {it.metric && (
                                    <span className="ef-mono ef-work-fallback-year">
                                        {it.kind === "wip"
                                            ? "WIP"
                                            : it.year}
                                    </span>
                                )}
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
            {/* The finale, stated rather than arrived at. Under reduced
                motion there is no walk to the end of the aisle, so the
                ending has to be the last line of the record instead of a
                place you reach — same words, same order, no movement. */}
            <div className="ef-work-fallback-end">
                <span className="ef-label">end of the aisle</span>
                <p className="ef-work-fallback-end-line">
                    this is as far as it goes — <em>for now.</em>
                </p>
                <span className="ef-mono ef-work-fallback-end-count">
                    {pad2(shipped)} shipped · {pad2(items.length - shipped)} in
                    progress
                </span>
            </div>
        </div>
    );
}

/**
 * The arrival plate: the words at the end of the corridor.
 *
 * Deliberately plain DOM over the transparent canvas rather than a drei
 * <Html> inside it — the scene owns space, the page owns type. That keeps the
 * finale copy at real CSS size (crisp, responsive, no 1/distance scaling),
 * makes it identical on the desktop hallway and the mobile rail, and means
 * the one thing the visitor has to *read* at the end never depends on where
 * the camera happens to be. The 3D threshold resolves around it.
 *
 * Every value here is a sub-range of the scroll-derived `finale`, so the
 * reveal scrubs both ways and can't be left half-played by a fast scroll, an
 * anchor jump or a reversal. The order is the reading order: where you are,
 * a rule under it, the sentence, then the count. Nothing else in the frame
 * moves while this happens.
 */
function WorkFinale({ finale, items }: { finale: number; items: any[] }) {
    const shipped = items.filter((it) => it.kind !== "wip").length;
    const rise = (t: number, px: number) => ({
        opacity: t,
        transform: `translate3d(0, ${(1 - t) * px}px, 0)`,
    });
    return (
        <div className="ef-work-finale">
            <div className="ef-work-finale-inner">
                <span
                    className="ef-label ef-work-finale-eyebrow"
                    style={rise(seg(finale, 0.3, 0.52), 8)}
                >
                    end of the aisle
                </span>
                <span
                    className="ef-work-finale-rule"
                    aria-hidden
                    style={{ transform: `scaleX(${seg(finale, 0.42, 0.68)})` }}
                />
                <p className="ef-work-finale-line">
                    <span style={rise(seg(finale, 0.52, 0.76), 14)}>
                        this is as far
                    </span>
                    <span style={rise(seg(finale, 0.6, 0.84), 14)}>
                        as it goes — <em>for now.</em>
                    </span>
                </p>
                <span
                    className="ef-mono ef-work-finale-foot"
                    style={rise(seg(finale, 0.74, 0.96), 8)}
                >
                    {pad2(shipped)} shipped · {pad2(items.length - shipped)} in
                    progress
                </span>
            </div>
        </div>
    );
}

/**
 * Work's ambient line motif — a faint grid, two parallax rects and two
 * hairline rules, all decorative.
 *
 * Deliberately local to this section rather than shared: every section is
 * free to draw its own motif, and About's big-bang stage has its own. Painted
 * twice here — once in the head, once inside the corridor's sticky stage,
 * where it shows through the transparent WebGL canvas so the page's own lines
 * come from underneath the 3D instead of being redrawn inside it.
 */
function AmbientField({ mouse }: { mouse: { x: number; y: number } }) {
    return (
        <div className="ef-work-field" aria-hidden>
            <div className="ef-about-grid-bg" />
            <div
                className="ef-rect ef-w-rect--1"
                style={{ transform: `translate3d(${(mouse.x - 0.5) * -10}px, 0, 0)` }}
            />
            <div
                className="ef-rect ef-w-rect--3"
                style={{ transform: `translate3d(${(mouse.x - 0.5) * -6}px, 0, 0)` }}
            />
            <div className="ef-w-rule-v" />
            <div className="ef-w-rule-h" />
        </div>
    );
}

export default function Work() {
    const [revealRef, shown] = useReveal();
    const [stripRef, stripShown] = useReveal<HTMLDivElement>({ threshold: 0.6 });
    const sectionRef = useRef<HTMLElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const [activeFloat, setActiveFloat] = useState(0);
    const [finale, setFinale] = useState(0);
    const isMobile = useIsMobile();
    const reducedMotion = usePrefersReducedMotion();
    const nearViewport = useNearViewport(wrapRef);
    const items = useMemo(buildItems, []);
    const n = items.length;

    const setRefs = (node: HTMLElement | null) => {
        sectionRef.current = node;
        if (revealRef) revealRef.current = node;
    };

    // The title is normal, in-flow content — it scrolls away like any
    // heading, no pin, no fade. Only the corridor wrapper below it pins:
    // its sticky stage locks the moment its top reaches the viewport top,
    // fully formed (no crossfade), and stays locked for exactly `n` screens
    // — one per project, camera resting dead-centre on project i at
    // scroll-progress p = i — before releasing into the next section.
    useEffect(() => {
        const onScroll = () => {
            const el = wrapRef.current;
            if (!el) return;
            const vh = window.innerHeight || 1;
            const r = el.getBoundingClientRect();
            const scrolled = -r.top;
            // LEAD/TAIL shift the mapping so the corridor holds still for a
            // beat at each end. Without them the stage pins and starts moving
            // in the same instant, so the first project is already sliding
            // away before it has been read; likewise the last one is gone the
            // moment it arrives.
            const p = (scrolled - LEAD * vh) / vh;
            setActiveFloat(Math.max(0, Math.min(n - 1, p)));
            // The finale picks up where the projects leave off, after HOLD
            // screens of stillness on the last one. Both are read off the
            // same rect in the same tick, so they can never disagree.
            setFinale(
                Math.max(0, Math.min(1, (p - (n - 1) - HOLD) / FINALE)),
            );
        };
        const onMove = (e: MouseEvent) => {
            const sec = sectionRef.current;
            if (!sec) return;
            const sr = sec.getBoundingClientRect();
            setMouse({
                x: Math.max(0, Math.min(1, (e.clientX - sr.left) / sr.width)),
                y: Math.max(0, Math.min(1, (e.clientY - sr.top) / sr.height)),
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        if (!isMobile) {
            window.addEventListener("mousemove", onMove, { passive: true });
        }
        onScroll();
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("mousemove", onMove);
        };
    }, [isMobile, n]);

    const activeIndex = Math.round(activeFloat);
    // Same 0..1 sweep the old scatter section's `rel` gave across the whole
    // section, scoped instead to the corridor's own pin: 0 resting on the
    // first project, 1 on the last, driving the bigword's vertical drift.
    const stageRel = n > 1 ? activeFloat / (n - 1) : 0;

    // Nav buttons (and corridor-card clicks) don't hijack the scroll — they
    // just scroll the page to the exact position where the corridor camera
    // rests centred on that project, same as any anchor jump, so Lenis /
    // keyboard / back-button all keep working.
    const goTo = (i: number) => {
        const idx = Math.max(0, Math.min(n - 1, i));
        const el = wrapRef.current;
        if (!el) return;
        const vh = window.innerHeight || 1;
        const top = el.getBoundingClientRect().top + window.scrollY;
        const target = top + (LEAD + idx) * vh;
        const lenis = (window as any).__lenis;
        if (lenis?.scrollTo) lenis.scrollTo(target, { duration: 1 });
        else window.scrollTo({ top: target, behavior: "smooth" });
    };

    const showCorridor = nearViewport && !reducedMotion;

    // Under reduced motion nothing is scroll-driven, so the finale's screens
    // of scroll would be dead height over a static list. The wrapper keeps
    // exactly the budget it had before the finale existed, and the ending is
    // carried as the closing block of the manifest instead.
    const screens = reducedMotion
        ? n + LEAD + TAIL
        : n + LEAD + HOLD + FINALE + TAIL;

    // As the room opens out, the "work." wordmark under the canvas comes up
    // from a whisper to something you notice — the last beat reframes the
    // walk as having been inside the word all along. Two hundredths of
    // opacity; the restraint is the point.
    const bigwordOpacity = 0.05 + seg(finale, 0.35, 0.85) * 0.055;

    return (
        <section
            className={`ef-work ${shown ? "is-in" : ""}`}
            id="work"
            ref={setRefs}
            data-screen-label="02 Work"
        >
            <div className="ef-work-head">
                <AmbientField mouse={mouse} />

                <span className="ef-label">§ 02 — Selected work</span>
                <h2 className="ef-work-title">
                    <span className="ef-line ef-line--1">
                        <span className="ef-w">systems,</span>
                        <em className="ef-w ef-w--em">apis</em>
                    </span>
                    <span className="ef-line ef-line--2">
                        <span className="ef-w ef-w--thin">
                            &amp; the things that
                        </span>
                    </span>
                    <span className="ef-line ef-line--3">
                        <span className="ef-w">run on them.</span>
                    </span>
                </h2>
                <div className="ef-work-head-foot">
                    <p className="ef-work-note">
                        A partial record — scroll to walk through it.
                    </p>
                    <span className="ef-mono ef-work-count">
                        {pad2(n)} entries
                    </span>
                </div>
            </div>

            <div
                className="ef-work-corridor-wrap"
                ref={wrapRef}
                style={{ height: `${screens * 100}vh` }}
            >
                <div className="ef-work-stage">
                    <AmbientField mouse={mouse} />
                    <div
                        className="ef-work-bigword"
                        aria-hidden
                        style={{
                            transform: `translate3d(${(mouse.x - 0.5) * -10}px, ${(stageRel - 0.5) * 120}px, 0)`,
                            opacity: bigwordOpacity,
                        }}
                    >
                        work.
                    </div>
                    <div className="ef-work-corridor-layer">
                        {showCorridor ? (
                            <Suspense
                                fallback={
                                    <WorkCorridorFallback
                                        items={items}
                                        activeIndex={activeIndex}
                                        onSelect={goTo}
                                    />
                                }
                            >
                                <WorkCorridor3D
                                    items={items}
                                    activeFloat={activeFloat}
                                    finale={finale}
                                    isMobile={isMobile}
                                    onSelect={goTo}
                                />
                            </Suspense>
                        ) : (
                            <WorkCorridorFallback
                                items={items}
                                activeIndex={activeIndex}
                                onSelect={goTo}
                            />
                        )}
                    </div>
                    {showCorridor && (
                        <WorkFinale finale={finale} items={items} />
                    )}
                </div>
            </div>

            {/* The handover. The stage releases on a still frame that has
                just said "this is as far as it goes"; the archive strip is
                the answer to it, so it arrives on its own beat rather than
                being dragged up from under the sticky stage. */}
            <div
                className={`ef-work-strip ${stripShown ? "is-in" : ""}`}
                ref={stripRef}
            >
                <span className="ef-label">Archive</span>
                <a
                    className="ef-work-strip-link"
                    href="https://github.com/manuto276"
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="link"
                >
                    <span>more projects on github.com/manuto276</span>
                    <span className="ef-work-strip-arrow" aria-hidden>
                        <IconArrowUpRight size={20} stroke={1.6} />
                    </span>
                </a>
                <span className="ef-mono">EST. 2021 — ∞</span>
            </div>
        </section>
    );
}
