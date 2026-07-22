import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useReveal } from "./Hooks.tsx";

// three.js is heavy, so the "big bang" timeline scene is a separate chunk
// fetched only once the section is near the viewport — same lazy pattern
// Work.tsx uses for WorkCorridor3D and Contact.tsx uses for SocialBlocks3D.
// Until then (and always under reduced motion) the plain-text manifest below
// stands in, so the section is never an empty pinned box.
const AboutBigBang3D = lazy(() => import("./AboutBigBang3D.tsx"));

// Screens of scroll the pinned stage holds *before* the vortex starts moving
// and *after* it stops, expressed in viewport heights — same constants,
// same reasoning, as Work.tsx's corridor (read that file rather than just
// this comment). Without them the stage pins and starts moving in the same
// instant, so 2000 — the state the user is meant to actually sit with — is
// already sliding away before it's been read, and 2026 is gone the moment
// it arrives. The wrapper grows by exactly this much extra (see its height
// below), so the dwell comes out of added page height, not out of the
// travel between entries.
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

/** The accessible, no-3D read of the same timeline: a plain, crawlable list.
 *  Shown under reduced motion, before the AboutBigBang3D chunk has loaded,
 *  and every field here is the real src/data/timeline.ts entry — nothing
 *  invented for the scene. */
function BigBangFallback({
    items,
    activeIndex,
    onSelect,
}: {
    items: any[];
    activeIndex: number;
    onSelect: (i: number) => void;
}) {
    return (
        <div className="ef-bb-fallback">
            <ol className="ef-bb-fallback-list">
                {items.map((it, i) => (
                    <li
                        key={it.id}
                        className={`ef-bb-fallback-item ${
                            i === activeIndex ? "is-active" : ""
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => onSelect(i)}
                            data-cursor="view"
                        >
                            <span className="ef-mono ef-bb-fallback-year">
                                {it.year}
                            </span>
                            <span className="ef-bb-fallback-body">
                                <span className="ef-bb-fallback-title">
                                    {it.title}
                                </span>
                                <span className="ef-bb-fallback-tag">
                                    {it.body}
                                </span>
                            </span>
                            <span className="ef-mono ef-bb-fallback-kind">
                                {it.kind}
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
}

/** The stage's own ambient backdrop — a faint grid and a couple of hairline
 *  marks, painted on the sticky stage's paper base, *underneath* the
 *  transparent WebGL canvas (see AboutBigBang3D: no `<color attach=
 *  "background">`, `gl={{ alpha: true }}`), so it shows through the 3D scene
 *  instead of being redrawn inside it. Same arrangement Work.tsx uses for its
 *  corridor (a local, non-shared ambient component per section — each is
 *  free to draw its own motif). Decorative and `aria-hidden` throughout. */
function BigBangField({ mouse }: { mouse: { x: number; y: number } }) {
    return (
        <div className="ef-bb-field" aria-hidden>
            <div className="ef-about-grid-bg" />
            <div
                className="ef-bb-field-rect ef-bb-field-rect--1"
                style={{
                    transform: `translate3d(${(mouse.x - 0.5) * -12}px, ${(mouse.y - 0.5) * -8}px, 0)`,
                }}
            />
            <div
                className="ef-bb-field-rect ef-bb-field-rect--2"
                style={{
                    transform: `translate3d(${(mouse.x - 0.5) * 8}px, ${(mouse.y - 0.5) * 6}px, 0)`,
                }}
            />
            <div className="ef-bb-field-rule-v" />
            <div className="ef-bb-field-rule-h" />
        </div>
    );
}

/** The pinned "big bang" showcase: a tall wrapper (one screen of scroll per
 *  entry) holding a position: sticky stage — the exact mechanism Work.tsx's
 *  corridor uses (see work-corridor.css's header comment). Scroll position
 *  becomes a continuous `activeFloat`, read off the wrapper's
 *  getBoundingClientRect(); there is no wheel-jacking or scroll interception,
 *  so Lenis / keyboard / anchor jumps all keep working untouched. */
function AboutBigBang({ items }: { items: any[] }) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [activeFloat, setActiveFloat] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const isMobile = useIsMobile();
    const reducedMotion = usePrefersReducedMotion();
    const nearViewport = useNearViewport(wrapRef);
    const n = items.length;

    useEffect(() => {
        const onScroll = () => {
            const el = wrapRef.current;
            if (!el) return;
            const vh = window.innerHeight || 1;
            const r = el.getBoundingClientRect();
            const scrolled = -r.top;
            // LEAD shifts the mapping so the vortex holds still for a beat
            // at each end — see the LEAD/TAIL comment above and Work.tsx's
            // identical corridor mapping.
            const p = (scrolled - LEAD * vh) / vh;
            setActiveFloat(Math.max(0, Math.min(n - 1, p)));
        };
        const onMove = (e: MouseEvent) => {
            const el = wrapRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setMouse({
                x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
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

    const activeIndex = Math.max(0, Math.min(n - 1, Math.round(activeFloat)));

    // Node clicks (and fallback-list clicks) don't hijack the scroll — they
    // just scroll the page to the exact position where the scene rests
    // centred on that entry, same as any anchor jump, so Lenis / keyboard /
    // back-button all keep working. Identical to Work.tsx's goTo.
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

    const showScene = nearViewport && !reducedMotion;
    const first = items[0]?.year;
    const last = items[items.length - 1]?.year;

    return (
        <div className="ef-bb-section">
            <div className="ef-bb-head">
                {/* 03.1, not 04: the timeline is a subsection of About
                    (§ 03), not a section of its own — § 04 is the colophon in
                    Contact.tsx. The decimal keeps the § pointing at a real
                    number, which is the only thing the sign is for. */}
                <span className="ef-label">§ 03.1 — Timeline</span>
                <h3 className="ef-h3 ef-bb-title">
                    <span>not all at once —</span>
                    <em>the way I got here.</em>
                </h3>
                <p className="ef-bb-lede">
                    {first} to {last}. Scroll, and it comes to you in order.
                </p>
            </div>

            <div
                className="ef-bb-wrap"
                ref={wrapRef}
                style={{ height: `${(n + LEAD + TAIL) * 100}vh` }}
            >
                <div className="ef-bb-stage">
                    <BigBangField mouse={mouse} />
                    <div className="ef-bb-layer">
                        {showScene ? (
                            <Suspense
                                fallback={
                                    <BigBangFallback
                                        items={items}
                                        activeIndex={activeIndex}
                                        onSelect={goTo}
                                    />
                                }
                            >
                                <AboutBigBang3D
                                    items={items}
                                    activeFloat={activeFloat}
                                    isMobile={isMobile}
                                    onSelect={goTo}
                                />
                            </Suspense>
                        ) : (
                            <BigBangFallback
                                items={items}
                                activeIndex={activeIndex}
                                onSelect={goTo}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function About({ timeline = [] }) {
    const [revealRef, shown] = useReveal();
    const sectionRef = useRef(null);
    const [rel, setRel] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

    const setRefs = (node: HTMLElement | null) => {
        sectionRef.current = node;
        if (revealRef) revealRef.current = node;
    };

    useEffect(() => {
        const onScroll = () => {
            const el = sectionRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = vh + r.height;
            const travelled = vh - r.top;
            setRel(Math.max(0, Math.min(1, travelled / total)));
        };
        const onMove = (e) => {
            setMouse({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("mousemove", onMove);
        onScroll();
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("mousemove", onMove);
        };
    }, []);

    const pxy = (mx, my, sy) => ({
        transform: `translate3d(${(mouse.x - 0.5) * mx}px, ${(mouse.y - 0.5) * my + (rel - 0.5) * sy}px, 0)`,
    });

    return (
        <section
            className={`ef-about ${shown ? "is-in" : ""}`}
            id="about"
            ref={setRefs}
            data-screen-label="03 About"
        >
            <div className="ef-about-field" aria-hidden>
                <div className="ef-about-grid-bg" />

                <div
                    className="ef-rect ef-a-rect--1"
                    style={pxy(-10, 0, -140)}
                />
                <div className="ef-rect ef-a-rect--2" style={pxy(8, 0, -220)} />
                <div className="ef-rect ef-a-rect--3" style={pxy(-6, 0, -80)} />
                <div
                    className="ef-rect ef-a-rect--4"
                    style={pxy(14, 0, -300)}
                />
                <div
                    className="ef-rect ef-a-rect--5"
                    style={pxy(-4, 0, -180)}
                />
                <div
                    className="ef-rect ef-a-rect--acc"
                    style={pxy(-12, 10, -160)}
                />

                <div className="ef-rect ef-a-rule-v" style={pxy(0, 0, -60)} />
                <div className="ef-rect ef-a-rule-h" style={pxy(0, 0, -40)} />

                <svg
                    className="ef-a-cross"
                    viewBox="0 0 40 40"
                    style={pxy(-8, 8, -200)}
                >
                    <line x1="0" y1="20" x2="40" y2="20" />
                    <line x1="20" y1="0" x2="20" y2="40" />
                    <circle cx="20" cy="20" r="4" />
                </svg>

                <div className="ef-a-dot" style={pxy(22, 16, -240)} />
            </div>

            {/* Wraps the head + body content only (not the pinned bigbang
                stage below): .ef-about-bigword is position:absolute and
                needs a *short* containing block to bleed at the bottom of
                this content, not at the bottom of the whole section — which,
                now that the section also holds the ~600vh bigbang wrap,
                would put it far below the fold instead of where it reads. */}
            <div className="ef-about-content">
                <div className="ef-about-head">
                    <span className="ef-label">§ 03 — About</span>
                    <h2 className="ef-about-title">
                        <span className="ef-line ef-line--1">
                            <span className="ef-w">building things</span>
                        </span>
                        <span className="ef-line ef-line--2">
                            <em className="ef-w ef-w--em">that run</em>
                            <span className="ef-w ef-w--thin">quietly,</span>
                        </span>
                        <span className="ef-line ef-line--3">
                            <span className="ef-w ef-w--thin">and reliably.</span>
                        </span>
                    </h2>
                </div>

                <div className="ef-about-body-wrap">
                    <div className="ef-about-lead">
                        <span className="ef-label">idx — 01</span>
                        <p className="ef-about-lead-text">
                            I work across the whole stack, but my centre of
                            gravity is the backend —
                            <em>
                                {" "}
                                the data, the contracts, the logic the rest
                                of it leans on.
                            </em>
                        </p>
                    </div>

                    <div
                        className="ef-about-portrait"
                        style={{
                            transform: `translate3d(${(mouse.x - 0.5) * -6}px, ${(rel - 0.5) * -60}px, 0) rotate(-2.5deg)`,
                        }}
                    >
                        <picture>
                            <source
                                srcSet={"/images/hero-light.avif"}
                                type="image/avif"
                            />
                            <source
                                srcSet={"/images/hero-light.webp"}
                                type="image/webp"
                            />
                            <img
                                src={"/images/hero-light.jpg"}
                                alt="Portrait of Emanuele Frascella"
                                draggable="false"
                            />
                        </picture>
                        <div className="ef-about-portrait-tag">
                            <span>e.f.</span>
                            <span>taranto · 2026</span>
                        </div>
                    </div>

                    <div className="ef-about-cols">
                        <div className="ef-about-col">
                            <span className="ef-label">idx — 02</span>
                            <p>
                                I'll take the frontend when the brief calls
                                for it. I care about work that's well-made —
                                a query that comes back fast, a deploy that
                                surprises no one on Monday.
                            </p>
                        </div>
                        <div className="ef-about-col">
                            <span className="ef-label">idx — 03</span>
                            <p>
                                Side projects keep me honest — the day job
                                gets the best of me, but not all of me.
                            </p>
                        </div>
                    </div>

                    <dl className="ef-about-facts">
                        <div>
                            <dt>name</dt>
                            <dd>Emanuele Frascella</dd>
                        </div>
                        <div>
                            <dt>based</dt>
                            <dd>Taranto, IT</dd>
                        </div>
                        <div>
                            <dt>tz</dt>
                            <dd>CET / CEST</dd>
                        </div>
                        <div>
                            <dt>exp</dt>
                            <dd>5+ years</dd>
                        </div>
                    </dl>
                </div>

                <div
                    className="ef-about-bigword"
                    aria-hidden
                    style={{
                        transform: `translate3d(${(mouse.x - 0.5) * -10}px, ${(rel - 0.5) * 120}px, 0)`,
                    }}
                >
                    about
                </div>
            </div>

            <AboutBigBang items={timeline} />
        </section>
    );
}
