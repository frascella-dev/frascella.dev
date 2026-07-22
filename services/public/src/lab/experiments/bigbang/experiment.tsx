import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import LabStage from "../../LabStage.tsx";
import { timeline } from "../../../data/timeline.ts";
import "./bigbang.css";

// A "big bang" reading of the About timeline, in two variants:
//
//  01 · VORTEX — the flat SVG thread becomes a spiral of ink points, timeline
//     entries as epochs along one arm (earliest near the singularity, "now"
//     at the outer edge). Scroll (dolly zoom) travels outward; drag orbits.
//
//  02 · FUNNEL — the classic "evolution of the universe" horn: a closed disc
//     at birth flaring into a wide wireframe cone toward now. Scroll flies
//     the camera down the length; drag orbits around wherever you are.
//
// Both read the same real timeline data. Hover a node for a detail card
// (year/title/body plus a few invented lab-only flavour fields); click a
// node to travel straight to it. The data is the point — the shape is only
// the frame it hangs on.

const PAPER = "#EEEAE0";
const INK = "#111110";
const ACCENT = "#FF6B1A"; // now
const ACCENT_2 = "#C7F651"; // origin
const FOCUS_WINDOW = 0.1;

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

/* ============================================================
   VARIANT 01 — VORTEX  (unchanged shape/behaviour; hover added)
   ============================================================ */

const R_MIN = 0.55;
const R_MAX = 8.2;
const TURNS = 2.35;
const MIN_DIST = 2.35;
const MAX_DIST = 13.5;

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}
function radiusAtT(t) {
    return R_MIN + (R_MAX - R_MIN) * easeOutCubic(t);
}
function angleAtT(t) {
    return t * TURNS * Math.PI * 2;
}
function heightAtT(t) {
    return Math.sin(t * Math.PI * 5) * 0.22 * (1 - t * 0.6);
}
function spinePoint(t) {
    const r = radiusAtT(t);
    const a = angleAtT(t);
    return new THREE.Vector3(Math.cos(a) * r, heightAtT(t), Math.sin(a) * r);
}
function ringPoints(radius, segments = 72) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
}

// The real career timeline — reused verbatim as the expansion's data zones.
const nodes = timeline.map((entry, i) => {
    const color = entry.kind === "now" ? ACCENT : i === 0 ? ACCENT_2 : INK;
    return { ...entry, pos: spinePoint(entry.fraction), color };
});

function Spine() {
    const points = useMemo(() => {
        const steps = 240;
        const pts = [];
        for (let i = 0; i <= steps; i++) pts.push(spinePoint(i / steps));
        return pts;
    }, []);
    return (
        <Line
            points={points}
            color={INK}
            lineWidth={1}
            dashed
            dashSize={0.05}
            gapSize={0.09}
            transparent
            opacity={0.42}
            raycast={() => null}
        />
    );
}

function Shells() {
    return (
        <>
            {nodes.map((n) => (
                <Line
                    key={n.id}
                    points={ringPoints(radiusAtT(n.fraction))}
                    color={INK}
                    lineWidth={1}
                    transparent
                    opacity={0.07}
                    raycast={() => null}
                />
            ))}
        </>
    );
}

// Ambient field: points drifting outward from the singularity along three
// spiral arms (one shadows the real data arm), looping back to the core.
// Recomputed each frame — a slow, continuous "the universe keeps expanding".
function AmbientField({ count = 2200 }) {
    const geoRef = useRef(null);
    const data = useMemo(() => {
        const t0 = new Float32Array(count);
        const speed = new Float32Array(count);
        const angJitter = new Float32Array(count);
        const radJitter = new Float32Array(count);
        const vertJitter = new Float32Array(count);
        const armOffset = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            t0[i] = Math.random();
            speed[i] = 0.006 + Math.random() * 0.012;
            angJitter[i] = (Math.random() - 0.5) * 0.5;
            radJitter[i] = Math.random() - 0.5;
            vertJitter[i] = Math.random() - 0.5;
            armOffset[i] = Math.floor(Math.random() * 3) * ((Math.PI * 2) / 3);
        }
        const positions = new Float32Array(count * 3);
        return { t0, speed, angJitter, radJitter, vertJitter, armOffset, positions };
    }, [count]);

    useFrame((state) => {
        const geo = geoRef.current;
        if (!geo) return;
        const posAttr = geo.attributes.position;
        const arr = posAttr.array;
        const elapsed = state.clock.elapsedTime;
        for (let i = 0; i < count; i++) {
            const t = (data.t0[i] + elapsed * data.speed[i]) % 1;
            const radius = Math.max(
                0.05,
                radiusAtT(t) + data.radJitter[i] * 0.45 * (0.25 + t),
            );
            const angle = angleAtT(t) + data.angJitter[i] + data.armOffset[i];
            const y = heightAtT(t) + data.vertJitter[i] * 0.4 * (0.3 + t);
            arr[i * 3] = Math.cos(angle) * radius;
            arr[i * 3 + 1] = y;
            arr[i * 3 + 2] = Math.sin(angle) * radius;
        }
        posAttr.needsUpdate = true;
    });

    return (
        <points raycast={() => null}>
            <bufferGeometry ref={geoRef}>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={data.positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                color={INK}
                size={0.045}
                sizeAttenuation
                transparent
                opacity={0.4}
                depthWrite={false}
            />
        </points>
    );
}

function NodeMarker({ node, index, nodeRefsRef, targetDistanceRef, onHoverIn, onHoverOut }) {
    const setMeshRef = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), mesh: el };
    };
    const setLabelRef = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), label: el };
    };

    return (
        <group position={node.pos}>
            {/* generous invisible hit-target — the visible dot is small, but
                a 3D point that size is nearly impossible to aim at precisely */}
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    targetDistanceRef.current =
                        MIN_DIST + node.fraction * (MAX_DIST - MIN_DIST);
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
                <sphereGeometry args={[0.32, 12, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh ref={setMeshRef} raycast={() => null}>
                <sphereGeometry args={[0.09, 20, 20]} />
                <meshBasicMaterial color={node.color} transparent opacity={0.4} />
            </mesh>
            <Html center>
                <div ref={setLabelRef} className="bb-node-label">
                    <span className="bb-node-year">{node.year}</span>
                    <span className="bb-node-kind">{node.kind}</span>
                </div>
            </Html>
        </group>
    );
}

function Director({
    controlsRef,
    nodeRefsRef,
    coreRef,
    focusRingRef,
    targetDistanceRef,
    hudYearRef,
    activeIndexRef,
    setActiveIndex,
}) {
    useFrame((state, dt) => {
        const controls = controlsRef.current;
        if (!controls) return;

        if (targetDistanceRef.current != null) {
            const camera = state.camera;
            const dir = camera.position.clone().sub(controls.target);
            const dist = dir.length() || 0.0001;
            const next = THREE.MathUtils.damp(dist, targetDistanceRef.current, 4, dt);
            dir.setLength(next);
            camera.position.copy(controls.target).add(dir);
            if (Math.abs(next - targetDistanceRef.current) < 0.03) {
                targetDistanceRef.current = null;
            }
        }

        const distance = controls.getDistance
            ? controls.getDistance()
            : state.camera.position.distanceTo(controls.target);
        const progress = THREE.MathUtils.clamp(
            (distance - MIN_DIST) / (MAX_DIST - MIN_DIST),
            0,
            1,
        );

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
            if (refs?.mesh) {
                refs.mesh.scale.setScalar(0.8 + eased * 0.9);
                refs.mesh.material.opacity = 0.4 + eased * 0.6;
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
            hudYearRef.current.textContent = yearLabelAtProgress(nodes, progress);
        }

        if (focusRingRef.current) {
            const r = radiusAtT(progress);
            focusRingRef.current.scale.set(r, r, 1);
        }

        if (coreRef.current) {
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.18;
            coreRef.current.scale.setScalar(pulse);
        }
    });
    return null;
}

function VortexScene({ onHover }) {
    const controlsRef = useRef(null);
    const nodeRefsRef = useRef([]);
    const targetDistanceRef = useRef(null);
    const activeIndexRef = useRef(0);
    const hudYearRef = useRef(null);
    const coreRef = useRef(null);
    const focusRingRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const active = nodes[activeIndex];

    return (
        <>
            <Canvas
                camera={{ position: [4.9, 7.6, 5.6], fov: 40 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={[PAPER]} />
                <fog attach="fog" args={[PAPER, 7, 21]} />

                <Spine />
                <Shells />
                <AmbientField count={2200} />

                <mesh ref={focusRingRef} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                    <ringGeometry args={[0.992, 1, 96]} />
                    <meshBasicMaterial
                        color={ACCENT}
                        transparent
                        opacity={0.4}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>

                <mesh ref={coreRef} raycast={() => null}>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshBasicMaterial color={ACCENT_2} transparent opacity={0.85} />
                </mesh>

                {nodes.map((node, i) => (
                    <NodeMarker
                        key={node.id}
                        node={node}
                        index={i}
                        nodeRefsRef={nodeRefsRef}
                        targetDistanceRef={targetDistanceRef}
                        onHoverIn={() => onHover(i)}
                        onHoverOut={() => onHover((cur) => (cur === i ? null : cur))}
                    />
                ))}

                <Director
                    controlsRef={controlsRef}
                    nodeRefsRef={nodeRefsRef}
                    coreRef={coreRef}
                    focusRingRef={focusRingRef}
                    targetDistanceRef={targetDistanceRef}
                    hudYearRef={hudYearRef}
                    activeIndexRef={activeIndexRef}
                    setActiveIndex={setActiveIndex}
                />

                <OrbitControls
                    ref={controlsRef}
                    target={[0, 0, 0]}
                    enablePan={false}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={MIN_DIST}
                    maxDistance={MAX_DIST}
                    autoRotate
                    autoRotateSpeed={0.22}
                    rotateSpeed={0.5}
                    zoomSpeed={0.6}
                />
            </Canvas>

            <div className="bb-hud">
                <div className="bb-hud-row">
                    <span className="ef-label">epoch</span>
                    <span className="ef-mono bb-hud-year" ref={hudYearRef}>
                        {yearLabelAtProgress(nodes, 0)}
                    </span>
                </div>
                <p className="ef-label bb-hud-caption">
                    a life, expanding — zoom out from the singularity
                </p>
                <div className="bb-legend">
                    <span className="bb-legend-dot bb-legend-dot--origin" aria-hidden />
                    <span className="ef-label">origin</span>
                    <span className="bb-legend-dot bb-legend-dot--now" aria-hidden />
                    <span className="ef-label">now</span>
                </div>
            </div>

            <div className="bb-card" key={activeIndex}>
                <span className="ef-mono bb-card-meta">
                    <span>{active.year}</span>
                    <span className="bb-card-kind">{active.kind}</span>
                </span>
                <h4 className="bb-card-title">{active.title}</h4>
                <p className="bb-card-body">{active.body}</p>
            </div>
        </>
    );
}

/* ============================================================
   Shared — hover card content (lab-only invented flavour data
   layered on top of the real timeline entry).
   ============================================================ */

const FLAVOR_NOTES = [
    "first light — the only immovable coordinate.",
    "signal acquired. loop begins.",
    "escape velocity reached, physics inconclusive.",
    "first stable orbit around real hardware.",
    "mass increases; so does the state to keep honest.",
    "current position — still expanding.",
];

function hoverInfoFor(entry, index) {
    const prev = nodes[index - 1];
    const span = prev ? entry.year - prev.year : null;
    const angleDeg = ((angleAtT(entry.fraction) * 180) / Math.PI) % 360;
    const ra = (((angleDeg / 15) % 24) + 24) % 24;
    const dec = -30 + entry.fraction * 60;
    return {
        designation: `EF-${String(index + 1).padStart(3, "0")}`,
        coordinate: `RA ${ra.toFixed(1)}h · DEC ${dec >= 0 ? "+" : ""}${dec.toFixed(1)}°`,
        duration: span != null ? `+${span} yr epoch` : "epoch zero",
        note: FLAVOR_NOTES[index] ?? "—",
    };
}

function HoverCardBody({ index }) {
    const entry = timeline[index];
    if (!entry) return null;
    const info = hoverInfoFor(entry, index);
    return (
        <>
            <span className="ef-mono bb-hover-meta">
                <span>{entry.year}</span>
                <span className="bb-hover-kind">{entry.kind}</span>
                <span className="bb-hover-desig">{info.designation}</span>
            </span>
            <h5 className="bb-hover-title">{entry.title}</h5>
            <p className="bb-hover-body">{entry.body}</p>
            <dl className="bb-hover-stats">
                <div>
                    <dt>coord</dt>
                    <dd>{info.coordinate}</dd>
                </div>
                <div>
                    <dt>span</dt>
                    <dd>{info.duration}</dd>
                </div>
            </dl>
            <p className="bb-hover-note">{info.note}</p>
        </>
    );
}

/* ============================================================
   VARIANT 02 — FUNNEL (the "evolution of the universe" horn)
   ============================================================ */

const F_LEN = 11; // axial length: birth (x=0, closed) → now (x=F_LEN, open)
const F_R_MIN = 0.14;
const F_R_MAX = 3.5;
const F_RINGS = 16;
const F_LON = 22;

function axialFunnel(t) {
    return t * F_LEN;
}
function radiusFunnel(t) {
    return F_R_MIN + (F_R_MAX - F_R_MIN) * Math.pow(t, 1.55);
}
function funnelPoint(t, angle) {
    const r = radiusFunnel(t);
    return new THREE.Vector3(axialFunnel(t), r * Math.cos(angle), r * Math.sin(angle));
}
function ringFunnel(t, segments = 80) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        pts.push(funnelPoint(t, (i / segments) * Math.PI * 2));
    }
    return pts;
}
function funnelAxisPoint(t) {
    return new THREE.Vector3(axialFunnel(t), 0, 0);
}
// The camera trails the moving target at a fixed direction but a radius that
// grows with the local tube radius, so framing stays consistent from the
// pinhole-close cap to the wide-open "now" mouth.
const FUNNEL_CAM_DIR = new THREE.Vector3(-1.8, 2.0, 4.0).normalize();
function funnelCamRadius(t) {
    return 3.3 + radiusFunnel(t) * 1.25;
}

const funnelNodes = timeline.map((entry, i) => {
    const color = entry.kind === "now" ? ACCENT : i === 0 ? ACCENT_2 : INK;
    return { ...entry, pos: funnelPoint(entry.fraction, 0), color };
});

function FunnelGrid() {
    const { longitudes, rings } = useMemo(() => {
        const longSteps = 64;
        const longitudes = [];
        for (let li = 0; li < F_LON; li++) {
            const angle = (li / F_LON) * Math.PI * 2;
            const pts = [];
            for (let i = 0; i <= longSteps; i++) pts.push(funnelPoint(i / longSteps, angle));
            longitudes.push(pts);
        }
        const rings = [];
        for (let ri = 0; ri <= F_RINGS; ri++) {
            const t = ri / F_RINGS;
            rings.push({ t, pts: ringFunnel(t) });
        }
        return { longitudes, rings };
    }, []);

    return (
        <>
            {longitudes.map((pts, i) => (
                <Line
                    key={`lon-${i}`}
                    points={pts}
                    color={INK}
                    lineWidth={1}
                    transparent
                    opacity={0.16}
                    raycast={() => null}
                />
            ))}
            {rings.map(({ t, pts }, i) => (
                <Line
                    key={`ring-${i}`}
                    points={pts}
                    color={INK}
                    lineWidth={1}
                    transparent
                    opacity={t < 0.02 ? 0.5 : 0.14}
                    raycast={() => null}
                />
            ))}
        </>
    );
}

function FunnelShells() {
    return (
        <>
            {funnelNodes.map((n) => (
                <Line
                    key={n.id}
                    points={ringFunnel(n.fraction)}
                    color={n.color}
                    lineWidth={1}
                    transparent
                    opacity={0.18}
                    raycast={() => null}
                />
            ))}
        </>
    );
}

function FunnelCap() {
    const capPoints = useMemo(() => ringFunnel(1), []);
    return (
        <>
            <mesh rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
                <circleGeometry args={[F_R_MIN, 40]} />
                <meshBasicMaterial color={INK} transparent opacity={0.55} side={THREE.DoubleSide} />
            </mesh>
            <mesh raycast={() => null}>
                <sphereGeometry args={[0.045, 16, 16]} />
                <meshBasicMaterial color={ACCENT_2} transparent opacity={0.9} />
            </mesh>
            <Line points={capPoints} color={ACCENT} lineWidth={1} transparent opacity={0.4} raycast={() => null} />
        </>
    );
}

function FunnelNode({ node, index, nodeRefsRef, progressTargetRef, onHoverIn, onHoverOut }) {
    const setMeshRef = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), mesh: el };
    };
    const setLabelRef = (el) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), label: el };
    };

    return (
        <group position={node.pos}>
            {/* generous invisible hit-target — the visible dot is small, but
                a 3D point that size is nearly impossible to aim at precisely */}
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    progressTargetRef.current = node.fraction;
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
                <sphereGeometry args={[0.32, 12, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh ref={setMeshRef} raycast={() => null}>
                <sphereGeometry args={[0.09, 20, 20]} />
                <meshBasicMaterial color={node.color} transparent opacity={0.4} />
            </mesh>
            <Html center>
                <div ref={setLabelRef} className="bb-node-label">
                    <span className="bb-node-year">{node.year}</span>
                    <span className="bb-node-kind">{node.kind}</span>
                </div>
            </Html>
        </group>
    );
}

function FunnelDirector({
    controlsRef,
    nodeRefsRef,
    progressRef,
    progressTargetRef,
    prevTargetRef,
    focusRingRef,
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
            3.2,
            dt,
        );
        const progress = progressRef.current;

        const newTarget = funnelAxisPoint(progress);
        const currentOffset = state.camera.position.clone().sub(prevTargetRef.current);
        if (currentOffset.lengthSq() < 1e-6) currentOffset.copy(FUNNEL_CAM_DIR);
        currentOffset.setLength(funnelCamRadius(progress));
        state.camera.position.copy(newTarget).add(currentOffset);
        controls.target.copy(newTarget);
        prevTargetRef.current.copy(newTarget);

        let bestIdx = 0;
        let bestDist = Infinity;
        funnelNodes.forEach((n, i) => {
            const d = Math.abs(progress - n.fraction);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
            const amt = 1 - Math.min(1, d / FOCUS_WINDOW);
            const eased = amt * amt * (3 - 2 * amt);
            const refs = nodeRefsRef.current[i];
            if (refs?.mesh) {
                refs.mesh.scale.setScalar(0.8 + eased * 0.9);
                refs.mesh.material.opacity = 0.4 + eased * 0.6;
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
            hudYearRef.current.textContent = yearLabelAtProgress(funnelNodes, progress);
        }

        if (focusRingRef.current) {
            const r = radiusFunnel(progress);
            focusRingRef.current.position.x = axialFunnel(progress);
            focusRingRef.current.scale.set(r, r, 1);
        }
    });
    return null;
}

function FunnelScene({ onHover }) {
    const controlsRef = useRef(null);
    const nodeRefsRef = useRef([]);
    const progressRef = useRef(0);
    const progressTargetRef = useRef(0);
    const prevTargetRef = useRef(new THREE.Vector3(0, 0, 0));
    const activeIndexRef = useRef(0);
    const hudYearRef = useRef(null);
    const focusRingRef = useRef(null);
    const surfaceRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const el = surfaceRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            progressTargetRef.current = THREE.MathUtils.clamp(
                progressTargetRef.current + e.deltaY * 0.00055,
                0,
                1,
            );
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    const active = funnelNodes[activeIndex];

    return (
        <>
            <div className="bb-funnel-surface" ref={surfaceRef}>
                <Canvas
                    camera={{
                        position: FUNNEL_CAM_DIR.clone().multiplyScalar(funnelCamRadius(0)).toArray(),
                        fov: 42,
                    }}
                    gl={{ antialias: true }}
                >
                    <color attach="background" args={[PAPER]} />
                    <fog attach="fog" args={[PAPER, 9, 26]} />

                    <FunnelGrid />
                    <FunnelShells />
                    <FunnelCap />

                    <mesh ref={focusRingRef} rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
                        <ringGeometry args={[0.992, 1, 96]} />
                        <meshBasicMaterial
                            color={ACCENT}
                            transparent
                            opacity={0.45}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                        />
                    </mesh>

                    {funnelNodes.map((node, i) => (
                        <FunnelNode
                            key={node.id}
                            node={node}
                            index={i}
                            nodeRefsRef={nodeRefsRef}
                            progressTargetRef={progressTargetRef}
                            onHoverIn={() => onHover(i)}
                            onHoverOut={() => onHover((cur) => (cur === i ? null : cur))}
                        />
                    ))}

                    <FunnelDirector
                        controlsRef={controlsRef}
                        nodeRefsRef={nodeRefsRef}
                        progressRef={progressRef}
                        progressTargetRef={progressTargetRef}
                        prevTargetRef={prevTargetRef}
                        focusRingRef={focusRingRef}
                        hudYearRef={hudYearRef}
                        activeIndexRef={activeIndexRef}
                        setActiveIndex={setActiveIndex}
                    />

                    <OrbitControls
                        ref={controlsRef}
                        target={[0, 0, 0]}
                        enablePan={false}
                        enableZoom={false}
                        enableDamping
                        dampingFactor={0.08}
                        rotateSpeed={0.5}
                    />
                </Canvas>
            </div>

            <div className="bb-hud">
                <div className="bb-hud-row">
                    <span className="ef-label">epoch</span>
                    <span className="ef-mono bb-hud-year" ref={hudYearRef}>
                        {yearLabelAtProgress(funnelNodes, 0)}
                    </span>
                </div>
                <p className="ef-label bb-hud-caption">
                    a life, expanding — fly from the singularity to now
                </p>
                <div className="bb-legend">
                    <span className="bb-legend-dot bb-legend-dot--origin" aria-hidden />
                    <span className="ef-label">origin</span>
                    <span className="bb-legend-dot bb-legend-dot--now" aria-hidden />
                    <span className="ef-label">now</span>
                </div>
            </div>

            <div className="bb-card" key={`f-${activeIndex}`}>
                <span className="ef-mono bb-card-meta">
                    <span>{active.year}</span>
                    <span className="bb-card-kind">{active.kind}</span>
                </span>
                <h4 className="bb-card-title">{active.title}</h4>
                <p className="bb-card-body">{active.body}</p>
            </div>
        </>
    );
}

/* ============================================================
   Root — variant switch + shared hover tooltip
   ============================================================ */

export default function BigBang() {
    const [variant, setVariant] = useState("vortex");
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

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "1") setVariant("vortex");
            if (e.key === "2") setVariant("funnel");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <LabStage
            idx="03"
            title="timeline — big bang"
            tag="about"
            hint={
                variant === "vortex"
                    ? "scroll to expand · drag to orbit · hover / click a node"
                    : "scroll to travel · drag to orbit · hover / click a node"
            }
        >
            <div className="bb-wrap" ref={wrapRef}>
                {variant === "vortex" ? (
                    <VortexScene onHover={setHoveredIndex} />
                ) : (
                    <FunnelScene onHover={setHoveredIndex} />
                )}

                <div className="bb-variant-switch">
                    <button
                        type="button"
                        className={`ef-label bb-variant-btn ${variant === "vortex" ? "is-active" : ""}`}
                        onClick={() => setVariant("vortex")}
                    >
                        variant — 01 / vortex
                    </button>
                    <button
                        type="button"
                        className={`ef-label bb-variant-btn ${variant === "funnel" ? "is-active" : ""}`}
                        onClick={() => setVariant("funnel")}
                    >
                        variant — 02 / funnel
                    </button>
                </div>

                {hoveredIndex != null && (
                    <div className="bb-hover-card" ref={hoverCardRef}>
                        <HoverCardBody index={hoveredIndex} />
                    </div>
                )}
            </div>
        </LabStage>
    );
}
