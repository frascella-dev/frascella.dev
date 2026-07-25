import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import LabStage from "../../LabStage.tsx";
import { timeline } from "../../../data/timeline.ts";
import "./constellation.css";

// The About timeline read as a star map. Real entries become fixed points
// scattered across the night field (kept paper-bright — the portfolio's
// inversion of a sky). Joined in chronological order by a single connective
// line, the shape IS the career: a constellation traced star to star. Scroll
// draws the line progressively, a travelling light leading the way; the star
// it reaches brightens. A faint, inert starfield gives depth, and the whole
// field drifts — slowly, and with the cursor — like something seen through
// glass. Hover a star for an invented catalog entry (lab-only flavour,
// exactly the baseline's idiom: designation + RA/DEC, never claimed as real).

const PAPER = "#EEEAE0";
const INK = "#111110";
const ACCENT = "#FF6B1A"; // now
const ACCENT_2 = "#C7F651"; // origin
const FOCUS_WINDOW = 0.11;
const FIELD_W = 5.6; // half-width of the charted field
const SHIP_SCALE = 0.4; // reads at the constellation's scale, not oversized
const GREEK = [
    "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ",
    "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
];

function prefersReducedMotion() {
    return typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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

// Deterministic pseudo-random in [0,1) — gives every star a stable, non-linear
// scatter so the chronological line reads as a chart, not a straight ramp.
function hash(n) {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
}

function starPosition(entry, i) {
    const x = -FIELD_W + entry.fraction * FIELD_W * 2;
    const wave = Math.sin(entry.fraction * Math.PI * 2.4 + i * 0.7) * 1.15;
    const jitterY = (hash(i * 3.1 + 1) - 0.5) * 2.3;
    const y = wave + jitterY;
    const jitterZ = (hash(i * 7.3 + 4) - 0.5) * 2;
    const z = jitterZ * 1.3;
    return new THREE.Vector3(x, y, z);
}

// The real career timeline — reused verbatim as star positions.
const stars = timeline.map((entry, i) => {
    const color = entry.kind === "now" ? ACCENT : i === 0 ? ACCENT_2 : INK;
    return { ...entry, pos: starPosition(entry, i), color };
});

const FLAVOR_NOTES = [
    "the fixed point every bearing is taken from.",
    "first proper motion — no longer stationary.",
    "a slow drift toward escape velocity.",
    "first parallax measured against real hardware.",
    "spectral lines shift; the work gets heavier.",
    "current position — still climbing.",
];

function magnitudeFor(entry, i) {
    if (entry.kind === "now") return -1.4;
    if (i === 0) return -0.9;
    return 1.7 - i * 0.32;
}

function hoverInfoFor(entry, index) {
    const pos = stars[index].pos;
    const ra = (((pos.x + FIELD_W) / (FIELD_W * 2)) * 24 + 24) % 24;
    const dec = THREE.MathUtils.clamp(pos.y * 11, -89, 89);
    const mag = magnitudeFor(entry, index);
    return {
        designation: `${GREEK[index % GREEK.length]} Frascellae`,
        catalog: `EF-${String(index + 1).padStart(3, "0")}`,
        coordinate: `RA ${ra.toFixed(1)}h · DEC ${dec >= 0 ? "+" : ""}${dec.toFixed(1)}°`,
        magnitude: `${mag >= 0 ? "+" : ""}${mag.toFixed(1)}m`,
        note: FLAVOR_NOTES[index] ?? "—",
    };
}

function HoverCardBody({ index }) {
    const entry = timeline[index];
    if (!entry) return null;
    const info = hoverInfoFor(entry, index);
    return (
        <>
            <span className="ef-mono cn-hover-meta">
                <span>{entry.year}</span>
                <span className="cn-hover-kind">{entry.kind}</span>
                <span className="cn-hover-desig">{info.catalog}</span>
            </span>
            <h5 className="cn-hover-title">
                {info.designation}
                <span className="cn-hover-title-sub"> — {entry.title}</span>
            </h5>
            <p className="cn-hover-body">{entry.body}</p>
            <dl className="cn-hover-stats">
                <div>
                    <dt>coord</dt>
                    <dd>{info.coordinate}</dd>
                </div>
                <div>
                    <dt>mag</dt>
                    <dd>{info.magnitude}</dd>
                </div>
            </dl>
            <p className="cn-hover-note">{info.note}</p>
        </>
    );
}

/* ============================================================
   Background field — many tiny, inert points. Pure depth, no data.
   ============================================================ */
function BackgroundField({ count = 900 }) {
    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (hash(i * 1.7 + 0.3) - 0.5) * FIELD_W * 4.4;
            arr[i * 3 + 1] = (hash(i * 2.9 + 1.1) - 0.5) * 7.5;
            arr[i * 3 + 2] = (hash(i * 4.1 + 2.6) - 0.5) * 10 - 3;
        }
        return arr;
    }, [count]);

    return (
        <points raycast={() => null}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                color={INK}
                size={0.05}
                sizeAttenuation
                transparent
                opacity={0.32}
                depthWrite={false}
            />
        </points>
    );
}

/* ============================================================
   Ship — the traveling light. Reimplemented inline (folder isolation —
   not imported from ../asteroids) from that experiment's low-poly wireframe
   Ship: an INK cone hull (nose +Y), an ACCENT torus cockpit near the nose,
   and a lime thruster cone at the back that flares while moving.
   ============================================================ */
function Ship({ groupRef }) {
    const local = useRef(null);
    const thruster = useRef(null);

    useFrame((_, dt) => {
        const moving = local.current?.userData?.moving;
        if (thruster.current) {
            const target = moving ? 1 : 0.05;
            thruster.current.scale.y +=
                (target - thruster.current.scale.y) * Math.min(1, dt * 8);
        }
    });

    return (
        <group
            scale={SHIP_SCALE}
            ref={(g) => {
                local.current = g;
                groupRef(g);
            }}
        >
            <mesh raycast={() => null}>
                <coneGeometry args={[0.32, 0.85, 3]} />
                <meshBasicMaterial color={INK} wireframe />
            </mesh>
            <mesh position={[0, 0.12, 0.02]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
                <torusGeometry args={[0.12, 0.018, 6, 12]} />
                <meshBasicMaterial color={ACCENT} />
            </mesh>
            <mesh
                ref={thruster}
                position={[0, -0.55, 0]}
                scale={[1, 0.05, 1]}
                raycast={() => null}
            >
                <coneGeometry args={[0.13, 0.5, 3]} />
                <meshBasicMaterial color={ACCENT_2} wireframe transparent opacity={0.85} />
            </mesh>
        </group>
    );
}

/* ============================================================
   The connective line — draws progressively toward the traveling light,
   which is now the Ship: it rides the lit tip, nose oriented along the
   path tangent (rotation.z = atan2(tangent.y, tangent.x) - PI/2, same
   convention the game uses since the hull's nose faces local +Y).
   ============================================================ */
function ConstellationLine({ progressRef, reduced, shipRef }) {
    // Built imperatively (not JSX <line>) — three.js's Line and the DOM/SVG
    // <line> element collide in the fiber JSX namespace; a plain object via
    // <primitive> sidesteps it and gives direct geometry access besides.
    const geometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(stars.length * 3), 3),
        );
        return g;
    }, []);
    const lineObj = useMemo(() => {
        const material = new THREE.LineBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.75,
        });
        const obj = new THREE.Line(geometry, material);
        obj.raycast = () => null;
        return obj;
    }, [geometry]);
    // Tracks the previous frame's raw (un-forced) progress so the ship's
    // thruster only flares while progress is actually changing.
    const lastProgressRef = useRef(progressRef.current);

    useFrame(() => {
        const geo = geometry;
        const p = reduced ? 1 : progressRef.current;
        const arr = geo.attributes.position.array;
        const lastIdx = stars.length - 1;

        let vertCount = 0;
        let tip = stars[0].pos;
        let seg = 0; // segment [seg, seg+1] the tip currently sits on/at

        if (p <= stars[0].fraction) {
            arr[0] = stars[0].pos.x;
            arr[1] = stars[0].pos.y;
            arr[2] = stars[0].pos.z;
            vertCount = 1;
            tip = stars[0].pos;
            seg = 0;
        } else if (p >= stars[lastIdx].fraction) {
            stars.forEach((s, i) => {
                arr[i * 3] = s.pos.x;
                arr[i * 3 + 1] = s.pos.y;
                arr[i * 3 + 2] = s.pos.z;
            });
            vertCount = stars.length;
            tip = stars[lastIdx].pos;
            seg = Math.max(0, lastIdx - 1);
        } else {
            for (let i = 0; i < lastIdx; i++) {
                if (p >= stars[i].fraction && p <= stars[i + 1].fraction) {
                    seg = i;
                    break;
                }
            }
            for (let i = 0; i <= seg; i++) {
                arr[i * 3] = stars[i].pos.x;
                arr[i * 3 + 1] = stars[i].pos.y;
                arr[i * 3 + 2] = stars[i].pos.z;
            }
            const a = stars[seg];
            const b = stars[seg + 1];
            const local = THREE.MathUtils.clamp(
                (p - a.fraction) / (b.fraction - a.fraction),
                0,
                1,
            );
            const tipPos = a.pos.clone().lerp(b.pos, local);
            arr[(seg + 1) * 3] = tipPos.x;
            arr[(seg + 1) * 3 + 1] = tipPos.y;
            arr[(seg + 1) * 3 + 2] = tipPos.z;
            vertCount = seg + 2;
            tip = tipPos;
        }

        geo.attributes.position.needsUpdate = true;
        geo.setDrawRange(0, Math.max(vertCount, 1));

        // The ship rides the tip, nose oriented along the segment tangent —
        // same convention as the game's Ship (nose faces local +Y).
        if (shipRef.current) {
            const segA = stars[seg];
            const segB = stars[Math.min(seg + 1, lastIdx)];
            const tangent = segB.pos.clone().sub(segA.pos);
            if (tangent.lengthSq() < 1e-8) tangent.set(0, 1, 0);
            tangent.normalize();

            shipRef.current.position.copy(tip);
            shipRef.current.rotation.z = Math.atan2(tangent.y, tangent.x) - Math.PI / 2;

            const rawProgress = progressRef.current;
            shipRef.current.userData.moving =
                !reduced && Math.abs(rawProgress - lastProgressRef.current) > 6e-5;
            lastProgressRef.current = rawProgress;
        }
    });

    return <primitive object={lineObj} />;
}

/* ============================================================
   Star markers — billboarded squares + Html label, hover + click.
   ============================================================ */
function StarMarker({ star, index, refsRef, progressTargetRef, onHoverIn, onHoverOut }) {
    const setMeshRef = (el) => {
        const arr = refsRef.current;
        arr[index] = { ...(arr[index] || {}), mesh: el };
    };
    const setLabelRef = (el) => {
        const arr = refsRef.current;
        arr[index] = { ...(arr[index] || {}), label: el };
    };

    return (
        <group position={star.pos}>
            {/* generous invisible hit-target — the visible square is small */}
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    progressTargetRef.current = star.fraction;
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    onHoverIn?.();
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    onHoverOut?.();
                }}
            >
                <sphereGeometry args={[0.34, 12, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh ref={setMeshRef} raycast={() => null}>
                <planeGeometry args={[0.13, 0.13]} />
                <meshBasicMaterial
                    color={star.color}
                    transparent
                    opacity={0.4}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
            <Html center>
                <div ref={setLabelRef} className="cn-star-label">
                    <span className="cn-star-year">{star.year}</span>
                    <span className="cn-star-kind">{star.kind}</span>
                </div>
            </Html>
        </group>
    );
}

/* ============================================================
   Director — scroll → progress, focus easing, HUD, parallax.
   ============================================================ */
function Director({
    refsRef,
    progressRef,
    progressTargetRef,
    hudYearRef,
    tracedRef,
    activeIndexRef,
    setActiveIndex,
    bgGroupRef,
    fgGroupRef,
    pointerRef,
    reduced,
}) {
    useFrame((state, dt) => {
        // Keep the whole charted width in frame regardless of the container's
        // aspect ratio — on a tall/narrow (mobile) stage a fixed camera
        // distance would clip the outer stars, so pull back as needed.
        const aspect = state.size.width / Math.max(1, state.size.height);
        const camera = state.camera as THREE.PerspectiveCamera;
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const neededDist = (FIELD_W * 1.22) / (Math.tan(fovRad / 2) * Math.max(aspect, 0.001));
        camera.position.z = THREE.MathUtils.clamp(neededDist, 8.6, 24);

        progressRef.current = THREE.MathUtils.damp(
            progressRef.current,
            progressTargetRef.current,
            3.4,
            dt,
        );
        const progress = progressRef.current;

        let bestIdx = 0;
        let bestDist = Infinity;
        stars.forEach((n, i) => {
            const d = Math.abs(progress - n.fraction);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
            const amt = 1 - Math.min(1, d / FOCUS_WINDOW);
            const eased = amt * amt * (3 - 2 * amt);
            const refs = refsRef.current[i];
            if (refs?.mesh) {
                refs.mesh.scale.setScalar(0.85 + eased * 1.35);
                refs.mesh.material.opacity = 0.4 + eased * 0.6;
                refs.mesh.quaternion.copy(state.camera.quaternion);
            }
            if (refs?.label) {
                refs.label.style.opacity = String(0.4 + eased * 0.6);
                refs.label.style.color = eased > 0.55 ? n.color : "var(--ink-mute)";
                refs.label.style.transform = `translateY(-16px) scale(${0.88 + eased * 0.2})`;
            }
        });

        if (bestIdx !== activeIndexRef.current) {
            activeIndexRef.current = bestIdx;
            setActiveIndex(bestIdx);
        }

        if (hudYearRef.current) {
            hudYearRef.current.textContent = yearLabelAtProgress(stars, progress);
        }
        if (tracedRef.current) {
            const reached = stars.filter((s) => progress >= s.fraction - 0.005).length;
            tracedRef.current.textContent = `${reached} / ${stars.length}`;
        }

        if (!reduced) {
            const elapsed = state.clock.elapsedTime;
            const driftX = Math.sin(elapsed * 0.055) * 0.16;
            const driftY = Math.cos(elapsed * 0.041) * 0.09;
            const px = pointerRef.current.x;
            const py = pointerRef.current.y;
            if (bgGroupRef.current) {
                bgGroupRef.current.position.x = THREE.MathUtils.damp(
                    bgGroupRef.current.position.x,
                    driftX * 0.6 + px * 0.18,
                    2,
                    dt,
                );
                bgGroupRef.current.position.y = THREE.MathUtils.damp(
                    bgGroupRef.current.position.y,
                    driftY * 0.6 - py * 0.12,
                    2,
                    dt,
                );
            }
            if (fgGroupRef.current) {
                fgGroupRef.current.position.x = THREE.MathUtils.damp(
                    fgGroupRef.current.position.x,
                    driftX + px * 0.42,
                    2,
                    dt,
                );
                fgGroupRef.current.position.y = THREE.MathUtils.damp(
                    fgGroupRef.current.position.y,
                    driftY - py * 0.28,
                    2,
                    dt,
                );
            }
        }
    });
    return null;
}

function ConstellationScene({ onHover }) {
    // Computed first and used to seed the refs below — with reduced motion,
    // progress starts already at 1 (nothing damps in from zero), so the line
    // is drawn from the very first frame, not animated in.
    const reduced = useMemo(prefersReducedMotion, []);
    const refsRef = useRef([]);
    const progressRef = useRef(reduced ? 1 : 0);
    const progressTargetRef = useRef(reduced ? 1 : 0);
    const activeIndexRef = useRef(0);
    const hudYearRef = useRef(null);
    const tracedRef = useRef(null);
    const shipRef = useRef(null);
    const bgGroupRef = useRef(null);
    const fgGroupRef = useRef(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const wrapRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const el = wrapRef.current;
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

    useEffect(() => {
        if (reduced) return;
        const el = wrapRef.current;
        if (!el) return;
        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            pointerRef.current = {
                x: THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
                y: THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
            };
        };
        el.addEventListener("pointermove", onMove);
        return () => el.removeEventListener("pointermove", onMove);
    }, [reduced]);

    const active = stars[activeIndex];

    return (
        <div className="cn-wrap" ref={wrapRef}>
            <Canvas camera={{ position: [0, 0.3, 9.4], fov: 40 }} gl={{ antialias: true }}>
                <color attach="background" args={[PAPER]} />
                <fog attach="fog" args={[PAPER, 8, 20]} />

                <group ref={bgGroupRef}>
                    <BackgroundField count={900} />
                </group>

                <group ref={fgGroupRef}>
                    {/* faint full shape — the constellation, always dimly present */}
                    <Line
                        points={stars.map((s) => s.pos)}
                        color={INK}
                        lineWidth={1}
                        dashed
                        dashSize={0.05}
                        gapSize={0.08}
                        transparent
                        opacity={0.16}
                        raycast={() => null}
                    />

                    <ConstellationLine
                        progressRef={progressRef}
                        reduced={reduced}
                        shipRef={shipRef}
                    />

                    <Ship groupRef={(g) => (shipRef.current = g)} />

                    {stars.map((star, i) => (
                        <StarMarker
                            key={star.id}
                            star={star}
                            index={i}
                            refsRef={refsRef}
                            progressTargetRef={progressTargetRef}
                            onHoverIn={() => onHover(i)}
                            onHoverOut={() => onHover((cur) => (cur === i ? null : cur))}
                        />
                    ))}
                </group>

                <Director
                    refsRef={refsRef}
                    progressRef={progressRef}
                    progressTargetRef={progressTargetRef}
                    hudYearRef={hudYearRef}
                    tracedRef={tracedRef}
                    activeIndexRef={activeIndexRef}
                    setActiveIndex={setActiveIndex}
                    bgGroupRef={bgGroupRef}
                    fgGroupRef={fgGroupRef}
                    pointerRef={pointerRef}
                    reduced={reduced}
                />
            </Canvas>

            <div className="cn-hud">
                <div className="cn-hud-row">
                    <span className="ef-label">position</span>
                    <span className="ef-mono cn-hud-year" ref={hudYearRef}>
                        {yearLabelAtProgress(stars, reduced ? 1 : 0)}
                    </span>
                </div>
                <p className="ef-label cn-hud-caption">
                    a career, charted — scroll to trace the line
                </p>
                <div className="cn-hud-row">
                    <span className="ef-label">traced</span>
                    <span className="ef-mono cn-hud-traced" ref={tracedRef}>
                        {reduced ? `${stars.length} / ${stars.length}` : `0 / ${stars.length}`}
                    </span>
                </div>
                <div className="cn-legend">
                    <span className="cn-legend-dot cn-legend-dot--origin" aria-hidden />
                    <span className="ef-label">origin</span>
                    <span className="cn-legend-dot cn-legend-dot--now" aria-hidden />
                    <span className="ef-label">now</span>
                </div>
            </div>

            <div className="cn-card" key={activeIndex}>
                <span className="ef-mono cn-card-meta">
                    <span>{active.year}</span>
                    <span className="cn-card-kind">{active.kind}</span>
                </span>
                <h4 className="cn-card-title">{active.title}</h4>
                <p className="cn-card-body">{active.body}</p>
            </div>
        </div>
    );
}

/* ============================================================
   Root — LabStage frame + cursor-following hover tooltip.
   ============================================================ */
export default function TimelineConstellation() {
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
            title="timeline — constellation"
            tag="about"
            hint="scroll to trace the line · hover / click a star"
        >
            <div className="cn-stage-inner" ref={wrapRef}>
                <ConstellationScene onHover={setHoveredIndex} />

                {hoveredIndex != null && (
                    <div className="cn-hover-card" ref={hoverCardRef}>
                        <HoverCardBody index={hoveredIndex} />
                    </div>
                )}
            </div>
        </LabStage>
    );
}
