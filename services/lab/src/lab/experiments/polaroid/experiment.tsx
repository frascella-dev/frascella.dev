import { useEffect, useRef, useState } from "react";
import LabStage from "../../LabStage.tsx";
import "./polaroid.css";

// The About-section portrait, reprinted as a polaroid, in two readings:
//
//  01 · PURE — a single print at rest on the stage. Move the pointer around
//     and it rotates/tilts slightly toward you (CSS 3D, no three.js needed —
//     a real DOM <img> renders crisper than a canvas texture ever would),
//     lifting a touch with a deeper shadow, then eases back to its resting
//     tilt when you leave.
//
//  02 · BOOK — a small 3D photo album: a stack of pages (ink-outlined
//     leaves receding in Z) bound at a spine, open to the page holding this
//     print — taped in, with a few handwritten annotations around it
//     (initials, place, year, a small greeting, a hand-drawn arrow).
//     Journal aesthetic, not a diary entry. The whole book leans gently
//     with the pointer, same restrained CSS-3D language as variant 01.
//
// Same photo both times: /images/hero-light.{avif,webp} — there is no .jpg
// on disk, so the fallback <img src> below points at the webp instead of
// repeating the missing-file mistake in About.tsx.

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);
    return reduced;
}

// A page's outline as a bowed silhouette rather than a flat rectangle: three
// straight edges (top, bottom, spine-side skipped — the spine hairline
// already draws that seam) and one gently curved free edge, traced as a
// polyline over a handful of points. That's what makes it read as a real
// leaf of paper instead of a card with rounded corners.
function PageOutline({ side }) {
    const d =
        side === "left"
            ? "M100 0 L0 0 L1.2 15 L2 30 L2.4 50 L2 70 L1.2 85 L0 100 L100 100"
            : "M0 0 L100 0 L98.8 15 L98 30 L97.6 50 L98 70 L98.8 85 L100 100 L0 100";
    return (
        <svg
            className="pol-page-outline"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
        >
            <path
                d={d}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

function PortraitPhoto() {
    return (
        <picture className="pol-picture">
            <source srcSet="/images/hero-light.avif" type="image/avif" />
            <source srcSet="/images/hero-light.webp" type="image/webp" />
            <img
                src="/images/hero-light.webp"
                alt="Portrait of Emanuele Frascella"
                draggable="false"
            />
        </picture>
    );
}

/* ============================================================
   VARIANT 01 — PURE (single print, tilts toward the cursor)
   ============================================================ */

const REST_TILT = -3; // resting casual rotation, degrees
const MAX_TILT = 9; // "ruota e si inclina POCO" — keep it subtle

function PureVariant() {
    const reduced = usePrefersReducedMotion();
    const stageRef = useRef(null);
    const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
    const [interacting, setInteracting] = useState(false);

    useEffect(() => {
        if (reduced) return;
        const el = stageRef.current;
        if (!el) return;

        const onMove = (e) => {
            const rect = el.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            setTilt({
                rx: clamp(-ny * MAX_TILT, -MAX_TILT, MAX_TILT),
                ry: clamp(nx * MAX_TILT, -MAX_TILT, MAX_TILT),
            });
            setInteracting(true);
        };
        const onLeave = () => {
            setInteracting(false);
            setTilt({ rx: 0, ry: 0 });
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerleave", onLeave);
        };
    }, [reduced]);

    const transform = reduced
        ? `rotate(${REST_TILT}deg)`
        : `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) rotateZ(${REST_TILT}deg) translateY(${interacting ? -8 : 0}px) scale(${interacting ? 1.02 : 1})`;

    const stateClass = reduced
        ? "pol-photo--reduced"
        : interacting
          ? "pol-photo--interacting"
          : "pol-photo--resting";

    return (
        <div className="pol-stage pol-stage--pure" ref={stageRef}>
            <div className={`pol-photo ${stateClass}`} style={{ transform }}>
                <div className="pol-photo-frame">
                    <PortraitPhoto />
                </div>
                <p className="pol-caption">e.f. · taranto · 2026</p>
            </div>
        </div>
    );
}

/* ============================================================
   VARIANT 02 — BOOK (a 3D album: page stack + this open page)
   ============================================================ */

const BOOK_REST_TILT = 8; // resting downward look, degrees (rotateX)
const BOOK_MAX_TILT = 5; // pointer parallax on the whole rig — restrained
const BOOK_LEAF_COUNT = 2;

// Just a couple of pages peeking out behind the open spread — a hint, not a
// pile. Tight, consistent offset, no rotation, no per-leaf size variance:
// the goal is "there are a few more pages here", not a fan of debris.
const BOOK_LEAVES = Array.from({ length: BOOK_LEAF_COUNT }, (_, i) => ({
    depth: 10 + i * 8,
    dx: 5 + i * 5,
    dy: 6 + i * 6,
}));

function BookVariant() {
    const reduced = usePrefersReducedMotion();
    const stageRef = useRef(null);
    const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
    const [interacting, setInteracting] = useState(false);

    useEffect(() => {
        if (reduced) return;
        const el = stageRef.current;
        if (!el) return;

        const onMove = (e) => {
            const rect = el.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            setTilt({
                rx: clamp(-ny * BOOK_MAX_TILT, -BOOK_MAX_TILT, BOOK_MAX_TILT),
                ry: clamp(nx * BOOK_MAX_TILT, -BOOK_MAX_TILT, BOOK_MAX_TILT),
            });
            setInteracting(true);
        };
        const onLeave = () => {
            setInteracting(false);
            setTilt({ rx: 0, ry: 0 });
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerleave", onLeave);
        };
    }, [reduced]);

    const rigTransform = reduced
        ? `rotateX(${BOOK_REST_TILT}deg)`
        : `rotateX(${BOOK_REST_TILT + tilt.rx}deg) rotateY(${tilt.ry}deg)`;

    return (
        <div className="pol-stage pol-stage--book" ref={stageRef}>
            <div className="pol-book-3d">
                <div
                    className={`pol-book-rig ${interacting ? "pol-book-rig--interacting" : "pol-book-rig--resting"}`}
                    style={{ transform: rigTransform }}
                >
                    {/* the hardcover boards, peeking out around the pages —
                        an outline + inset frame, no fill, so it still reads
                        as ink-line rather than a printed cover graphic */}
                    <div className="pol-book-cover" aria-hidden>
                        <span className="ef-label pol-book-cover-label">
                            photo album — e.f.
                        </span>
                        <span className="pol-book-clasp" />
                    </div>

                    {/* just a couple of pages behind the open spread — a
                        faint hint of "there's more album here", never a
                        pile of rotated rectangles */}
                    <div className="pol-book-stack" aria-hidden>
                        {BOOK_LEAVES.map((leaf, i) => (
                            <span
                                key={i}
                                className="pol-book-leaf"
                                style={{
                                    transform: `translateZ(${-leaf.depth}px) translate(${leaf.dx}px, ${leaf.dy}px)`,
                                }}
                            />
                        ))}
                    </div>

                    <div className="pol-book-spread">
                        <div className="pol-page pol-page--left">
                            <PageOutline side="left" />
                            <div className="pol-photo-wrap">
                                <div className="pol-tape" aria-hidden />
                                <div className="pol-photo pol-photo--pinned">
                                    <div className="pol-photo-frame">
                                        <PortraitPhoto />
                                    </div>
                                    <p className="pol-caption">e.f. · taranto · 2026</p>
                                </div>
                            </div>

                            <span className="pol-note pol-note--initials" aria-hidden>
                                e.f.
                            </span>
                            <span className="pol-note pol-note--greet" aria-hidden>
                                ciao
                            </span>
                            <span className="pol-note pol-note--place" aria-hidden>
                                taranto
                            </span>

                            <svg
                                className="pol-arrow"
                                viewBox="0 0 64 40"
                                fill="none"
                                aria-hidden
                            >
                                <path
                                    d="M4 6 C 22 4, 40 18, 54 30"
                                    stroke="var(--accent)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M44 27 L54 30 L50 20"
                                    stroke="var(--accent)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <span className="pol-spine" aria-hidden />

                        <div className="pol-page pol-page--right">
                            <PageOutline side="right" />
                            <span className="ef-label pol-page-num">vol. 01</span>
                            <span className="pol-note pol-note--year" aria-hidden>
                                2026
                            </span>
                            <span className="ef-label pol-page-num pol-page-num--br">
                                pg. 04
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   Root — variant switch
   ============================================================ */

export default function Polaroid() {
    const [variant, setVariant] = useState("pure");

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "1") setVariant("pure");
            if (e.key === "2") setVariant("book");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <LabStage
            idx="—"
            title="polaroid"
            tag="about"
            hint={
                variant === "pure"
                    ? "move the pointer — the print leans toward you"
                    : "move the pointer — a page from the album, open"
            }
        >
            <div className="pol-wrap">
                {variant === "pure" ? <PureVariant /> : <BookVariant />}

                <div className="pol-variant-switch">
                    <button
                        type="button"
                        className={`ef-label pol-variant-btn ${variant === "pure" ? "is-active" : ""}`}
                        onClick={() => setVariant("pure")}
                    >
                        variant — 01 / pure
                    </button>
                    <button
                        type="button"
                        className={`ef-label pol-variant-btn ${variant === "book" ? "is-active" : ""}`}
                        onClick={() => setVariant("book")}
                    >
                        variant — 02 / book
                    </button>
                </div>
            </div>
        </LabStage>
    );
}
