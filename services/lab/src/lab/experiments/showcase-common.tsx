import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import LabStage from "../LabStage.tsx";
import { projects } from "../../data/projects.ts";
import "./showcase-common.css";

// Shared engine for the six showcase-* experiments. Each is its own card in the
// lab index (its own folder + meta.ts + a one-line experiment.tsx) but they all
// render through <ShowcaseStage variant="…" /> here, so the scenes live in one
// place. Same real project data as Work.tsx (src/data/projects.ts) plus the
// same "coming soon" placeholders that section already shows, so the lab reads
// honestly rather than inventing ships. Line-based, unlit (meshBasicMaterial /
// lineBasicMaterial only) — no lights needed, matching the site's wireframe
// language.

const WIP_ITEMS = [
    {
        slug: "wip-01",
        title: "Untitled · 01",
        tagline: "Parked behind this block. Nearly ready.",
        year: 2026,
        stack: ["TypeScript", "React"],
        metric: { n: "WIP", l: "Status" },
        kind: "wip",
    },
    {
        slug: "wip-02",
        title: "Untitled · 02",
        tagline: "Locked for now — case study on the way.",
        year: 2026,
        stack: ["Go", "Postgres"],
        metric: { n: "WIP", l: "Status" },
        kind: "wip",
    },
    {
        slug: "wip-03",
        title: "Untitled · 03",
        tagline: "Still drafting. Drop a line for an early look.",
        year: 2026,
        stack: ["Laravel", "Inertia"],
        metric: { n: "WIP", l: "Status" },
        kind: "wip",
    },
];

function buildItems() {
    return [...projects.map((p) => ({ ...p, kind: "shipped" })), ...WIP_ITEMS];
}

const damp = THREE.MathUtils.damp;

function CardBody({ item, idx }) {
    return (
        <>
            <div className="showcase-card-head">
                <span className="ef-mono">№ {String(idx + 1).padStart(2, "0")}</span>
                <span className="ef-mono">{item.kind === "wip" ? "WIP" : item.year}</span>
            </div>
            <div className="showcase-card-title">{item.title}</div>
            <p className="showcase-card-tag">{item.tagline}</p>
            <ul className="showcase-card-stack" aria-hidden>
                {(item.stack || []).slice(0, 4).map((s) => (
                    <li key={s}>{s}</li>
                ))}
            </ul>
            {item.metric && (
                <div className="showcase-card-foot">
                    <div className="showcase-card-metric">
                        <strong>{item.metric.n}</strong>
                        <em>{item.metric.l}</em>
                    </div>
                </div>
            )}
        </>
    );
}

/* ---------------------------------------------------------------------- */
/* Rig — a small, constant pointer parallax on the camera, shared by all
   variants so the stage always feels alive & spatial.                    */
/* ---------------------------------------------------------------------- */
function CameraRig() {
    const { camera, pointer } = useThree();
    const base = useRef(null);
    if (base.current === null) base.current = camera.position.clone();
    useFrame((_, dt) => {
        const b = base.current;
        camera.position.x = damp(camera.position.x, b.x + pointer.x * 0.45, 5, dt);
        camera.position.y = damp(camera.position.y, b.y - pointer.y * 0.28, 5, dt);
        camera.lookAt(0, 0, 0);
    });
    return null;
}

/* ---------------------------------------------------------------------- */
/* CAROUSEL: a ring of cards you rotate through. Cards stay billboarded to
   the camera (no per-card rotation) — with only a handful of real slots a
   true rotisserie shows card backs at 90°/180°; keeping them forward-facing
   while their position swings around the ring reads just as "carousel" and
   stays legible at every step.                                           */
/* ---------------------------------------------------------------------- */
// Spokes render above the ring (a halo, not underfoot) so they stay clear of
// the cards' own DOM — Html panels always paint over the WebGL canvas, so any
// connector that shares screen space with a card is invisible regardless of
// its "real" depth. Radiating from a lifted hub keeps the wheel motif legible.
function CarouselConnectors({ items, getRefs }) {
    const spokeRef = useRef(null);
    const ringRef = useRef(null);
    useFrame(() => {
        const refs = getRefs();
        const spokes = [];
        const ring = [];
        items.forEach((_, i) => {
            const g = refs[i];
            if (!g) return;
            spokes.push(0, 1.7, 0, g.position.x, 1.7, g.position.z);
            ring.push(g.position.x, 1.7, g.position.z);
        });
        if (ring.length >= 6) ring.push(ring[0], ring[1], ring[2]);
        if (spokeRef.current && spokes.length >= 6) {
            spokeRef.current.setAttribute("position", new THREE.BufferAttribute(new Float32Array(spokes), 3));
            spokeRef.current.computeBoundingSphere();
        }
        if (ringRef.current && ring.length >= 6) {
            ringRef.current.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ring), 3));
            ringRef.current.computeBoundingSphere();
        }
    });
    return (
        <>
            <lineSegments frustumCulled={false}>
                <bufferGeometry ref={spokeRef} />
                <lineBasicMaterial color="#111110" transparent opacity={0.16} />
            </lineSegments>
            <line frustumCulled={false}>
                <bufferGeometry ref={ringRef} />
                <lineBasicMaterial color="#111110" transparent opacity={0.3} />
            </line>
        </>
    );
}

function CarouselScene({ items, active, setActive }) {
    const n = items.length;
    const step = (Math.PI * 2) / n;
    const radius = 3.05;
    const refs = useRef([]);
    const ringAngle = useRef(0);

    useFrame((_, dt) => {
        const target = -active * step;
        let diff = target - ringAngle.current;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        ringAngle.current += diff * Math.min(1, dt * 4.2);

        items.forEach((_, i) => {
            const g = refs.current[i];
            if (!g) return;
            const angle = i * step + ringAngle.current;
            g.position.x = Math.sin(angle) * radius;
            g.position.z = Math.cos(angle) * radius;
        });
    });

    return (
        <group>
            {items.map((it, i) => (
                <group key={it.slug} ref={(el) => (refs.current[i] = el)}>
                    <Html center distanceFactor={7} style={{ pointerEvents: "auto" }}>
                        <div
                            className="showcase-card"
                            data-active={i === active}
                            data-kind={it.kind}
                            onClick={() => setActive(i)}
                            data-cursor="view"
                        >
                            <CardBody item={it} idx={i} />
                        </div>
                    </Html>
                </group>
            ))}
            <CarouselConnectors items={items} getRefs={() => refs.current} />
        </group>
    );
}

/* ---------------------------------------------------------------------- */
/* DEPTH STACK: a receding coverflow, connected by a thin staircase line,
   with mouse-driven parallax on the whole stack.                         */
/* ---------------------------------------------------------------------- */
function StackConnectors({ items, active, n, getRefs }) {
    const railRef = useRef(null);
    const tickRef = useRef(null);
    useFrame(() => {
        const refs = getRefs();
        const order = items
            .map((_, i) => ({ i, rank: (i - active + n) % n }))
            .sort((a, b) => a.rank - b.rank);
        const rail = [];
        const ticks = [];
        order.forEach(({ i }) => {
            const g = refs[i];
            if (!g) return;
            rail.push(g.position.x, g.position.y + 1.7, g.position.z);
            ticks.push(g.position.x, g.position.y + 1.7, g.position.z, g.position.x, g.position.y + 0.56, g.position.z);
        });
        if (railRef.current && rail.length >= 6) {
            railRef.current.setAttribute("position", new THREE.BufferAttribute(new Float32Array(rail), 3));
            railRef.current.computeBoundingSphere();
        }
        if (tickRef.current && ticks.length >= 6) {
            tickRef.current.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ticks), 3));
            tickRef.current.computeBoundingSphere();
        }
    });
    return (
        <>
            <line frustumCulled={false}>
                <bufferGeometry ref={railRef} />
                <lineBasicMaterial color="#111110" transparent opacity={0.35} />
            </line>
            <lineSegments frustumCulled={false}>
                <bufferGeometry ref={tickRef} />
                <lineBasicMaterial color="#111110" transparent opacity={0.22} />
            </lineSegments>
        </>
    );
}

function StackScene({ items, active, setActive }) {
    const n = items.length;
    const spacing = 1.55;
    const sideOffset = 0.62;
    const refs = useRef([]);
    const parentRef = useRef(null);
    const { pointer } = useThree();

    useFrame((_, dt) => {
        if (parentRef.current) {
            parentRef.current.rotation.y = damp(parentRef.current.rotation.y, pointer.x * 0.14, 6, dt);
            parentRef.current.rotation.x = damp(parentRef.current.rotation.x, -pointer.y * 0.07, 6, dt);
        }
        items.forEach((_, i) => {
            const g = refs.current[i];
            if (!g) return;
            const rank = (i - active + n) % n;
            const tx = rank * sideOffset;
            const tz = -rank * spacing;
            const ts = Math.max(0.42, 1 - rank * 0.15);
            g.position.x = damp(g.position.x, tx, 6, dt);
            g.position.z = damp(g.position.z, tz, 6, dt);
            const s = damp(g.scale.x, ts, 6, dt);
            g.scale.setScalar(s);
        });
    });

    return (
        <group ref={parentRef}>
            {items.map((it, i) => (
                <group key={it.slug} ref={(el) => (refs.current[i] = el)}>
                    <Html center distanceFactor={9} style={{ pointerEvents: "auto" }}>
                        <div
                            className="showcase-card"
                            data-active={i === active}
                            data-kind={it.kind}
                            onClick={() => setActive(i)}
                            data-cursor="view"
                        >
                            <CardBody item={it} idx={i} />
                        </div>
                    </Html>
                </group>
            ))}
            <StackConnectors items={items} active={active} n={n} getRefs={() => refs.current} />
        </group>
    );
}

/* ---------------------------------------------------------------------- */
/* CONSTELLATION: a node graph around a hub; hover/select pulls a node
   forward, a docked panel (rendered by the stage) shows its detail so
   text stays legible regardless of depth.                               */
/* ---------------------------------------------------------------------- */
function ConstellationNode({ item, idx, position, active, onHover, onBlur, onSelect }) {
    const ref = useRef(null);
    useFrame((_, dt) => {
        if (!ref.current) return;
        const targetScale = active ? 1.55 : 1;
        const s = damp(ref.current.scale.x, targetScale, 7, dt);
        ref.current.scale.setScalar(s);
        const dir = position.clone().normalize();
        const pull = active ? 0.4 : 0;
        const target = position.clone().addScaledVector(dir, pull);
        ref.current.position.x = damp(ref.current.position.x, target.x, 6, dt);
        ref.current.position.y = damp(ref.current.position.y, target.y, 6, dt);
        ref.current.position.z = damp(ref.current.position.z, target.z, 6, dt);
    });
    return (
        <group ref={ref} position={position.toArray()}>
            {/* generous invisible hit target — the visible octahedron alone is a
                tiny, hard-to-land-on click area at this scale */}
            <mesh
                onPointerOver={(e) => {
                    e.stopPropagation();
                    onHover();
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    onBlur();
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
            >
                <sphereGeometry args={[0.34, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh>
                <octahedronGeometry args={[0.17, 0]} />
                <meshBasicMaterial color={active ? "#C7F651" : "#7A7566"} wireframe />
            </mesh>
            <Html center style={{ pointerEvents: "none" }}>
                <span className="showcase-node-label" data-active={active}>
                    {String(idx + 1).padStart(2, "0")}
                    {item.kind === "wip" ? " · wip" : ""}
                </span>
            </Html>
        </group>
    );
}

function ConstellationScene({ items, active, hover, setHover, setActive }) {
    const n = items.length;
    const radius = 2.55;
    const rotRef = useRef(null);
    const positions = useMemo(() => {
        const golden = Math.PI * (3 - Math.sqrt(5));
        return items.map((_, i) => {
            const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2;
            const rY = Math.sqrt(Math.max(0, 1 - y * y));
            const theta = golden * i;
            return new THREE.Vector3(Math.cos(theta) * rY, y * 0.72, Math.sin(theta) * rY).multiplyScalar(radius);
        });
    }, [items, n, radius]);

    useFrame((_, dt) => {
        if (rotRef.current) rotRef.current.rotation.y += dt * 0.045;
    });

    const selected = hover ?? active;

    return (
        <group ref={rotRef}>
            <mesh>
                <icosahedronGeometry args={[0.22, 0]} />
                <meshBasicMaterial color="#FF6B1A" wireframe />
            </mesh>
            {positions.map((p, i) => (
                <Line
                    key={`l${i}`}
                    points={[
                        [0, 0, 0],
                        [p.x, p.y, p.z],
                    ]}
                    color={selected === i ? "#111110" : "#7A7566"}
                    transparent
                    opacity={selected === i ? 0.6 : 0.22}
                />
            ))}
            {items.map((it, i) => (
                <ConstellationNode
                    key={it.slug}
                    item={it}
                    idx={i}
                    position={positions[i]}
                    active={selected === i}
                    onHover={() => setHover(i)}
                    onBlur={() => setHover((h) => (h === i ? null : h))}
                    onSelect={() => setActive(i)}
                />
            ))}
        </group>
    );
}

/* ---------------------------------------------------------------------- */
/* CORRIDOR: an exhibition hallway. Frames are fixed in world space,
   alternating left/right down a receding aisle, framed by a hairline
   floor/ceiling grid with a doorframe upright at each project. Advancing
   "active" slides the whole hallway toward the camera — the same optical
   result as dollying forward, without touching the shared CameraRig
   (which every variant relies on for its parallax + lookAt).            */
/* ---------------------------------------------------------------------- */
function CorridorGrid({ n, spacing, halfW }) {
    const geo = useMemo(() => {
        const z0 = 2.2;
        const zEnd = -(n - 1) * spacing - 2.2;
        const floorY = -1.05;
        const ceilY = 1.6;
        const verts = [];
        [-halfW, halfW].forEach((x) => {
            verts.push(x, floorY, z0, x, floorY, zEnd);
            verts.push(x, ceilY, z0, x, ceilY, zEnd);
        });
        for (let z = z0; z >= zEnd; z -= spacing / 2) {
            verts.push(-halfW, floorY, z, halfW, floorY, z);
            verts.push(-halfW, ceilY, z, halfW, ceilY, z);
        }
        for (let i = 0; i < n; i++) {
            const z = -i * spacing;
            [-halfW, halfW].forEach((x) => verts.push(x, floorY, z, x, ceilY, z));
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        return g;
    }, [n, spacing, halfW]);
    return (
        <lineSegments geometry={geo} frustumCulled={false}>
            <lineBasicMaterial color="#111110" transparent opacity={0.14} />
        </lineSegments>
    );
}

function CorridorScene({ items, active, setActive }) {
    const n = items.length;
    const spacing = 3.2;
    const groupRef = useRef(null);
    // The camera's fov is fixed but the frame's aspect swings hard between
    // desktop and phone portrait — a fixed world-space side offset that
    // clears the frustum on a 16:9 stage runs the active frame clean
    // off-screen on a narrow one, because the *card itself* stays a fixed
    // CSS-pixel size (it's Html) while the pixel budget either side of
    // center shrinks a lot. Project a unit offset to real pixels-per-world-
    // unit at the active frame's depth, then cap the offset so the (~300px)
    // card always clears the frame with room to spare.
    const { camera, size } = useThree();
    const [sideOffset, halfW] = useMemo(() => {
        const p0 = new THREE.Vector3(0, 0, 0).project(camera);
        const p1 = new THREE.Vector3(1, 0, 0).project(camera);
        const pxPerUnit = Math.max(1, Math.abs(p1.x - p0.x) * 0.5 * size.width);
        const maxOffsetPx = Math.max(36, size.width / 2 - 172);
        const offset = Math.min(2.75, maxOffsetPx / pxPerUnit);
        return [offset, offset + 0.7];
    }, [camera, size]);

    useFrame((_, dt) => {
        if (!groupRef.current) return;
        const targetZ = active * spacing;
        groupRef.current.position.z = damp(groupRef.current.position.z, targetZ, 5, dt);
    });

    return (
        <group ref={groupRef}>
            <CorridorGrid n={n} spacing={spacing} halfW={halfW} />
            {items.map((it, i) => {
                // Only mount frames near the walk-through point — with a
                // handful of projects rendering the whole hallway at once
                // just piles distant, tiny frames on top of each other near
                // the vanishing point (and behind the big active one).
                if (Math.abs(i - active) > 2) return null;
                const side = i % 2 === 0 ? -1 : 1;
                return (
                    <group key={it.slug} position={[side * sideOffset, 0.18, -i * spacing]}>
                        <Html center distanceFactor={9.6} style={{ pointerEvents: "auto" }}>
                            <div
                                className="showcase-card"
                                data-active={i === active}
                                data-kind={it.kind}
                                onClick={() => setActive(i)}
                                data-cursor="view"
                            >
                                <CardBody item={it} idx={i} />
                            </div>
                        </Html>
                    </group>
                );
            })}
        </group>
    );
}

/* ---------------------------------------------------------------------- */
/* EXPLODED LAYERS: the focused project's own fields burst into parallel
   planes receding in Z (a mechanical exploded-view read on a single
   "part"), tied back to a stepped leader line + a fixed core mark at the
   origin they emerge from. Swapping the active project keys a fresh
   instance, so it collapses back to the core and re-explodes.           */
/* ---------------------------------------------------------------------- */
const EXPLODE_LAYOUT = [
    { key: "head", y: 1.62, z: 1.35 },
    { key: "title", y: 0.7, z: 0.55 },
    { key: "tagline", y: -0.18, z: -0.25 },
    { key: "foot", y: -1.15, z: -1.15 },
];

function ExplodedCore() {
    const geo = useMemo(() => {
        const s = 0.14;
        const verts = [-s, 0, 0, s, 0, 0, 0, -s, 0, 0, s, 0, 0, 0, -s, 0, 0, s];
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        return g;
    }, []);
    return (
        <lineSegments geometry={geo} frustumCulled={false}>
            <lineBasicMaterial color="#FF6B1A" transparent opacity={0.5} />
        </lineSegments>
    );
}

function ExplodedConnectors({ getPositions }) {
    const railRef = useRef(null);
    const tickRef = useRef(null);
    const railX = -2.35;
    useFrame(() => {
        const pts = getPositions();
        if (!pts) return;
        const rail = [];
        const ticks = [];
        pts.forEach((p) => {
            rail.push(railX, p.y, p.z);
            ticks.push(railX, p.y, p.z, -1.3, p.y, p.z);
        });
        if (railRef.current && rail.length >= 6) {
            railRef.current.setAttribute("position", new THREE.BufferAttribute(new Float32Array(rail), 3));
            railRef.current.computeBoundingSphere();
        }
        if (tickRef.current && ticks.length >= 6) {
            tickRef.current.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ticks), 3));
            tickRef.current.computeBoundingSphere();
        }
    });
    return (
        <>
            <line frustumCulled={false}>
                <bufferGeometry ref={railRef} />
                <lineBasicMaterial color="#111110" transparent opacity={0.3} />
            </line>
            <lineSegments frustumCulled={false}>
                <bufferGeometry ref={tickRef} />
                <lineBasicMaterial color="#111110" transparent opacity={0.2} />
            </lineSegments>
        </>
    );
}

function ExplodedItem({ item, idx }) {
    const refs = useRef([]);
    const progress = useRef(0);

    useFrame((_, dt) => {
        progress.current = damp(progress.current, 1, 3, dt);
        EXPLODE_LAYOUT.forEach((layer, i) => {
            const g = refs.current[i];
            if (!g) return;
            g.position.y = layer.y * progress.current;
            g.position.z = layer.z * progress.current;
        });
    });

    const getPositions = () => {
        const pts = refs.current.map((g) => g && g.position);
        return pts.every(Boolean) ? pts : null;
    };

    return (
        <group>
            {EXPLODE_LAYOUT.map((layer, i) => (
                <group key={layer.key} ref={(el) => (refs.current[i] = el)}>
                    <Html center distanceFactor={8.2} style={{ pointerEvents: "none" }}>
                        {layer.key === "head" && (
                            <div className="showcase-exp-line ef-mono">
                                № {String(idx + 1).padStart(2, "0")} — {item.kind === "wip" ? "WIP" : item.year}
                            </div>
                        )}
                        {layer.key === "title" && <div className="showcase-exp-title">{item.title}</div>}
                        {layer.key === "tagline" && <p className="showcase-exp-tag">{item.tagline}</p>}
                        {layer.key === "foot" && (
                            <div className="showcase-exp-foot">
                                <ul className="showcase-exp-stack" aria-hidden>
                                    {(item.stack || []).slice(0, 4).map((s) => (
                                        <li key={s}>{s}</li>
                                    ))}
                                </ul>
                                {item.metric && (
                                    <div className="showcase-exp-metric">
                                        <strong>{item.metric.n}</strong>
                                        <em>{item.metric.l}</em>
                                    </div>
                                )}
                            </div>
                        )}
                    </Html>
                </group>
            ))}
            <ExplodedConnectors getPositions={getPositions} />
        </group>
    );
}

function ExplodedScene({ items, active, setActive }) {
    const n = items.length;
    const activeItem = items[active];
    return (
        <group>
            <ExplodedCore />
            <ExplodedItem key={activeItem.slug} item={activeItem} idx={active} />
            {items.map((it, i) => {
                const x = (i - (n - 1) / 2) * 0.42;
                const isActive = i === active;
                return (
                    <group key={it.slug} position={[x, -1.9, 2.5]}>
                        <mesh onClick={(e) => { e.stopPropagation(); setActive(i); }}>
                            <planeGeometry args={[0.3, 0.6]} />
                            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                        </mesh>
                        <lineSegments>
                            <bufferGeometry>
                                <bufferAttribute
                                    attach="attributes-position"
                                    count={2}
                                    array={new Float32Array([0, 0, 0, 0, isActive ? 0.22 : 0.1, 0])}
                                    itemSize={3}
                                />
                            </bufferGeometry>
                            <lineBasicMaterial color={isActive ? "#111110" : "#7A7566"} transparent opacity={isActive ? 0.9 : 0.35} />
                        </lineSegments>
                    </group>
                );
            })}
        </group>
    );
}

/* ---------------------------------------------------------------------- */
/* KINETIC TYPE: titles as the interface — a line of giant words you scrub
   through by bringing one to center. A hairline baseline with a tick per
   title gives it geometry; a docked panel (as in constellation) carries
   the tagline/stack since the type itself only ever shows a title. Kept
   as plain (non-rotated) DOM text — no CSS-3D rotation, so no risk of the
   mirrored-backface bug the flat cards would hit.                        */
/* ---------------------------------------------------------------------- */
function KineticScene({ items, active, setActive }) {
    const offsets = useMemo(() => {
        let acc = 0;
        return items.map((it) => {
            const w = Math.max(2.4, it.title.length * 0.5);
            const x = acc + w / 2;
            acc += w + 1.6;
            return x;
        });
    }, [items]);

    const groupRef = useRef(null);
    useFrame((_, dt) => {
        if (!groupRef.current) return;
        const targetX = -offsets[active];
        groupRef.current.position.x = damp(groupRef.current.position.x, targetX, 5, dt);
    });

    const baselineGeo = useMemo(() => {
        const first = offsets[0] ?? 0;
        const last = offsets[offsets.length - 1] ?? 0;
        const verts = [first - 2, -1.3, 0, last + 2, -1.3, 0];
        offsets.forEach((x) => verts.push(x, -1.3, 0, x, -1.02, 0));
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        return g;
    }, [offsets]);

    return (
        <group ref={groupRef}>
            <lineSegments geometry={baselineGeo} frustumCulled={false}>
                <lineBasicMaterial color="#111110" transparent opacity={0.22} />
            </lineSegments>
            {items.map((it, i) => (
                <group key={it.slug} position={[offsets[i], 0, 0]}>
                    <Html center distanceFactor={9.5} style={{ pointerEvents: "auto" }}>
                        <div
                            className="showcase-type"
                            data-active={i === active}
                            data-kind={it.kind}
                            onClick={() => setActive(i)}
                            data-cursor="view"
                        >
                            <span className="showcase-type-word">{it.title}</span>
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
}

/* ---------------------------------------------------------------------- */
/* Per-variant config + the shared stage. Each showcase-* experiment is a
   one-line wrapper: <ShowcaseStage variant="carousel" /> etc.           */
/* ---------------------------------------------------------------------- */
export const SHOWCASE_VARIANTS = {
    carousel: {
        idx: "01",
        label: "carousel",
        Scene: CarouselScene,
        nav: true,
        detail: false,
    },
    stack: {
        idx: "02",
        label: "depth stack",
        Scene: StackScene,
        nav: true,
        detail: false,
    },
    constellation: {
        idx: "03",
        label: "constellation",
        Scene: ConstellationScene,
        nav: false,
        detail: true,
        detailTitle: true,
        hint: "hover / click a node",
        hover: true,
    },
    corridor: {
        idx: "04",
        label: "corridor",
        Scene: CorridorScene,
        nav: true,
        detail: false,
    },
    exploded: {
        idx: "05",
        label: "exploded",
        Scene: ExplodedScene,
        nav: true,
        detail: false,
    },
    kinetic: {
        idx: "06",
        label: "kinetic type",
        Scene: KineticScene,
        nav: true,
        detail: true,
        detailWithNav: true,
    },
};

export function ShowcaseStage({ variant }) {
    const cfg = SHOWCASE_VARIANTS[variant];
    const items = useMemo(buildItems, []);
    const n = items.length;
    const [active, setActive] = useState(0);
    const [hover, setHover] = useState(null);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "ArrowRight") setActive((a) => (a + 1) % n);
            else if (e.key === "ArrowLeft") setActive((a) => (a - 1 + n) % n);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [n]);

    const detailItem = items[hover ?? active];
    const labStageHint = cfg.hint ?? (cfg.nav ? "←/→ select · click a card" : undefined);

    return (
        <LabStage
            idx={cfg.idx}
            title={`showcase — ${cfg.label}`}
            tag="showcase"
            hint={labStageHint}
        >
            <div className="showcase-root">
                <div className="showcase-hud showcase-hud-top">
                    <span className="ef-label showcase-variant-label">{cfg.label}</span>
                    <span className="ef-label showcase-variant-count">{n} projects</span>
                </div>

                {cfg.nav && (
                    <div className="showcase-hud showcase-nav">
                        <button
                            type="button"
                            aria-label="Previous project"
                            data-cursor="view"
                            onClick={() => setActive((a) => (a - 1 + n) % n)}
                        >
                            ‹
                        </button>
                        <span className="ef-mono showcase-nav-count">
                            {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                        </span>
                        <button
                            type="button"
                            aria-label="Next project"
                            data-cursor="view"
                            onClick={() => setActive((a) => (a + 1) % n)}
                        >
                            ›
                        </button>
                    </div>
                )}

                {cfg.detail && (
                    <div
                        className="showcase-hud showcase-detail"
                        data-visible={detailItem ? "true" : "false"}
                        data-with-nav={cfg.detailWithNav ? "true" : undefined}
                    >
                        {detailItem && (
                            <>
                                <span className="ef-mono">
                                    № {String((hover ?? active) + 1).padStart(2, "0")} —{" "}
                                    {detailItem.kind === "wip" ? "WIP" : detailItem.year}
                                </span>
                                {cfg.detailTitle && (
                                    <span className="showcase-detail-title">{detailItem.title}</span>
                                )}
                                <p className="showcase-detail-tag">{detailItem.tagline}</p>
                                <ul className="showcase-detail-stack" aria-hidden>
                                    {(detailItem.stack || []).slice(0, 5).map((s) => (
                                        <li key={s}>{s}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}

                <Canvas camera={{ position: [0, 0.75, 7.4], fov: 40 }} gl={{ antialias: true }}>
                    <color attach="background" args={["#EEEAE0"]} />
                    <CameraRig />
                    {variant === "carousel" && (
                        <CarouselScene items={items} active={active} setActive={setActive} />
                    )}
                    {variant === "stack" && (
                        <StackScene items={items} active={active} setActive={setActive} />
                    )}
                    {variant === "constellation" && (
                        <ConstellationScene
                            items={items}
                            active={active}
                            hover={hover}
                            setHover={setHover}
                            setActive={setActive}
                        />
                    )}
                    {variant === "corridor" && (
                        <CorridorScene items={items} active={active} setActive={setActive} />
                    )}
                    {variant === "exploded" && (
                        <ExplodedScene items={items} active={active} setActive={setActive} />
                    )}
                    {variant === "kinetic" && (
                        <KineticScene items={items} active={active} setActive={setActive} />
                    )}
                </Canvas>
            </div>
        </LabStage>
    );
}
