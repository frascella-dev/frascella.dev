import { useEffect, useMemo, useRef, useState } from "react";
import LabStage from "../../LabStage.tsx";
import { timeline } from "../../../data/timeline.ts";
import "./pulse.css";

// A seismograph / EKG reading of the About timeline: a life has a pulse, and
// the big moments are spikes. A single ink trace runs left -> right across
// ruled graph paper. Between real events it is a calm resting rhythm (a
// small, steady heartbeat blip, same shape as any quiet stretch); at every
// real timeline entry the trace erupts into a P-QRS-T-shaped waveform burst,
// its height an honest (invented, lab-only) read of how much that event
// actually moved the needle — job changes read taller than a childhood PC.
// A "now" playhead sweeps left -> right as you scroll or drag, and the trace
// is only ever drawn up to it: the future stays blank paper. The reached
// spike lights up in ACCENT; the origin ("Born" — the only fixed point on
// the strip) always reads in ACCENT_2. Hover a spike for the real entry plus
// an invented amplitude/frequency/magnitude reading.

const PAPER = "#EEEAE0";
const INK = "#111110";
const ACCENT = "#FF6B1A"; // now / active spike / playhead
const ACCENT_2 = "#C7F651"; // origin — the only fixed point

const FOCUS_WINDOW = 0.07; // fraction-distance over which a spike "lights up"
const BASE_W = 0.0062; // narrowest possible burst half-width, in x-fraction
const AMP_W = 0.0046; // extra burst width added by amplitude

// Honest (lab-only) read of how much each kind of entry moves the needle —
// quiet life passages register small, job changes register big, "now" is
// live and reads tallest.
const AMPLITUDE_BY_KIND = {
    life: 0.5,
    study: 0.56,
    code: 0.62,
    travel: 0.5,
    work: 0.82,
    now: 1,
};

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}
function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
function reducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
}
function gauss(x, mu, sigma) {
    const d = (x - mu) / sigma;
    return Math.exp(-0.5 * d * d);
}

// ------------------------------------------------------------------
// Geometry — six real entries become six spikes. Index 0 ("Born") is the
// origin: the only immovable coordinate, always lit ACCENT_2, and always
// read as a real spike regardless of its "life" kind.
// ------------------------------------------------------------------
const nodes = timeline.map((entry, i) => {
    const base = AMPLITUDE_BY_KIND[entry.kind] ?? 0.5;
    const amplitude = i === 0 ? Math.max(base, 0.74) : base;
    return {
        ...entry,
        amplitude,
        width: BASE_W + amplitude * AMP_W,
        isOrigin: i === 0,
        isNow: entry.kind === "now",
    };
});

// A steady, evenly spaced resting-heart-rate blip — the "calm baseline"
// between real events. Purely a function of x (not time), so it holds still
// under prefers-reduced-motion without needing a separate code path.
const REST_PERIOD = 0.028;
function baselineAt(x) {
    const local = ((x % REST_PERIOD) + REST_PERIOD) % REST_PERIOD;
    const centered = local - REST_PERIOD / 2;
    return 0.05 * gauss(centered, 0, REST_PERIOD * 0.09);
}

// One event's waveform burst — a stylised P-QRS-T complex: a small lead-in
// bump, a sharp main spike, an undershoot, and a settling wave after.
function burstAt(x, node) {
    const f = node.fraction;
    const w = node.width;
    const A = node.amplitude;
    const p = 0.16 * A * gauss(x, f - w * 1.9, w * 0.95);
    const q = -0.14 * A * gauss(x, f - w * 0.65, w * 0.4);
    const r = A * gauss(x, f, w * 0.45);
    const s = -0.36 * A * gauss(x, f + w * 0.7, w * 0.42);
    const t = 0.24 * A * gauss(x, f + w * 1.85, w * 1.05);
    return p + q + r + s + t;
}

function traceValue(x) {
    let v = baselineAt(x);
    for (const node of nodes) v += burstAt(x, node);
    return v;
}

function yearLabelAtProgress(p) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (p <= first.fraction) return `${first.year} —`;
    if (p >= last.fraction) return `${last.year} →`;
    for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];
        if (p >= a.fraction && p <= b.fraction) {
            const local = (p - a.fraction) / (b.fraction - a.fraction);
            return String(Math.round(a.year + (b.year - a.year) * local));
        }
    }
    return String(last.year);
}

// ------------------------------------------------------------------
// Hover card content — the real entry, plus lab-only invented readings.
// Clearly a costume worn by the real data, same register as the other
// timeline experiments' flavour fields.
// ------------------------------------------------------------------
const NOTES = [
    "first light — baseline zero, the only fixed point on the strip.",
    "harmless noise — a curious hand near a live circuit.",
    "steady sinus rhythm — the compliance years, nothing arrhythmic.",
    "first real spike — the needle finally has something to record.",
    "amplitude climbs — same instrument, higher stakes.",
    "reading live — the pen is still on the paper.",
];

function readingFor(node, index) {
    const mv = (0.5 + node.amplitude * 2.2).toFixed(1);
    const hz = (0.6 + node.amplitude * 1.3 + index * 0.06).toFixed(2);
    const mag = (2.2 + node.amplitude * 4.3).toFixed(1);
    return {
        amplitude: `${mv} mV`,
        frequency: `${hz} Hz`,
        magnitude: `M ${mag}`,
        note: NOTES[index] ?? "—",
    };
}

function HoverCardBody({ index }) {
    const node = nodes[index];
    if (!node) return null;
    const info = readingFor(node, index);
    return (
        <>
            <span className="ef-mono pl-hover-meta">
                <span>{node.year}</span>
                <span className="pl-hover-kind">{node.kind}</span>
            </span>
            <h5 className="pl-hover-title">{node.title}</h5>
            <p className="pl-hover-body">{node.body}</p>
            <dl className="pl-hover-stats">
                <div>
                    <dt>amplitude</dt>
                    <dd>{info.amplitude}</dd>
                </div>
                <div>
                    <dt>frequency</dt>
                    <dd>{info.frequency}</dd>
                </div>
                <div>
                    <dt>magnitude</dt>
                    <dd>{info.magnitude}</dd>
                </div>
            </dl>
            <p className="pl-hover-note">{info.note}</p>
        </>
    );
}

export default function TimelinePulse() {
    const wrapRef = useRef(null);
    const stageRef = useRef(null);
    const canvasRef = useRef(null);
    const labelRefsRef = useRef([]);
    const playheadRef = useRef(null);
    const hudYearRef = useRef(null);
    const hoverCardRef = useRef(null);

    const [size, setSize] = useState({ w: 0, h: 0 });
    const [activeIndex, setActiveIndex] = useState(0);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [dragging, setDragging] = useState(false);

    const progressRef = useRef(0);
    const targetRef = useRef(0);
    const activeIndexRef = useRef(0);

    // ---- observe the interactive stage's pixel size ----
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const ro = new ResizeObserver((es) => {
            const r = es[0].contentRect;
            setSize({ w: r.width, h: r.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // ---- size the canvas for the current pixel ratio ----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || size.w === 0 || size.h === 0) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(size.w * dpr);
        canvas.height = Math.round(size.h * dpr);
        canvas.style.width = `${size.w}px`;
        canvas.style.height = `${size.h}px`;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [size]);

    // ---- wheel: attached manually (non-passive) so preventDefault works ----
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY + e.deltaX;
            targetRef.current = clamp(targetRef.current + delta * 0.00055, 0, 1);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    // ---- draw + animation loop ----
    useEffect(() => {
        if (size.w === 0 || size.h === 0) return;
        let raf;
        let last = performance.now();
        const rm = reducedMotion();

        function redraw(progress) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, size.w, size.h);

            const midY = size.h * 0.54;
            const ampScale = size.h * 0.36;
            const revealFrac = rm ? 1 : progress;
            const revealX = revealFrac * size.w;
            const step = Math.max(1.5, size.w / 900);

            // isoelectric baseline — the paper's zero reference line
            ctx.save();
            ctx.strokeStyle = INK;
            ctx.globalAlpha = 0.16;
            ctx.setLineDash([1, 5]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(size.w, midY);
            ctx.stroke();
            ctx.restore();

            // base trace, ink, up to the playhead
            ctx.save();
            ctx.strokeStyle = INK;
            ctx.globalAlpha = 0.88;
            ctx.lineWidth = 1.3;
            ctx.lineJoin = "round";
            ctx.beginPath();
            let started = false;
            for (let px = 0; px <= revealX; px += step) {
                const x = px / size.w;
                const y = midY - traceValue(x) * ampScale;
                if (!started) {
                    ctx.moveTo(px, y);
                    started = true;
                } else {
                    ctx.lineTo(px, y);
                }
            }
            if (started) {
                const xEnd = revealX / size.w;
                ctx.lineTo(revealX, midY - traceValue(xEnd) * ampScale);
            }
            ctx.stroke();
            ctx.restore();

            // per-node highlight overlay: origin permanently ACCENT_2, the
            // currently-reached spike eases toward ACCENT as the playhead
            // nears/passes it.
            nodes.forEach((node) => {
                const dist = Math.abs(progress - node.fraction);
                const amt = clamp(1 - dist / FOCUS_WINDOW, 0, 1);
                const eased = amt * amt * (3 - 2 * amt);
                const opacity = node.isOrigin ? 1 : eased;
                if (opacity <= 0.02) return;

                const lo = Math.max(0, node.fraction - node.width * 4.4);
                const hi = Math.min(1, node.fraction + node.width * 4.4);
                const loPx = lo * size.w;
                const hiPx = Math.min(hi * size.w, revealX);
                if (hiPx <= loPx) return;

                ctx.save();
                ctx.strokeStyle = node.isOrigin ? ACCENT_2 : ACCENT;
                ctx.globalAlpha = opacity * 0.95;
                ctx.lineWidth = 1.7;
                ctx.lineJoin = "round";
                ctx.beginPath();
                let s2 = false;
                for (let px = loPx; px <= hiPx; px += step) {
                    const x = px / size.w;
                    const y = midY - traceValue(x) * ampScale;
                    if (!s2) {
                        ctx.moveTo(px, y);
                        s2 = true;
                    } else {
                        ctx.lineTo(px, y);
                    }
                }
                ctx.stroke();
                ctx.restore();
            });
        }

        function updateOverlays(progress) {
            const revealFrac = rm ? 1 : progress;

            if (playheadRef.current) {
                playheadRef.current.style.left = `${progress * 100}%`;
            }
            if (hudYearRef.current) {
                hudYearRef.current.textContent = yearLabelAtProgress(progress);
            }

            let bestIdx = 0;
            let bestDist = Infinity;
            nodes.forEach((node, i) => {
                const d = Math.abs(progress - node.fraction);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
                const amt = clamp(1 - d / FOCUS_WINDOW, 0, 1);
                const eased = amt * amt * (3 - 2 * amt);
                const revealed = node.fraction <= revealFrac + 0.01;
                const label = labelRefsRef.current[i];
                if (label) {
                    label.style.opacity = revealed ? String(0.55 + eased * 0.45) : "0";
                    label.style.color = node.isOrigin
                        ? ACCENT_2
                        : eased > 0.5
                          ? ACCENT
                          : "var(--ink-mute)";
                    label.style.transform = `translate(-50%, ${eased > 0.5 ? -4 : 0}px) scale(${0.9 + eased * 0.14})`;
                }
            });

            if (bestIdx !== activeIndexRef.current) {
                activeIndexRef.current = bestIdx;
                setActiveIndex(bestIdx);
            }
        }

        function tick(now) {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            progressRef.current = rm
                ? targetRef.current
                : damp(progressRef.current, targetRef.current, 7.5, dt);

            const progress = progressRef.current;
            redraw(progress);
            updateOverlays(progress);

            raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [size]);

    // ---- cursor-following hover tooltip — clamped so it never overflows the
    // stage, since spikes near the right edge (e.g. "now") are exactly where
    // people will hover. ----
    useEffect(() => {
        const onMove = (e) => {
            const wrap = wrapRef.current;
            const card = hoverCardRef.current;
            if (!wrap || !card) return;
            const r = wrap.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const cardRect = card.getBoundingClientRect();
            const maxX = Math.max(12, r.width - cardRect.width - 12);
            const maxY = Math.max(12, r.height - cardRect.height - 12);
            const tx = Math.min(x + 20, maxX);
            const ty = Math.min(y + 20, maxY);
            card.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
    }, []);

    function targetFromClientX(clientX) {
        const el = stageRef.current;
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return clamp((clientX - r.left) / r.width, 0, 1);
    }

    function handlePointerDown(e) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        targetRef.current = targetFromClientX(e.clientX);
    }
    function handlePointerMove(e) {
        if (dragging) targetRef.current = targetFromClientX(e.clientX);
    }
    function handlePointerUp(e) {
        setDragging(false);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore — pointer may already be released
        }
    }

    const nodePositions = useMemo(() => {
        if (!size.h) return nodes.map(() => ({ leftPct: 0, topPx: 0 }));
        const midY = size.h * 0.54;
        const ampScale = size.h * 0.36;
        return nodes.map((node) => ({
            leftPct: node.fraction * 100,
            topPx: midY - node.amplitude * ampScale - 22,
        }));
    }, [size.h]);

    const active = nodes[activeIndex];

    return (
        <LabStage
            idx="09"
            title="timeline — pulse"
            tag="about"
            hint="scroll or drag the trace · hover / click a spike"
        >
            <div className="pl-wrap" ref={wrapRef}>
                <div className="pl-grid" aria-hidden />

                <div
                    className="pl-stage"
                    ref={stageRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    data-cursor="drag"
                >
                    <canvas ref={canvasRef} className="pl-canvas" />

                    <div className="pl-playhead" ref={playheadRef} aria-hidden>
                        <span className="pl-playhead-dot" />
                    </div>

                    {nodes.map((node, i) => (
                        <div key={node.id}>
                            <button
                                type="button"
                                className="pl-node-hit"
                                style={{ left: `${nodePositions[i].leftPct}%` }}
                                data-cursor="link"
                                onPointerEnter={() => setHoverIndex(i)}
                                onPointerLeave={() =>
                                    setHoverIndex((cur) => (cur === i ? null : cur))
                                }
                                onClick={() => {
                                    targetRef.current = node.fraction;
                                }}
                                aria-label={`${node.year} — ${node.title}`}
                            />
                            <span
                                ref={(el) => (labelRefsRef.current[i] = el)}
                                className="ef-mono pl-node-label"
                                style={{
                                    left: `${nodePositions[i].leftPct}%`,
                                    top: `${nodePositions[i].topPx}px`,
                                }}
                                aria-hidden
                            >
                                {node.year}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="pl-hud">
                    <div className="pl-hud-row">
                        <span className="ef-label">now —</span>
                        <span className="ef-mono pl-hud-year" ref={hudYearRef}>
                            {yearLabelAtProgress(0)}
                        </span>
                    </div>
                    <p className="ef-label pl-hud-caption">
                        a life, on the strip — the trace draws itself as you scroll
                    </p>
                    <div className="pl-legend">
                        <span className="pl-legend-dot pl-legend-dot--origin" aria-hidden />
                        <span className="ef-label">origin</span>
                        <span className="pl-legend-dot pl-legend-dot--now" aria-hidden />
                        <span className="ef-label">playhead</span>
                    </div>
                </div>

                <div className="pl-card" key={activeIndex}>
                    <span className="ef-mono pl-card-meta">
                        <span>{active.year}</span>
                        <span className="pl-card-kind">{active.kind}</span>
                    </span>
                    <h4 className="pl-card-title">{active.title}</h4>
                    <p className="pl-card-body">{active.body}</p>
                </div>

                {hoverIndex != null && (
                    <div className="pl-hover-card" ref={hoverCardRef}>
                        <HoverCardBody index={hoverIndex} />
                    </div>
                )}
            </div>
        </LabStage>
    );
}
