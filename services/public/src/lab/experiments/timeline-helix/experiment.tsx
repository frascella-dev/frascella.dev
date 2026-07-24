import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import LabStage from "../../LabStage.tsx";
import { timeline } from "../../../data/timeline.ts";
import "./helix.css";

// A "double helix" reading of the About timeline: two ink backbone strands
// wind around a common vertical axis, and each real timeline entry becomes a
// rung bridging them — a base pair, stacked by time. Earliest sits at the
// crown (top); "now" sits at the root (bottom) — scrolling down descends the
// column, so scroll direction reads as "going down" through time. Drag orbits
// around whatever height you're at. A slow idle rotation keeps the column
// alive at rest (disabled under prefers-reduced-motion). This is deliberately
// a vertical travel through a standing 3D structure — the opposite move from
// the vortex/funnel's flat spiral zoom.
//
// Hover a rung for a detail card (year/title/body plus a few invented
// lab-only "sequence" fields); click a rung to travel straight to it.

const PAPER = "#EEEAE0";
const INK = "#111110";
const ACCENT = "#FF6B1A"; // now
const ACCENT_2 = "#C7F651"; // origin
const FOCUS_WINDOW = 0.09;

const HX_LEN = 12; // total column height, crown (y=HX_LEN, t=0) to root (y=0, t=1)
const HX_R = 1.65; // helix radius
const HX_TURNS = 4.25; // full turns over the whole column

function angleAtT(t, phase = 0) {
    return t * HX_TURNS * Math.PI * 2 + phase;
}
// t is time-progress (0 = origin, 1 = now). Height is inverted so origin sits
// at the crown (top) and now sits at the root (bottom) — scrolling down (t
// increasing) descends the column.
function heightAtT(t) {
    return (1 - t) * HX_LEN;
}
function strandPoint(t, phase) {
    const a = angleAtT(t, phase);
    return new THREE.Vector3(Math.cos(a) * HX_R, heightAtT(t), Math.sin(a) * HX_R);
}

function yearLabelAtProgress(list, p) {
    const first = list[0];
    const last = list[list.length - 1];
    if (p <= first.fraction) return `${first.year} —`;
    if (p >= last.fraction) return `${last.year} →`;
    for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const b = list[i + 1];
        if (p >= a.fraction && p <= b.fraction) {
            const local = (p - a.fraction) / (b.fraction - a.fraction);
            return String(Math.round(a.year + (b.year - a.year) * local));
        }
    }
    return String(last.year);
}

// The real career timeline — reused verbatim as base pairs along the strand.
const nodes = timeline.map((entry, i) => {
    const color = entry.kind === "now" ? ACCENT : i === 0 ? ACCENT_2 : INK;
    const posA = strandPoint(entry.fraction, 0);
    const posB = strandPoint(entry.fraction, Math.PI);
    const mid = new THREE.Vector3(0, heightAtT(entry.fraction), 0);
    return { ...entry, color, posA, posB, mid };
});

/* ============================================================
   Structure — backbones, ladder, caps, axis
   ============================================================ */

function AxisLine() {
    const points = useMemo(
        () => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, HX_LEN, 0)],
        [],
    );
    return (
        <Line
            points={points}
            color={INK}
            lineWidth={1}
            dashed
            dashSize={0.08}
            gapSize={0.13}
            transparent
            opacity={0.22}
            raycast={() => null}
        />
    );
}

function BackboneStrand({ phase }) {
    const points = useMemo(() => {
        const steps = 320;
        const pts = [];
        for (let i = 0; i <= steps; i++) pts.push(strandPoint(i / steps, phase));
        return pts;
    }, [phase]);
    return (
        <Line
            points={points}
            color={INK}
            lineWidth={1.4}
            transparent
            opacity={0.5}
            raycast={() => null}
        />
    );
}

// Decorative ladder rungs at regular intervals — the classic DNA-diagram
// look. Real timeline entries get their own bright, interactive rung
// (NodeRung, below); these are just the quiet in-between structure.
function LadderRungs() {
    const rungs = useMemo(() => {
        const count = 56;
        const arr = [];
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const nearNode = nodes.some((n) => Math.abs(n.fraction - t) < 0.014);
            if (nearNode) continue;
            arr.push([strandPoint(t, 0), strandPoint(t, Math.PI)]);
        }
        return arr;
    }, []);
    return (
        <>
            {rungs.map((pts, i) => (
                <Line
                    key={i}
                    points={pts}
                    color={INK}
                    lineWidth={1}
                    transparent
                    opacity={0.1}
                    raycast={() => null}
                />
            ))}
        </>
    );
}

function CapRing({ y, color, opacity = 0.5 }) {
    const pts = useMemo(() => {
        const segs = 64;
        const arr = [];
        for (let i = 0; i <= segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            arr.push(new THREE.Vector3(Math.cos(a) * HX_R * 1.16, y, Math.sin(a) * HX_R * 1.16));
        }
        return arr;
    }, [y, color]);
    return (
        <Line
            points={pts}
            color={color}
            lineWidth={1.3}
            transparent
            opacity={opacity}
            raycast={() => null}
        />
    );
}

function OriginPulse({ pulseRef }) {
    return (
        <mesh ref={pulseRef} position={[0, HX_LEN, 0]} raycast={() => null}>
            <sphereGeometry args={[0.07, 14, 14]} />
            <meshBasicMaterial color={ACCENT_2} transparent opacity={0.85} />
        </mesh>
    );
}

/* ============================================================
   Node rung — one real timeline entry, bridging both strands
   ============================================================ */

function NodeRung({ node, index, nodeRefsRef, progressTargetRef, onHoverIn, onHoverOut }) {
    const setLine = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), line: el };
    };
    const setCubeA = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), cubeA: el };
    };
    const setCubeB = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), cubeB: el };
    };
    const setLabel = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), label: el };
    };

    const travelHere = (e) => {
        e.stopPropagation();
        progressTargetRef.current = node.fraction;
    };

    return (
        <group>
            <Line
                ref={setLine}
                points={[node.posA, node.posB]}
                color={node.color}
                lineWidth={1.6}
                transparent
                opacity={0.35}
                raycast={() => null}
            />

            {[node.posA, node.posB].map((pos, k) => (
                <group key={k} position={pos}>
                    {/* generous invisible hit-target — the visible marker is small,
                        but a 3D point that size is nearly impossible to aim at */}
                    <mesh
                        onClick={travelHere}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            onHoverIn?.();
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            onHoverOut?.();
                        }}
                    >
                        <sphereGeometry args={[0.34, 10, 10]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                    <mesh ref={k === 0 ? setCubeA : setCubeB} raycast={() => null}>
                        <boxGeometry args={[0.15, 0.15, 0.15]} />
                        <meshBasicMaterial color={node.color} transparent opacity={0.4} />
                    </mesh>
                </group>
            ))}

            <Html position={node.mid} center>
                <div ref={setLabel} className="hx-node-label">
                    <span className="hx-node-year">{node.year}</span>
                    <span className="hx-node-kind">{node.kind}</span>
                </div>
            </Html>
        </group>
    );
}

/* ============================================================
   Director — scroll-driven vertical dolly + focus easing
   ============================================================ */

function HelixDirector({
    controlsRef,
    nodeRefsRef,
    progressRef,
    progressTargetRef,
    prevTargetYRef,
    ringRef,
    pulseRef,
    hudYearRef,
    activeIndexRef,
    setActiveIndex,
}) {
    useFrame((state, dt) => {
        const controls = controlsRef.current;
        if (!controls) return;

        progressRef.current = THREE.MathUtils.damp(
            progressRef.current,
            progressTargetRef.current,
            3.4,
            dt,
        );
        const progress = progressRef.current;
        const targetY = heightAtT(progress);

        // Translate camera + target together along Y only — rotation around Y
        // (drag orbit / autoRotate) and this vertical dolly commute, so this
        // stays correct regardless of hook update order. Progress 0 -> crown
        // (origin), progress 1 -> root (now): scrolling down descends.
        const dy = targetY - prevTargetYRef.current;
        state.camera.position.y += dy;
        controls.target.y = targetY;
        prevTargetYRef.current = targetY;

        let bestIdx = 0;
        let bestDist = Infinity;
        nodes.forEach((n, i) => {
            const d = Math.abs(progress - n.fraction);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
            const amt = 1 - Math.min(1, d / FOCUS_WINDOW);
            const eased = amt * amt * (3 - 2 * amt);
            const refs = nodeRefsRef.current[i];
            if (refs?.cubeA) {
                refs.cubeA.scale.setScalar(0.75 + eased * 1.15);
                refs.cubeA.material.opacity = 0.35 + eased * 0.65;
            }
            if (refs?.cubeB) {
                refs.cubeB.scale.setScalar(0.75 + eased * 1.15);
                refs.cubeB.material.opacity = 0.35 + eased * 0.65;
            }
            if (refs?.line?.material) {
                refs.line.material.opacity = 0.25 + eased * 0.75;
            }
            if (refs?.label) {
                refs.label.style.opacity = String(0.4 + eased * 0.6);
                refs.label.style.color = eased > 0.55 ? n.color : "var(--ink-mute)";
                refs.label.style.transform = `translateY(-16px) scale(${0.86 + eased * 0.22})`;
            }
        });

        if (bestIdx !== activeIndexRef.current) {
            activeIndexRef.current = bestIdx;
            setActiveIndex(bestIdx);
        }

        if (hudYearRef.current) {
            hudYearRef.current.textContent = yearLabelAtProgress(nodes, progress);
        }

        if (ringRef.current) {
            ringRef.current.position.y = targetY;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.05;
            ringRef.current.scale.set(pulse, pulse, 1);
        }
        if (pulseRef.current) {
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.18;
            pulseRef.current.scale.setScalar(pulse);
        }
    });
    return null;
}

/* ============================================================
   Scene
   ============================================================ */

function HelixScene({ onHover }) {
    const controlsRef = useRef(null);
    const nodeRefsRef = useRef([]);
    const progressRef = useRef(0);
    const progressTargetRef = useRef(0);
    const prevTargetYRef = useRef(HX_LEN);
    const activeIndexRef = useRef(0);
    const hudYearRef = useRef(null);
    const ringRef = useRef(null);
    const pulseRef = useRef(null);
    const surfaceRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const reducedMotion = useMemo(
        () =>
            typeof window !== "undefined" &&
            !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
        [],
    );

    useEffect(() => {
        const el = surfaceRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            progressTargetRef.current = THREE.MathUtils.clamp(
                progressTargetRef.current + e.deltaY * 0.00045,
                0,
                1,
            );
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    const active = nodes[activeIndex];

    return (
        <>
            <div className="hx-surface" ref={surfaceRef}>
                <Canvas
                    camera={{ position: [5.4, HX_LEN + 3.2, 6.2], fov: 42 }}
                    gl={{ antialias: true }}
                >
                    <color attach="background" args={[PAPER]} />
                    <fog attach="fog" args={[PAPER, 10, 25]} />

                    <AxisLine />
                    <BackboneStrand phase={0} />
                    <BackboneStrand phase={Math.PI} />
                    <LadderRungs />
                    <CapRing y={HX_LEN} color={ACCENT_2} opacity={0.55} />
                    <CapRing y={0} color={ACCENT} opacity={0.55} />
                    <OriginPulse pulseRef={pulseRef} />

                    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                        <ringGeometry args={[HX_R * 1.26, HX_R * 1.275, 96]} />
                        <meshBasicMaterial
                            color={ACCENT}
                            transparent
                            opacity={0.4}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                        />
                    </mesh>

                    {nodes.map((node, i) => (
                        <NodeRung
                            key={node.id}
                            node={node}
                            index={i}
                            nodeRefsRef={nodeRefsRef}
                            progressTargetRef={progressTargetRef}
                            onHoverIn={() => onHover(i)}
                            onHoverOut={() => onHover((cur) => (cur === i ? null : cur))}
                        />
                    ))}

                    <HelixDirector
                        controlsRef={controlsRef}
                        nodeRefsRef={nodeRefsRef}
                        progressRef={progressRef}
                        progressTargetRef={progressTargetRef}
                        prevTargetYRef={prevTargetYRef}
                        ringRef={ringRef}
                        pulseRef={pulseRef}
                        hudYearRef={hudYearRef}
                        activeIndexRef={activeIndexRef}
                        setActiveIndex={setActiveIndex}
                    />

                    <OrbitControls
                        ref={controlsRef}
                        target={[0, HX_LEN, 0]}
                        enablePan={false}
                        enableZoom={false}
                        enableDamping
                        dampingFactor={0.08}
                        rotateSpeed={0.5}
                        autoRotate={!reducedMotion}
                        autoRotateSpeed={0.5}
                    />
                </Canvas>
            </div>

            <div className="hx-hud">
                <div className="hx-hud-row">
                    <span className="ef-label">epoch</span>
                    <span className="ef-mono hx-hud-year" ref={hudYearRef}>
                        {yearLabelAtProgress(nodes, 0)}
                    </span>
                </div>
                <p className="ef-label hx-hud-caption">
                    a life, coiled — descend the strand from origin to now
                </p>
                <div className="hx-legend">
                    <span className="hx-legend-dot hx-legend-dot--origin" aria-hidden />
                    <span className="ef-label">origin</span>
                    <span className="hx-legend-dot hx-legend-dot--now" aria-hidden />
                    <span className="ef-label">now</span>
                </div>
            </div>

            <div className="hx-card" key={activeIndex}>
                <span className="ef-mono hx-card-meta">
                    <span>{active.year}</span>
                    <span className="hx-card-kind">{active.kind}</span>
                </span>
                <h4 className="hx-card-title">{active.title}</h4>
                <p className="hx-card-body">{active.body}</p>
            </div>
        </>
    );
}

/* ============================================================
   Hover card — lab-only invented "sequence" flavour data layered
   on top of the real timeline entry.
   ============================================================ */

const FLAVOR_NOTES = [
    "base pair 001 — the strand's anchor, everything transcribes from here.",
    "a second exon spliced in early; the pattern was already forming.",
    "a long intron — quiet years the sequence still needed.",
    "first expressed protein: something built to survive weather, not simulations.",
    "codon rewritten under clinical pressure — still folds correctly.",
    "the base pair you're reading right now — transcription in progress.",
];

function hoverInfoFor(entry, index) {
    const prev = nodes[index - 1];
    const span = prev ? entry.year - prev.year : null;
    const turns = (entry.fraction * HX_TURNS).toFixed(2);
    return {
        locus: `${index + 1}${entry.kind[0]}.${String(Math.round(entry.fraction * 100)).padStart(2, "0")}`,
        strand: index % 2 === 0 ? "sense" : "antisense",
        span: span != null ? `+${span} yr codon` : "codon zero",
        turns: `${turns} turns from origin`,
        note: FLAVOR_NOTES[index] ?? "—",
    };
}

function HoverCardBody({ index }) {
    const entry = timeline[index];
    if (!entry) return null;
    const info = hoverInfoFor(entry, index);
    return (
        <>
            <span className="ef-mono hx-hover-meta">
                <span>{entry.year}</span>
                <span className="hx-hover-kind">{entry.kind}</span>
                <span className="hx-hover-desig">{info.locus}</span>
            </span>
            <h5 className="hx-hover-title">{entry.title}</h5>
            <p className="hx-hover-body">{entry.body}</p>
            <dl className="hx-hover-stats">
                <div>
                    <dt>strand</dt>
                    <dd>{info.strand}</dd>
                </div>
                <div>
                    <dt>span</dt>
                    <dd>{info.span}</dd>
                </div>
                <div>
                    <dt>turns</dt>
                    <dd>{info.turns}</dd>
                </div>
            </dl>
            <p className="hx-hover-note">{info.note}</p>
        </>
    );
}

/* ============================================================
   Root
   ============================================================ */

export default function TimelineHelix() {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const wrapRef = useRef(null);
    const hoverCardRef = useRef(null);

    useEffect(() => {
        const onMove = (e) => {
            const wrap = wrapRef.current;
            if (!wrap || !hoverCardRef.current) return;
            const r = wrap.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            hoverCardRef.current.style.transform = `translate3d(${x + 20}px, ${y + 20}px, 0)`;
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
    }, []);

    return (
        <LabStage
            idx="06"
            title="timeline — helix"
            tag="about"
            hint="scroll to descend · drag to orbit · hover / click a rung"
        >
            <div className="hx-wrap" ref={wrapRef}>
                <HelixScene onHover={setHoveredIndex} />

                {hoveredIndex != null && (
                    <div className="hx-hover-card" ref={hoverCardRef}>
                        <HoverCardBody index={hoveredIndex} />
                    </div>
                )}
            </div>
        </LabStage>
    );
}
