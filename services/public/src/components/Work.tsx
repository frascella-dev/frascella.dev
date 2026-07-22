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

// Screens of scroll the pinned stage holds *before* the corridor starts
// moving and *after* it stops, expressed in viewport heights. They buy the
// first and last project a moment on screen instead of one flashing past on
// arrival and the other on departure. The wrapper is grown by exactly the
// same amount (see the corridor wrapper's height), so the extra dwell comes
// out of added page height, not out of the travel between projects.
const LEAD = 0.75;
const TAIL = 0.75;

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
    const sectionRef = useRef<HTMLElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const [activeFloat, setActiveFloat] = useState(0);
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
                style={{ height: `${(n + LEAD + TAIL) * 100}vh` }}
            >
                <div className="ef-work-stage">
                    <AmbientField mouse={mouse} />
                    <div
                        className="ef-work-bigword"
                        aria-hidden
                        style={{
                            transform: `translate3d(${(mouse.x - 0.5) * -10}px, ${(stageRel - 0.5) * 120}px, 0)`,
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
                </div>
            </div>

            <div className="ef-work-strip">
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
