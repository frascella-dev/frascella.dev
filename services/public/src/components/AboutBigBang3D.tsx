import { Fragment, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

// The About section's timeline, staged as the "big bang" reading ported from
// the lab's bigbang experiment (variant 01 / vortex — see
// src/lab/experiments/bigbang/experiment.tsx, which stays dev-only; nothing
// here imports it). Real data only: `items` is src/data/timeline.ts as
// handed down by About.tsx, no invented flavour fields.
//
// The vortex's own centre (the origin — "the big bang itself is his birth")
// stays locked to the centre of the screen at all times: the camera always
// looks at (0,0,0), never at whichever entry happens to be active. Scroll
// drives the camera's dolly distance and its orbital bearing around that
// fixed centre — zoom and rotation, both pure functions of the same
// scroll-derived `activeFloat` (see About.tsx, computed exactly the way
// Work.tsx computes it for its corridor) — and nothing else. The active
// entry is identified by weight (scale/opacity/a thin halo ring), never by
// parking the camera on it, so it's free to swing anywhere in frame,
// including out of it, as the vortex turns.
//
// There is no OrbitControls and no wheel-jacking. A small pointer parallax
// (ported from WorkCorridor3D's CameraRig) is the only thing that answers
// the mouse, and it's nowhere near enough to let a visitor actually orbit or
// tilt the scene.
//
// three.js is heavy, so this whole file is its own chunk — see About.tsx,
// which lazy-imports it only once the section is near the viewport, exactly
// like WorkCorridor3D.tsx / SocialBlocks3D.tsx do for their sections. The
// canvas itself is transparent (no `<color attach="background">`, `gl={{
// alpha: true }}`) so About.tsx's own `BigBangField` ambient backdrop —
// painted on the sticky stage underneath — shows through it, the same
// arrangement Work.tsx uses for its corridor.

const INK = "#111110";
const ACCENT = "#FF6B1A";
const ACCENT_2 = "#C7F651";
const PAPER = "#EEEAE0"; // fog target only — the canvas itself has no fill

const R_MIN = 0.42;
const R_MAX = 6.4;
// Turns the spiral arm winds through, singularity to edge — also literally
// how many times the camera orbits the fixed centre over the full scroll
// range, since its bearing tracks this same angle (see the useFrame below).
const TURNS = 1.15;
// Camera dolly distance *from the origin*, which is always what's looked
// at: tight on the centre at 2000, opening outward as the spiral itself
// grows, so the whole structure is in view by 2026.
const MIN_DIST = 1.5;
const MAX_DIST = 15.5;
// In activeFloat units (index space) — how wide the "in focus" window around
// the active node is for the scale/opacity/halo easing below.
const FOCUS_WINDOW = 0.62;

const damp = THREE.MathUtils.damp;

function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
}
function radiusAtT(t: number) {
    return R_MIN + (R_MAX - R_MIN) * easeOutCubic(t);
}
function angleAtT(t: number) {
    return t * TURNS * Math.PI * 2;
}
function heightAtT(t: number) {
    return Math.sin(t * Math.PI * 5) * 0.2 * (1 - t * 0.6);
}
function spinePoint(t: number) {
    const r = radiusAtT(t);
    const a = angleAtT(t);
    return new THREE.Vector3(Math.cos(a) * r, heightAtT(t), Math.sin(a) * r);
}
function ringPoints(radius: number, segments = 64) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
}
// A unit circle, computed once — per-node "focus" rings and the scroll-depth
// ring are all this same set of points, just scaled per frame via a group
// transform. Scaling a transform is cheap; rebuilding line geometry every
// frame is not, and nothing here needs to.
const UNIT_RING_PTS = ringPoints(1, 40);

// Camera elevation — nothing pointer- or drag-driven ever changes this: it's
// a fixed constant, and the only other camera input is scroll (see the
// useFrame in VortexGroup). Deliberately low/lateral rather than top-down —
// a side-on view of the spiral reads the turns and the height wobble as real
// depth, where a near-overhead one flattens them into a plan view. Mobile
// sits a touch lower still (a narrow portrait frame has no lateral room to
// spare, so it leans on height instead). Same `isMobile` breakpoint Work.tsx
// uses (see About.tsx).
function cameraTuning(isMobile: boolean) {
    if (isMobile) return { elev: (22 * Math.PI) / 180 };
    return { elev: (28 * Math.PI) / 180 };
}

// nodes[i].t is a *remapped* fraction: 0 at the first timeline entry, 1 at
// the last, so the spiral's own singularity (t=0, r=R_MIN) lands exactly on
// the earliest entry — "the big bang itself is his birth" (spec) — instead
// of on some point before the recorded data, as the lab's raw fractions do.
function buildNodes(items: any[]) {
    const first = items[0]?.fraction ?? 0;
    const last = items[items.length - 1]?.fraction ?? 1;
    const span = last - first || 1;
    return items.map((entry, i) => {
        const t = (entry.fraction - first) / span;
        const color = entry.kind === "now" ? ACCENT : i === 0 ? ACCENT_2 : INK;
        return { ...entry, t, pos: spinePoint(t) as THREE.Vector3, color };
    });
}

// Continuous t for a given scroll position: activeFloat is an index-space
// float (0..n-1, same shape as WorkCorridor3D's activeFloat), linearly
// interpolated between each pair of nodes' own t — so a screen of scroll
// between two widely-spaced years travels further along the spiral than one
// between two close years, same as the source timeline's real pacing.
function tAtFloat(activeFloat: number, nodes: any[]) {
    const n = nodes.length;
    if (n < 2) return 0;
    const i = Math.max(0, Math.min(n - 2, Math.floor(activeFloat)));
    const frac = Math.max(0, Math.min(1, activeFloat - i));
    const a = nodes[i].t;
    const b = nodes[i + 1].t;
    return a + (b - a) * frac;
}

function Spine({ steps }: { steps: number }) {
    const points = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= steps; i++) pts.push(spinePoint(i / steps));
        return pts;
    }, [steps]);
    return (
        <Line
            points={points}
            color={INK}
            lineWidth={1}
            dashed
            dashSize={0.05}
            gapSize={0.09}
            transparent
            opacity={0.4}
            raycast={() => null}
        />
    );
}

function Shells({ nodes }: { nodes: any[] }) {
    return (
        <>
            {nodes.map((n) => (
                <Line
                    key={n.id}
                    points={ringPoints(radiusAtT(n.t))}
                    color={INK}
                    lineWidth={1}
                    transparent
                    opacity={0.13}
                    raycast={() => null}
                />
            ))}
        </>
    );
}

// Ambient field: points drifting outward from the singularity along three
// spiral arms (one shadows the real data arm), looping back to the core —
// a slow, continuous "the universe (a life) keeps expanding". Rendered as
// small square points (three.js's native point sprite shape) — the same
// abstract-square vocabulary the rest of the site uses (.ef-rect etc.), not
// a soft dust texture.
function AmbientField({ count }: { count: number }) {
    const geoRef = useRef<THREE.BufferGeometry>(null);
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
        const arr = posAttr.array as Float32Array;
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

// A small hairline cross at the world origin — the singularity landmark,
// echoing About's own `.ef-a-cross` decorative motif (a line-cross with a
// small dot at the centre) rather than a filled, glowing sphere.
// Unit-sized geometry — like NodeMarker, this is scaled every frame by the
// camera's current distance from it (VortexGroup's useFrame), so the
// landmark stays a small, constant screen size whether the camera is 1.5 or
// 15 units away, instead of shrinking to nothing as it dollies out.
const ORIGIN_ARM_X = [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)];
const ORIGIN_ARM_Z = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1)];

function OriginMark({ pulseRef }: { pulseRef: React.MutableRefObject<THREE.Group | null> }) {
    return (
        <group ref={pulseRef}>
            <Line points={ORIGIN_ARM_X} color={ACCENT_2} lineWidth={1} transparent opacity={0.8} raycast={() => null} />
            <Line points={ORIGIN_ARM_Z} color={ACCENT_2} lineWidth={1} transparent opacity={0.8} raycast={() => null} />
            <mesh raycast={() => null}>
                <sphereGeometry args={[0.13, 8, 8]} />
                <meshBasicMaterial color={ACCENT_2} transparent opacity={0.9} />
            </mesh>
        </group>
    );
}

// The "current depth" reference — a hairline, dashed circle at the exact
// radius the scroll position is at right now (radiusAtT(t)), always
// centred on the origin. A thin scaled Line, not a filled ring mesh — it
// reads as one more concentric hairline among the Shells, not a solid band.
function DepthRing({ ringRef }: { ringRef: React.MutableRefObject<THREE.Group | null> }) {
    return (
        <group ref={ringRef}>
            <Line
                points={UNIT_RING_PTS}
                color={ACCENT}
                lineWidth={1}
                dashed
                dashSize={0.05}
                gapSize={0.055}
                transparent
                opacity={0.32}
                raycast={() => null}
            />
        </group>
    );
}

function NodeMarker({
    node,
    index,
    nodeRefsRef,
    onSelect,
}: {
    node: any;
    index: number;
    nodeRefsRef: React.MutableRefObject<any[]>;
    onSelect: (i: number) => void;
}) {
    const setMeshRef = (el: any) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), mesh: el };
    };
    const setRingRef = (el: any) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), ring: el };
    };
    const setHitRef = (el: any) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), hit: el };
    };
    const setLabelRef = (el: any) => {
        const arr = nodeRefsRef.current;
        arr[index] = { ...(arr[index] || {}), label: el };
    };

    return (
        <group position={node.pos}>
            {/* All three geometries below are unit-radius (1) — the camera
                dollies from very close (2000) to very far (2026), and a
                fixed *world-space* radius would look like a precise mark at
                one end and a blob swallowing the screen at the other (this
                was, in fact, exactly the bug). Scaled every frame by this
                node's own current distance to the camera instead (see
                VortexGroup's useFrame), so each keeps a small, constant
                *screen* size throughout — the same principle drei's <Html>
                already gets for free for the year label below. */}
            <mesh
                ref={setHitRef}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(index);
                }}
            >
                <sphereGeometry args={[1, 10, 10]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {/* small, constant-ish dot — a precise mark, not a blob that
                balloons with focus (see the eased scale in VortexGroup) */}
            <mesh ref={setMeshRef} raycast={() => null}>
                <sphereGeometry args={[1, 12, 12]} />
                <meshBasicMaterial color={node.color} transparent opacity={0.55} />
            </mesh>
            {/* thin halo ring, echoing the site's own dot+ring hover idiom
                (.ef-tl-dot-ring / .ef-dot-live) — grows in around the dot
                only once it's the active entry, instead of scaling the dot
                itself up into a glow */}
            <Line
                ref={setRingRef}
                points={UNIT_RING_PTS}
                color={node.color}
                lineWidth={1}
                transparent
                opacity={0}
                raycast={() => null}
            />
            <Html center>
                <div ref={setLabelRef} className="ef-bb-node-label">
                    <span className="ef-bb-node-year">{node.year}</span>
                </div>
            </Html>
        </group>
    );
}

function VortexGroup({
    nodes,
    activeFloat,
    isMobile,
    onSelect,
}: {
    nodes: any[];
    activeFloat: number;
    isMobile: boolean;
    onSelect: (i: number) => void;
}) {
    const nodeRefsRef = useRef<any[]>([]);
    const originRef = useRef<THREE.Group>(null);
    const depthRingRef = useRef<THREE.Group>(null);
    const smtRef = useRef(0);
    const parallax = useRef(new THREE.Vector2(0, 0));
    const { camera, pointer } = useThree();
    const { elev } = useMemo(() => cameraTuning(isMobile), [isMobile]);

    useFrame((state, dt) => {
        const targetT = tAtFloat(activeFloat, nodes);
        // Damped, not read raw — activeFloat updates on the window `scroll`
        // event (see About.tsx), which can arrive in coarser steps than a
        // render frame; damping here is what makes the dolly/orbit read as
        // one continuous glide instead of ticking in scroll-event-sized
        // steps (same role WorkCorridor3D's per-frame `damp` plays).
        smtRef.current = damp(smtRef.current, targetT, 7, dt);
        const t = smtRef.current;

        // The camera always looks at the origin — the vortex's own centre
        // stays locked to the centre of the screen at every scroll position.
        // Its bearing around that centre (az) and its distance from it
        // (dist) are both pure functions of t: scroll drives zoom and
        // rotation about a fixed point, nothing chases any particular
        // entry. Which entry is "active" is read off scale/opacity/the halo
        // ring below, not off where the camera happens to be pointed.
        const dist = MIN_DIST + t * (MAX_DIST - MIN_DIST);
        const az = angleAtT(t);
        const cosE = Math.cos(elev);
        const sinE = Math.sin(elev);

        // Small passive parallax only — no drag-to-orbit, no tilt the user
        // can touch. Muted hard on mobile, where a touch drag is a scroll
        // gesture, not a look-around one (same reasoning as
        // WorkCorridor3D's CameraRig).
        const intensity = isMobile ? 0.1 : 0.4;
        parallax.current.x = damp(
            parallax.current.x,
            pointer.x * 0.35 * intensity,
            5,
            dt,
        );
        parallax.current.y = damp(
            parallax.current.y,
            pointer.y * 0.22 * intensity,
            5,
            dt,
        );

        camera.position.set(
            dist * cosE * Math.cos(az) + parallax.current.x,
            dist * sinE + parallax.current.y,
            dist * cosE * Math.sin(az),
        );
        camera.lookAt(0, 0, 0);

        nodes.forEach((n, i) => {
            const d = Math.abs(i - activeFloat);
            const amt = 1 - Math.min(1, d / FOCUS_WINDOW);
            const eased = amt * amt * (3 - 2 * amt);
            const refs = nodeRefsRef.current[i];
            // Constant *screen* size, not world size — see the comment on
            // NodeMarker. camDist swings from ~1 (2000, right up close) to
            // >15 (2026); a fixed world radius would be a pinprick at one
            // end and swallow the frame at the other.
            const camDist = camera.position.distanceTo(n.pos);
            if (refs?.mesh) {
                refs.mesh.scale.setScalar(camDist * (0.008 + eased * 0.006));
                refs.mesh.material.opacity = 0.4 + eased * 0.5;
            }
            if (refs?.hit) {
                refs.hit.scale.setScalar(camDist * 0.09);
            }
            if (refs?.ring) {
                refs.ring.scale.setScalar(camDist * (0.012 + eased * 0.022));
                refs.ring.material.opacity = eased * 0.6;
            }
            if (refs?.label) {
                refs.label.style.opacity = String(0.4 + eased * 0.6);
                refs.label.style.color =
                    eased > 0.55 ? n.color : "var(--ink-mute)";
                refs.label.style.transform = `translateY(-16px) scale(${0.88 + eased * 0.2})`;
            }
        });

        if (depthRingRef.current) {
            const r = radiusAtT(t);
            depthRingRef.current.scale.set(r, r, 1);
        }
        if (originRef.current) {
            // Same constant-screen-size treatment as the node markers — the
            // origin has to stay legibly sized whether the camera is 1.5 or
            // 15 units away from it, which is exactly `dist` here.
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.16;
            originRef.current.scale.setScalar(dist * 0.017 * pulse);
        }
    });

    return (
        <group>
            <Spine steps={isMobile ? 150 : 240} />
            <Shells nodes={nodes} />
            <AmbientField count={isMobile ? 550 : 1600} />
            <DepthRing ringRef={depthRingRef} />
            <OriginMark pulseRef={originRef} />

            {nodes.map((node, i) => (
                <NodeMarker
                    key={node.id}
                    node={node}
                    index={i}
                    nodeRefsRef={nodeRefsRef}
                    onSelect={onSelect}
                />
            ))}
        </group>
    );
}

// A continuously-interpolated year, between whichever two entries the
// current scroll position sits — this is deliberately *not* the same number
// as the story panel's (which snaps to the nearest entry): the epoch datum
// reads as a live counter ticking through history as you scroll, while the
// story below tells whichever entry you've settled on. They're allowed to
// differ mid-scroll; they agree once you stop (the datum settles on the
// same year the story is telling).
function yearLabelAtFloat(nodes: any[], af: number) {
    const n = nodes.length;
    if (n === 0) return "";
    if (af <= 0) return String(nodes[0].year);
    if (af >= n - 1) return String(nodes[n - 1].year);
    const i = Math.floor(af);
    const frac = af - i;
    const a = nodes[i];
    const b = nodes[Math.min(n - 1, i + 1)];
    return String(Math.round(a.year + (b.year - a.year) * frac));
}

// The current epoch — a small, persistent, continuously-ticking readout.
// Positioned clear of the fixed nav (see about-bigbang.css).
function EpochDatum({ year }: { year: number | string }) {
    return (
        <div className="ef-bb-epoch" aria-hidden>
            <span className="ef-label">epoch</span>
            <span className="ef-mono ef-bb-epoch-year">{year}</span>
        </div>
    );
}

// The active entry's title + body, told rather than displayed: the title
// and kind arrive quickly, then the body unfolds word by word as the scroll
// position moves through this entry's own screen, reaching full reveal by
// the moment it's centred (dead scroll-stop) — so a touch reader who simply
// stops scrolling always lands on the complete text, no hover required.
// Scrolling back out simply un-reveals it — it's a pure function of
// position, nothing plays on a timer. Every word is always in the DOM (only
// opacity/transform animate), so the block's height never changes as the
// reveal progresses; a min-height (about-bigbang.css) covers the small
// natural variance between entries so switching entries doesn't jump either.
function StoryReveal({ item, reveal }: { item: any; reveal: number }) {
    const words = useMemo(() => item.body.split(" "), [item.body]);
    const headReveal = Math.max(0, Math.min(1, reveal * 3.2));
    return (
        <div className="ef-bb-story" key={item.id}>
            <span
                className="ef-mono ef-bb-story-kind"
                style={{ opacity: 0.5 + headReveal * 0.5 }}
            >
                {item.kind}
            </span>
            <h4
                className="ef-bb-story-title"
                style={{
                    opacity: headReveal,
                    transform: `translateY(${(1 - headReveal) * 6}px)`,
                }}
            >
                {item.title}
            </h4>
            <p className="ef-bb-story-body">
                {words.map((w: string, i: number) => {
                    const wp = words.length <= 1 ? 0 : i / (words.length - 1);
                    // Each word's own transition spans `band` of the reveal
                    // range, staggered by position (wp) — so the wavefront
                    // sweeps left to right as reveal goes 0→1, and *every*
                    // word (not just the first) is fully lit by reveal===1.
                    const band = 0.4;
                    const threshold = wp * (1 - band);
                    const amt = Math.max(0, Math.min(1, (reveal - threshold) / band));
                    return (
                        // The space is a sibling *outside* the span, not a
                        // trailing character inside it — an inline-block's
                        // own trailing whitespace gets trimmed to nothing
                        // (it establishes its own little formatting context),
                        // which is exactly what glued every word together.
                        <Fragment key={i}>
                            <span
                                className="ef-bb-story-word"
                                style={{
                                    opacity: 0.16 + amt * 0.84,
                                    transform: `translateY(${(1 - amt) * 5}px)`,
                                }}
                            >
                                {w}
                            </span>{" "}
                        </Fragment>
                    );
                })}
            </p>
        </div>
    );
}

export default function AboutBigBang3D({
    items,
    activeFloat,
    isMobile,
    onSelect,
}: {
    items: any[];
    activeFloat: number;
    isMobile: boolean;
    onSelect: (i: number) => void;
}) {
    const nodes = useMemo(() => buildNodes(items), [items]);
    const n = items.length;
    const activeIndex = Math.max(0, Math.min(n - 1, Math.round(activeFloat)));
    const activeItem = items[activeIndex] ?? null;
    // Reveal window for the active entry: 0 the moment its dedicated screen
    // begins (activeFloat === activeIndex - 0.5), 1 by the time scroll rests
    // dead-centre on it (activeFloat === activeIndex) — and clamped there
    // for the rest of its dwell, so leaving it towards the next entry never
    // un-tells a story already fully told.
    const reveal = Math.max(0, Math.min(1, (activeFloat - (activeIndex - 0.5)) / 0.5));
    const epochYear = useMemo(
        () => yearLabelAtFloat(nodes, activeFloat),
        [nodes, activeFloat],
    );

    const initialCamPos = useMemo(() => {
        // t=0 → az = angleAtT(0) === 0, so this matches the useFrame formula
        // below exactly (the very first frame is not a jump-cut).
        const { elev } = cameraTuning(isMobile);
        const cosE = Math.cos(elev);
        return [MIN_DIST * cosE, MIN_DIST * Math.sin(elev), 0] as [
            number,
            number,
            number,
        ];
    }, [isMobile]);

    return (
        <div className="ef-bb-scene">
            <Canvas
                className="ef-bb-canvas"
                camera={{
                    position: initialCamPos,
                    fov: isMobile ? 46 : 42,
                }}
                gl={{ alpha: true, antialias: !isMobile }}
                dpr={isMobile ? [1, 1.5] : [1, 1.75]}
            >
                {/* No <color attach="background"> — the canvas is
                    transparent so About.tsx's BigBangField ambient backdrop
                    (painted on the sticky stage underneath) shows through,
                    the same arrangement Work.tsx uses for its corridor. */}
                <fog
                    attach="fog"
                    args={[PAPER, isMobile ? 8 : 10, isMobile ? 17 : 24]}
                />
                <VortexGroup
                    nodes={nodes}
                    activeFloat={activeFloat}
                    isMobile={isMobile}
                    onSelect={onSelect}
                />
            </Canvas>

            {activeItem && (
                <EpochDatum year={epochYear} />
            )}
            {activeItem && <StoryReveal item={activeItem} reveal={reveal} />}
        </div>
    );
}
