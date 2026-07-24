import { useEffect, useRef, useState } from "react";
import LabStage from "../../LabStage.tsx";
import { timeline } from "../../../data/timeline.ts";
import "./departures.css";

// The About timeline as a Solari split-flap departures board — the old
// airport/train kind, all mechanical clatter and typewriter capitals. Every
// career event becomes a row: YEAR · DESTINATION · STATUS, exactly like a
// board printing the next arrival. Scroll is time: as progress crosses a
// row's place on the timeline, that row's characters tumble through a short
// burst of noise before settling on the real value, cascading left to
// right and staggered row to row. The origin row reads in lime, "now" in
// orange, everything else in the board's resting ink-on-paper.

const YEAR_W = 4;
const DEST_W = 12;
const STATUS_W = 8;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ".split("");
const DIGITS = "0123456789".split("");

// Destinations, invented from the real copy in data/timeline.ts — the place
// or org each entry actually names, read as a board destination.
const DESTINATIONS = [
    "TARANTO", // Born — the port town named in the entry's own body copy
    "HOME LAB", // First PC — where a Pentium 4 got taken apart repeatedly
    "LICEO", // Diploma — liceo scientifico
    "LA TERMICA", // La Termica srl
    "SMED", // SMED srl
    "GIOCAONLINE", // Giocaonline srl
];

function prefersReducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// Same shape as THREE.MathUtils.damp, reimplemented so this experiment has
// no dependency on three.js at all.
function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function randomChar(charset) {
    return charset[Math.floor(Math.random() * charset.length)];
}

function pad(str, width) {
    return (str + " ".repeat(width)).slice(0, width);
}

const rows = timeline.map((entry, i) => ({
    ...entry,
    destination: DESTINATIONS[i] ?? entry.title.toUpperCase(),
    status: entry.kind === "now" ? "BOARDING" : "DEPARTED",
    role: i === 0 ? "origin" : entry.kind === "now" ? "now" : "ink",
}));

/* ============================================================
   FlapChar — one mechanical character cell. Holds its settled value in
   state; the first time `active` goes true it runs a short burst of random
   characters (the "clatter"), each step re-triggering the CSS flip via a
   fresh key, before landing on `target` and staying there. Untouched by
   later prop changes — a row that's already printed doesn't reprint.
   ============================================================ */
function FlapChar({ target, charset, active, stagger, reduced, colorVar }) {
    const [current, setCurrent] = useState(" ");
    const [prevChar, setPrevChar] = useState(" ");
    const [flipToken, setFlipToken] = useState(0);
    const [flipping, setFlipping] = useState(false);
    const startedRef = useRef(false);
    const timeoutsRef = useRef([]);

    useEffect(() => {
        return () => timeoutsRef.current.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        if (!active || startedRef.current) return;
        startedRef.current = true;

        if (reduced) {
            setCurrent(target);
            return;
        }

        const steps = 3 + Math.floor(Math.random() * 3); // 3–5 tumbles
        const seq = Array.from({ length: steps }, () => randomChar(charset));
        seq.push(target);
        const stepDur = 85;

        setFlipping(true);
        seq.forEach((ch, i) => {
            const t = setTimeout(() => {
                setCurrent((old) => {
                    setPrevChar(old);
                    return ch;
                });
                setFlipToken((k) => k + 1);
            }, stagger + i * stepDur);
            timeoutsRef.current.push(t);
        });
        const totalEnd = stagger + seq.length * stepDur + 260;
        timeoutsRef.current.push(setTimeout(() => setFlipping(false), totalEnd));
    }, [active]);

    const style = { "--dep-color": `var(${colorVar})` };

    return (
        <div className="dep-flap" style={style}>
            <div className="dep-half-clip dep-half-clip--top">
                <span className="dep-glyph">{current}</span>
            </div>
            <div className="dep-half-clip dep-half-clip--bottom">
                <span className="dep-glyph">{current}</span>
            </div>
            {flipping && !reduced && (
                <>
                    <div
                        key={`t-${flipToken}`}
                        className="dep-leaf dep-leaf--top dep-half-clip dep-half-clip--top"
                    >
                        <span className="dep-glyph">{prevChar}</span>
                    </div>
                    <div
                        key={`b-${flipToken}`}
                        className="dep-leaf dep-leaf--bottom dep-half-clip dep-half-clip--bottom"
                    >
                        <span className="dep-glyph">{current}</span>
                    </div>
                </>
            )}
        </div>
    );
}

function FlapGroup({ text, width, charset, revealed, baseStagger, reduced, colorVar, colClass }) {
    const chars = pad(text, width).split("");
    return (
        <span className={`dep-row-flags ${colClass}`}>
            {chars.map((ch, i) => (
                <FlapChar
                    key={i}
                    target={ch}
                    charset={charset}
                    active={revealed}
                    stagger={baseStagger + i * 40}
                    reduced={reduced}
                    colorVar={colorVar}
                />
            ))}
        </span>
    );
}

function DepRow({ row, revealed, isActive, reduced, onSelect }) {
    const colorVar =
        row.role === "origin" ? "--dep-origin" : row.role === "now" ? "--dep-now" : "--dep-ink";
    return (
        <button
            type="button"
            className={`dep-row dep-row--${row.role} ${isActive ? "is-active" : ""}`}
            onClick={() => onSelect(row.fraction)}
            data-cursor="link"
            aria-label={`${row.year} — ${row.destination.trim()} — ${row.status}`}
        >
            <FlapGroup
                text={String(row.year)}
                width={YEAR_W}
                charset={DIGITS}
                revealed={revealed}
                baseStagger={0}
                reduced={reduced}
                colorVar={colorVar}
                colClass="dep-col-year"
            />
            <span className="dep-row-sep" aria-hidden />
            <FlapGroup
                text={row.destination}
                width={DEST_W}
                charset={LETTERS}
                revealed={revealed}
                baseStagger={YEAR_W * 40}
                reduced={reduced}
                colorVar={colorVar}
                colClass="dep-col-dest"
            />
            <span className="dep-row-sep" aria-hidden />
            <FlapGroup
                text={row.status}
                width={STATUS_W}
                charset={LETTERS}
                revealed={revealed}
                baseStagger={(YEAR_W + DEST_W) * 40}
                reduced={reduced}
                colorVar={colorVar}
                colClass="dep-col-status"
            />
            {row.role === "now" && (
                <span className="dep-live-dot" aria-hidden style={{ opacity: revealed ? 1 : 0 }} />
            )}
        </button>
    );
}

function DeparturesBoard() {
    const reduced = useRef(prefersReducedMotion()).current;
    const wrapRef = useRef(null);
    const railRef = useRef(null);
    const hudPosRef = useRef(null);
    const hudCountRef = useRef(null);

    const progressRef = useRef(reduced ? 1 : 0);
    const progressTargetRef = useRef(reduced ? 1 : 0);
    const revealedMaxRef = useRef(reduced ? rows.length : 0);
    const activeRef = useRef(reduced ? rows.length - 1 : 0);

    const [revealedCount, setRevealedCount] = useState(revealedMaxRef.current);
    const [activeIndex, setActiveIndex] = useState(activeRef.current);

    useEffect(() => {
        let raf;
        let last = performance.now();
        const tick = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            progressRef.current = reduced
                ? 1
                : damp(progressRef.current, progressTargetRef.current, 3.4, dt);
            const p = progressRef.current;

            if (railRef.current) railRef.current.style.width = `${Math.round(p * 100)}%`;

            let raw = 0;
            for (const r of rows) if (p >= r.fraction - 0.004) raw++;
            if (raw > revealedMaxRef.current) {
                revealedMaxRef.current = raw;
                setRevealedCount(raw);
            }

            let ai = 0;
            for (let i = 0; i < rows.length; i++) if (p >= rows[i].fraction) ai = i;
            if (ai !== activeRef.current) {
                activeRef.current = ai;
                setActiveIndex(ai);
            }

            if (hudPosRef.current) {
                hudPosRef.current.textContent = `${revealedMaxRef.current} / ${rows.length}`;
            }
            if (hudCountRef.current) {
                hudCountRef.current.textContent = `${Math.round(p * 100)}%`;
            }

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [reduced]);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            progressTargetRef.current = clamp(
                progressTargetRef.current + e.deltaY * 0.00045,
                0,
                1,
            );
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        let lastY = null;
        const onStart = (e) => {
            lastY = e.touches[0].clientY;
        };
        const onMove = (e) => {
            if (lastY == null) return;
            const y = e.touches[0].clientY;
            const dy = lastY - y;
            lastY = y;
            progressTargetRef.current = clamp(progressTargetRef.current + dy * 0.0022, 0, 1);
            e.preventDefault();
        };
        const onEnd = () => {
            lastY = null;
        };
        el.addEventListener("touchstart", onStart, { passive: true });
        el.addEventListener("touchmove", onMove, { passive: false });
        el.addEventListener("touchend", onEnd, { passive: true });
        return () => {
            el.removeEventListener("touchstart", onStart);
            el.removeEventListener("touchmove", onMove);
            el.removeEventListener("touchend", onEnd);
        };
    }, []);

    const active = rows[activeIndex];
    const cardAccent =
        active.role === "origin" ? "--dep-origin" : active.role === "now" ? "--dep-now" : "--dep-ink";

    return (
        <div className="dep-wrap" ref={wrapRef}>
            <div className="dep-hud">
                <div className="dep-hud-row">
                    <span className="ef-label">printed</span>
                    <span className="ef-mono dep-hud-count" ref={hudPosRef}>
                        {revealedCount} / {rows.length}
                    </span>
                </div>
                <p className="ef-label dep-hud-caption">scroll to print the next departure</p>
                <div className="dep-hud-row">
                    <span className="ef-label">position</span>
                    <span className="ef-mono dep-hud-pct" ref={hudCountRef}>
                        {Math.round(progressRef.current * 100)}%
                    </span>
                </div>
                <div className="dep-legend">
                    <span className="dep-legend-dot dep-legend-dot--origin" aria-hidden />
                    <span className="ef-label">origin</span>
                    <span className="dep-legend-dot dep-legend-dot--now" aria-hidden />
                    <span className="ef-label">now</span>
                </div>
            </div>

            <div className="dep-board">
                <div className="dep-board-rail-track" aria-hidden>
                    <div className="dep-board-rail" ref={railRef} />
                </div>
                <div className="dep-board-head">
                    <span className="ef-label dep-col-year">year</span>
                    <span className="dep-row-sep" aria-hidden />
                    <span className="ef-label dep-col-dest">destination</span>
                    <span className="dep-row-sep" aria-hidden />
                    <span className="ef-label dep-col-status">status</span>
                </div>
                <div className="dep-board-rows">
                    {rows.map((row, i) => (
                        <DepRow
                            key={row.id}
                            row={row}
                            revealed={i < revealedCount}
                            isActive={i === activeIndex}
                            reduced={reduced}
                            onSelect={(fraction) => {
                                progressTargetRef.current = fraction;
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="dep-card" key={activeIndex} style={{ "--dep-card-accent": `var(${cardAccent})` }}>
                <span className="ef-mono dep-card-meta">
                    <span>{active.year}</span>
                    <span className="dep-card-kind">{active.kind}</span>
                </span>
                <h4 className="dep-card-title">{active.title}</h4>
                <p className="dep-card-body">{active.body}</p>
            </div>
        </div>
    );
}

export default function TimelineDepartures() {
    return (
        <LabStage
            idx="10"
            title="timeline — departures"
            tag="about"
            hint="scroll to advance the board · click a row"
        >
            <div className="dep-stage-inner">
                <DeparturesBoard />
            </div>
        </LabStage>
    );
}
