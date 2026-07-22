import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// The Work section's showcase, ported from the lab's "corridor" study
// (src/lab/experiments/showcase, variant 04): an exhibition hallway, frames
// fixed in world space alternating left/right down a receding aisle, a
// hairline floor/ceiling grid with a doorframe upright at each project.
//
// Unlike the lab study, `activeFloat` here is a *continuous* scroll-derived
// position (see Work.tsx) rather than a stepped index — the hallway tracks
// the scrollbar directly, this component just adds a light damp so input
// (wheel notches, touch, keyboard) always reads as one smooth glide.
//
// three.js is heavy, so this whole file is its own chunk — see Work.tsx,
// which lazy-imports it only once the section is near the viewport, exactly
// like SocialBlocks3D.tsx does for Contact.

const PAPER = "#EEEAE0";
const INK = "#111110";

const damp = THREE.MathUtils.damp;
const pad2 = (n: number) => String(n).padStart(2, "0");

function CorridorCard({
    item,
    idx,
    isActive,
    rank,
    nearFade,
    isMobile,
    onSelect,
}: {
    item: any;
    idx: number;
    isActive: boolean;
    rank: number;
    nearFade: number;
    isMobile: boolean;
    onSelect: (i: number) => void;
}) {
    // Fade by distance from the active card rather than a flat "on/off" —
    // lets more of the hallway render (see CorridorScene's windowRadius)
    // without the near neighbours drowning out the active one in overlap.
    // Mobile's lateral rail keeps neighbours spatially clear of the active
    // card (unlike the old near-centred stack this replaced), so they can
    // read at a genuinely visible opacity — enough to signal "there's more
    // either side" — while still falling off fast enough that by the
    // culling edge (CorridorScene's mobileWindowRadius) they've faded to
    // near-nothing.
    const base = isMobile ? 0.75 : 0.42;
    const step = isMobile ? 0.4 : 0.14;
    const depthFade = isActive ? 1 : Math.max(0.08, base - rank * step);
    // nearFade kills cards drifting between the camera and the active one —
    // Html scales as 1/distance, so without it they balloon off-screen.
    const opacity = depthFade * nearFade;
    return (
        <div
            className={`ef-work-corridor-card ef-tile--${item.tone || "outline"} ${
                isActive ? "is-active" : ""
            } ${item.kind === "wip" ? "is-wip" : ""}`}
            style={{ opacity }}
            data-cursor="view"
            data-cursor-label="View"
            onClick={() => onSelect(idx)}
        >
            <div className="ef-work-corridor-card-head ef-mono">
                <span>№ {pad2(idx + 1)}</span>
                <span>{item.kind === "wip" ? "WIP" : item.year}</span>
            </div>
            <h3 className="ef-work-corridor-card-title">{item.title}</h3>
            <p className="ef-work-corridor-card-tag">{item.tagline}</p>
            <ul className="ef-work-corridor-card-stack" aria-hidden>
                {(item.stack || []).slice(0, 4).map((s: string) => (
                    <li key={s}>{s}</li>
                ))}
            </ul>
            {item.metric && (
                <div className="ef-work-corridor-card-foot">
                    <strong>{item.metric.n}</strong>
                    <em>{item.metric.l}</em>
                </div>
            )}
        </div>
    );
}

/** Mobile's grid: a horizontal rail (not a receding hallway floor) — top and
 *  bottom hairlines running the length of the track, with a tick at each
 *  project's stop, like a ruler. Flat across the visible track, then bends
 *  away into depth past the first and last project — same "never a hard
 *  cut" language as CorridorGrid's RUN_IN/RUN_OUT, just curved into Z
 *  instead of continuing in a straight line, since there's no more lateral
 *  room to run it out in X. The bend outruns the mobile <fog>'s far plane
 *  (see WorkCorridor3D) so both ends dissolve into the page rather than
 *  stopping dead on the outer projects. */
function CorridorRail({ n, spacingX }: { n: number; spacingX: number }) {
    const geo = useMemo(() => {
        const z = -0.95;
        const floorY = -1.3;
        const ceilY = 1.15;
        const trackX0 = 0;
        const trackX1 = (n - 1) * spacingX;
        // How far outward (X) and how deep (Z) the bend runs. bendDepth is
        // picked so the deepest point's distance from the camera clears the
        // mobile fog's far plane (~15) with room to spare — see the <fog>
        // comment in WorkCorridor3D for the numbers this has to outrun.
        const bendRunX = spacingX * 2.2;
        const bendDepth = 9;
        const segs = 7;
        const bend = (t: number) => -bendDepth * t * t; // ease-in: flat near the track, steep further out
        const path: [number, number][] = [];
        for (let s = segs; s >= 1; s--) {
            const t = s / segs;
            path.push([trackX0 - t * bendRunX, z + bend(t)]);
        }
        path.push([trackX0, z]);
        path.push([trackX1, z]);
        for (let s = 1; s <= segs; s++) {
            const t = s / segs;
            path.push([trackX1 + t * bendRunX, z + bend(t)]);
        }
        const verts: number[] = [];
        [floorY, ceilY].forEach((y) => {
            for (let i = 0; i < path.length - 1; i++) {
                const [x0, z0] = path[i];
                const [x1, z1] = path[i + 1];
                verts.push(x0, y, z0, x1, y, z1);
            }
        });
        for (let i = 0; i < n; i++) {
            const x = i * spacingX;
            verts.push(x, floorY, z, x, ceilY, z);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        return g;
    }, [n, spacingX]);
    return (
        <lineSegments geometry={geo} frustumCulled={false}>
            <lineBasicMaterial color={INK} transparent opacity={0.14} />
        </lineSegments>
    );
}

/** Hairline floor/ceiling rails + a doorframe upright at each project depth. */
function CorridorGrid({
    n,
    spacing,
    halfW,
}: {
    n: number;
    spacing: number;
    halfW: number;
}) {
    const geo = useMemo(() => {
        // Run the rails well past the first and last project at both ends so
        // the hallway never visibly terminates. The far end is dissolved into
        // the paper by the scene fog (see WorkCorridor3D's <fog>), the near
        // end simply runs behind the camera — between them the corridor reads
        // as endless in both directions instead of stopping dead on the
        // outer projects.
        const RUN_IN = 5 * spacing; // behind the camera at project 0
        const RUN_OUT = 7 * spacing; // beyond the last project, into the fog
        const z0 = 2.2 + RUN_IN;
        const zEnd = -(n - 1) * spacing - 2.2 - RUN_OUT;
        const floorY = -1.05;
        const ceilY = 1.6;
        const verts: number[] = [];
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
            <lineBasicMaterial color={INK} transparent opacity={0.14} />
        </lineSegments>
    );
}

/** A small, constant pointer parallax on the camera — muted on mobile, where
 *  a touch drag is a scroll gesture, not a look-around one. */
function CameraRig({ intensity = 1 }: { intensity?: number }) {
    const { camera, pointer } = useThree();
    const base = useRef<THREE.Vector3 | null>(null);
    if (base.current === null) base.current = camera.position.clone();
    useFrame((_, dt) => {
        const b = base.current!;
        camera.position.x = damp(camera.position.x, b.x + pointer.x * 0.45 * intensity, 5, dt);
        camera.position.y = damp(camera.position.y, b.y - pointer.y * 0.28 * intensity, 5, dt);
        camera.lookAt(0, 0, 0);
    });
    return null;
}

function CorridorScene({
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
    const n = items.length;
    const spacing = isMobile ? 2.6 : 3.2;
    const groupRef = useRef<THREE.Group>(null);

    // The camera's fov is fixed but the frame's aspect swings hard between
    // desktop and phone portrait — a fixed world-space side offset that
    // clears the frustum on a 16:9 stage runs the active frame clean off-
    // screen on a narrow one, because the *card itself* stays a fixed CSS-
    // pixel size (it's Html) while the pixel budget either side of center
    // shrinks a lot. Project a unit offset to real pixels-per-world-unit at
    // the active frame's depth, then cap the offset so the card always
    // clears the frame with room to spare. On mobile the cap is pulled in
    // hard on top of that — frames read as "centred with a hint of aisle",
    // not "swinging to the edges" the way desktop's do.
    const { camera, size } = useThree();
    const [sideOffset, halfW] = useMemo(() => {
        const p0 = new THREE.Vector3(0, 0, 0).project(camera);
        const p1 = new THREE.Vector3(1, 0, 0).project(camera);
        const pxPerUnit = Math.max(1, Math.abs(p1.x - p0.x) * 0.5 * size.width);
        const maxOffsetPx = isMobile ? 16 : Math.max(32, size.width / 2 - 340);
        // On a typical desktop frame the px budget is generous enough that
        // `cap` is what actually binds — it sets how far the aisle swings.
        // Kept fairly tight: wide swings push the frames out toward the
        // viewport edges and the hallway stops reading as one corridor.
        const cap = isMobile ? 0.48 : 1.45;
        const offset = Math.min(cap, maxOffsetPx / pxPerUnit);
        return [offset, offset + (isMobile ? 0.42 : 0.55)];
    }, [camera, size, isMobile]);

    // Mobile only: a portrait viewport has no room for an aisle (see the
    // sideOffset comment above — that's why its cap is pulled in to 0.48),
    // so instead of a depth corridor the cards run along a horizontal rail
    // and the group translates on X instead of Z. Distance from camera to
    // every card stays essentially constant either way (they sit near the
    // same Z), so unlike the depth version there's no near-camera ballooning
    // to cull — a card drifting to the side moves *away* from the camera
    // (Euclidean distance grows), never toward it, so Html's 1/distance
    // scaling only ever shrinks off-centre cards, it can't blow them up.
    // The slot distance is derived from real pixels so the active card
    // always sits centred with a fixed, deliberate sliver of its neighbour
    // showing at each edge, on any phone width.
    const spacingX = useMemo(() => {
        if (!isMobile) return 0;
        const p0 = new THREE.Vector3(0, 0, 0).project(camera);
        const p1 = new THREE.Vector3(1, 0, 0).project(camera);
        const pxPerUnit = Math.max(1, Math.abs(p1.x - p0.x) * 0.5 * size.width);
        // Half the card's *rendered* width in real screen px — not its CSS
        // width. Html (non-transform mode) scales the DOM node by
        // objectScale(distance) * distanceFactor (see Html.js), a factor
        // that depends only on the fixed fov/distance/distanceFactor below,
        // never on viewport size — so it's a genuine constant here, measured
        // on-screen (~1.43) rather than assumed, and it's applied to the
        // same min(72vw, 252px) the card's CSS actually uses.
        const cssHalfWidthPx = Math.min(0.72 * size.width, 252) / 2;
        const renderScale = 1.43;
        const cardHalfWidthPx = cssHalfWidthPx * renderScale;
        const peekPx = 26; // how much of the neighbour peeks past the edge
        const slotPx = size.width / 2 + cardHalfWidthPx - peekPx;
        return slotPx / pxPerUnit;
    }, [camera, size, isMobile]);

    useFrame((_, dt) => {
        if (!groupRef.current) return;
        if (isMobile) {
            const targetX = -activeFloat * spacingX;
            groupRef.current.position.x = damp(groupRef.current.position.x, targetX, 8, dt);
        } else {
            const targetZ = activeFloat * spacing;
            groupRef.current.position.z = damp(groupRef.current.position.z, targetZ, 8, dt);
        }
    });

    const activeIndex = Math.round(activeFloat);
    // How many frames render either side of the active one — generous, so
    // the hallway visibly recedes into the distance instead of cutting off
    // right past the neighbours. Per-rank opacity (in CorridorCard) is what
    // actually keeps it legible, not this cull.
    const windowRadius = 3;
    // How far a card may drift past the active plane toward the camera before
    // it's culled. Kept small: by d = -1 it already renders ~1.8x size.
    // Tighter on mobile, where the viewport can't absorb the extra width.
    const NEAR_CULL = isMobile ? 0.4 : 0.6;
    // Mobile's per-rank opacity (see CorridorCard) already reaches its floor
    // by ~rank 1.4, so anything past that is invisible — cull it there
    // rather than at the desktop hallway's much deeper windowRadius.
    const mobileWindowRadius = 1.6;

    return (
        <group ref={groupRef}>
            {isMobile ? (
                <CorridorRail n={n} spacingX={spacingX} />
            ) : (
                <CorridorGrid n={n} spacing={spacing} halfW={halfW} />
            )}
            {items.map((it, i) => {
                if (isMobile) {
                    const d = i - activeFloat;
                    const rank = Math.abs(d);
                    if (rank > mobileWindowRadius) return null;
                    // A shallow, one-directional recede (always away from the
                    // camera, never toward it) — side cards sit a touch
                    // further back and read a touch smaller, like a gently
                    // curved gallery wall, without any of the near-camera
                    // ballooning risk the depth corridor has to guard against.
                    const recede = Math.min(0.6, rank * 0.35);
                    return (
                        <group key={it.slug} position={[i * spacingX, -0.08, -recede]}>
                            <Html center distanceFactor={8.8} style={{ pointerEvents: "auto" }}>
                                <CorridorCard item={it} idx={i} isActive={i === activeIndex} rank={rank} nearFade={1} isMobile={isMobile} onSelect={onSelect} />
                            </Html>
                        </group>
                    );
                }
                // Signed, not absolute: the group translates toward the camera
                // as activeFloat grows, so a card with d < 0 sits BETWEEN the
                // camera and the active card. Html scales as 1/distance, so
                // those balloon (at d = -2 the card renders ~4x size and spills
                // off-screen). Cull them early and fade them out on approach.
                const d = i - activeFloat;
                if (d < -NEAR_CULL || d > windowRadius + 0.5) return null;
                const nearFade = d < 0 ? Math.max(0, 1 + d / NEAR_CULL) : 1;
                const rank = Math.max(0, d);
                const side = i % 2 === 0 ? -1 : 1;
                return (
                    <group key={it.slug} position={[side * sideOffset, isMobile ? -0.08 : 0.18, -i * spacing]}>
                        <Html center distanceFactor={isMobile ? 8.8 : 9.6} style={{ pointerEvents: "auto" }}>
                            <CorridorCard item={it} idx={i} isActive={i === activeIndex} rank={rank} nearFade={nearFade} isMobile={isMobile} onSelect={onSelect} />
                        </Html>
                    </group>
                );
            })}
        </group>
    );
}

export default function WorkCorridor3D({
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
    return (
        <Canvas
            className="ef-work-corridor-canvas"
            camera={{ position: [0, isMobile ? 0.3 : 0.75, isMobile ? 8.4 : 8.6], fov: isMobile ? 42 : 40 }}
            gl={{ antialias: true }}
            dpr={[1, 2]}
        >
            {/* No scene background: the canvas is transparent (r3f's default
                `alpha` is already true) so the stage backdrop — the "work."
                wordmark and the section's ambient line field, both painted
                in plain DOM beneath this canvas, see Work.tsx — shows
                through it. .ef-work-stage keeps a paper fill of its own so
                the corridor still reads as sitting on paper. */}
            {/* Fogged to the exact paper colour, starting just past the
                active frame: the rails dissolve toward it instead of ending
                on a hard line, which is what sells the hallway (and, on
                mobile, the lateral rail) as endless. Pairs with
                CorridorGrid's RUN_OUT / CorridorRail's bend — the geometry
                has to outrun the fog's far plane or the cut reappears.
                Mobile's far plane is much closer than desktop's because its
                "endless" cue is a Z-bend at each end rather than a long
                straight run — see CorridorRail's bendDepth comment. */}
            <fog attach="fog" args={[PAPER, isMobile ? 9 : 11, isMobile ? 15 : 30]} />
            <CameraRig intensity={isMobile ? 0.3 : 1} />
            <CorridorScene items={items} activeFloat={activeFloat} isMobile={isMobile} onSelect={onSelect} />
        </Canvas>
    );
}
