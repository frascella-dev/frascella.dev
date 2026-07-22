import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

// The contact-section social links as wireframe cubes with the brand mark
// extruded inside. Loaded lazily (see Contact.tsx) so three.js never lands in
// the main bundle — it's fetched only when the contact section comes into view.
//
// The section sits on --ink, so the palette is inverted from the lab study:
// paper lines on dark, warming to --accent on hover.

const PAPER = "#EEEAE0";
const ACCENT = "#FF6B1A";

// Brand marks as plain path data (Simple Icons, 24x24 viewBox) — no asset
// pipeline, parsed straight into geometry.
const GITHUB_PATH_D =
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

const LINKEDIN_PATH_D =
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

// SVG path -> centred, normalised ExtrudeGeometry.
function buildLogoGeometry(pathD: string, depth = 0.12) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${pathD}"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth,
        bevelEnabled: false,
        curveSegments: 16,
    });

    // Centre on all axes, then flip Y (SVG's axis is inverted vs three's).
    geometry.computeBoundingBox();
    let box = geometry.boundingBox!;
    geometry.translate(
        -(box.max.x + box.min.x) / 2,
        -(box.max.y + box.min.y) / 2,
        -(box.max.z + box.min.z) / 2,
    );
    geometry.scale(1, -1, 1);

    // Normalise so both marks read at the same visual weight despite their
    // different native proportions.
    geometry.computeBoundingBox();
    box = geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y) || 1;
    const target = 0.86;
    geometry.scale(target / maxDim, target / maxDim, 1);
    return geometry;
}

type BlockDef = {
    href: string;
    label: string;
    pathD: string;
    /** resting position in the scene */
    at: [number, number, number];
    /** how strongly it answers the pointer */
    parallax: number;
    /** idle drift tuning */
    speed: number;
    phase: number;
    amp: [number, number];
};

// Positions/motion are budgeted to stay inside the canvas: the section clips
// at the aside's box, so base offset + drift + parallax + scroll + the hover
// scale must all fit within the visible frustum, or the cubes get cut off.
const BLOCKS: BlockDef[] = [
    {
        href: "https://github.com/manuto276",
        label: "GitHub",
        pathD: GITHUB_PATH_D,
        at: [-0.88, 0.66, 0],
        parallax: 0.2,
        speed: 0.42,
        phase: 0,
        amp: [0.07, 0.09],
    },
    {
        href: "https://linkedin.com/in/efrascella256",
        label: "LinkedIn",
        pathD: LINKEDIN_PATH_D,
        at: [0.88, -0.62, 0],
        parallax: 0.22,
        speed: 0.33,
        phase: 1.6,
        amp: [0.08, 0.08],
    },
];

// Camera is fixed (z 6.2, fov 42), and three's fov is *vertical* — so the
// visible world height is constant while the visible width is that height
// times the canvas aspect. The aside is tall and narrow on desktop (aspect
// ~0.96) but wide and short on a phone (~1.12), which means a fixed world-x
// like ±0.88 covers a smaller share of the frame on the phone: the two blocks
// read as bunched together. So don't store x as an absolute — store it as a
// fraction of the visible half-width and resolve it per canvas size, which
// holds the same visual spread everywhere. Squat canvases get a bigger
// fraction on top of that, because there the pair is also physically closer
// in pixels — the phone's canvas is barely 320px tall.
//
// The test is the canvas *aspect*, not a pixel width: the aside is only 480px
// wide even on a 1440px desktop, so any width threshold that catches the phone
// catches the desktop too.
const HALF_H = Math.tan((42 * Math.PI) / 360) * 6.2; // visible half-height at z=0
const SQUAT_ASPECT = 1.02;
const SPREAD_UPRIGHT = 0.385; // reproduces the tuned desktop ±0.88 at aspect 0.96
const SPREAD_SQUAT = 0.46;
const CUBE_CLEARANCE = 0.78; // half the cube plus room for drift/parallax/hover

function Block({
    def,
    spreadX,
    pointer,
    scroll,
}: {
    def: BlockDef;
    spreadX: number;
    pointer: React.MutableRefObject<{ x: number; y: number }>;
    scroll: React.MutableRefObject<number>;
}) {
    // Authored x is only a side (left/right); the magnitude comes from the
    // canvas-aware spread so the pair holds the same visual gap on any aspect.
    const restX = Math.sign(def.at[0]) * spreadX;
    const group = useRef<THREE.Group>(null);
    const inner = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const hit = useRef(0); // click animation clock, counts down
    const lit = useRef(0); // 0..1 eased hover amount

    const geometry = useMemo(() => buildLogoGeometry(def.pathD), [def.pathD]);
    const wire = useRef<THREE.MeshBasicMaterial>(null);
    const logo = useRef<THREE.MeshBasicMaterial>(null);
    const paper = useMemo(() => new THREE.Color(PAPER), []);
    const accent = useMemo(() => new THREE.Color(ACCENT), []);

    useFrame((state, dt) => {
        const t = state.clock.elapsedTime;
        const g = group.current;
        const i = inner.current;
        if (!g || !i) return;

        // idle drift + pointer parallax + a little scroll travel, echoing the
        // float the flat blocks had before.
        const driftX = Math.sin(t * def.speed + def.phase) * def.amp[0];
        const driftY = Math.cos(t * def.speed * 0.85 + def.phase) * def.amp[1];
        // restX, not def.at[0]: this loop is the real source of truth for the
        // resting place — the JSX `position` only seeds frame one, and every
        // frame after would drag the block back to the fixed authored x.
        g.position.x += (restX + driftX + pointer.current.x * def.parallax - g.position.x) * Math.min(1, dt * 3);
        g.position.y += (def.at[1] + driftY + pointer.current.y * def.parallax + scroll.current * 0.3 - g.position.y) * Math.min(1, dt * 3);

        // bounded wobble so the mark never turns away from the reader
        const wobble = Math.sin(t * 0.34 + def.phase) * 0.32;

        // click "pop": a full spin with a bounce and a squash on landing
        let bounce = 0;
        let squash = 1;
        let spin = 0;
        if (hit.current > 0) {
            hit.current = Math.max(0, hit.current - dt);
            const p = 1 - hit.current / 0.62; // 0..1
            spin = Math.PI * 2 * (1 - Math.pow(1 - p, 3));
            const lift = Math.sin(Math.min(1, p * 1.25) * Math.PI);
            bounce = lift * 0.3;
            squash = p > 0.78 ? 1 - Math.sin((p - 0.78) / 0.22 * Math.PI) * 0.16 : 1;
        }

        i.rotation.y = wobble + spin;
        i.rotation.x = Math.sin(t * 0.27 + def.phase) * 0.16;
        i.position.y = bounce;
        const target = (hovered ? 1.08 : 1) * squash;
        i.scale.setScalar(i.scale.x + (target - i.scale.x) * Math.min(1, dt * 8));

        // ease the colour toward accent while hovered
        lit.current += ((hovered ? 1 : 0) - lit.current) * Math.min(1, dt * 7);
        const col = paper.clone().lerp(accent, lit.current);
        wire.current?.color.copy(col);
        logo.current?.color.copy(col);
    });

    const open = () => {
        hit.current = 0.62;
        window.open(def.href, "_blank", "noopener,noreferrer");
    };

    return (
        <group ref={group} position={[restX, def.at[1], def.at[2]]}>
            <group ref={inner}>
                <mesh
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        setHovered(true);
                        document.body.style.cursor = "pointer";
                    }}
                    onPointerOut={() => {
                        setHovered(false);
                        document.body.style.cursor = "";
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        open();
                    }}
                >
                    <boxGeometry args={[1.4, 1.4, 1.4]} />
                    <meshBasicMaterial ref={wire} color={PAPER} wireframe />
                </mesh>
                <mesh geometry={geometry} raycast={() => null}>
                    <meshBasicMaterial ref={logo} color={PAPER} />
                </mesh>
            </group>

            {/* the label is the real, keyboard-reachable link */}
            <Html position={[0, -1.12, 0]} center distanceFactor={7} zIndexRange={[2, 0]}>
                <a
                    className={`ef-social3d-label ${hovered ? "is-lit" : ""}`}
                    href={def.href}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="link"
                >
                    {def.label}
                </a>
            </Html>
        </group>
    );
}

function Scene() {
    const pointer = useRef({ x: 0, y: 0 });
    const scroll = useRef(0);

    const { size } = useThree();
    const spreadX = useMemo(() => {
        const aspect = size.width / Math.max(1, size.height);
        const halfW = HALF_H * aspect;
        const frac = aspect > SQUAT_ASPECT ? SPREAD_SQUAT : SPREAD_UPRIGHT;
        // Never push a cube past the frustum edge, however extreme the aspect.
        return Math.min(frac * halfW, Math.max(0.5, halfW - CUBE_CLEARANCE));
    }, [size.width, size.height]);

    // Read pointer/scroll off refs so parallax never triggers a React render.
    useFrame((state) => {
        pointer.current.x = state.pointer.x * 0.35;
        pointer.current.y = state.pointer.y * 0.25;
        const el = state.gl.domElement;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const travelled = vh - r.top;
        const total = vh + r.height;
        scroll.current = Math.max(0, Math.min(1, travelled / total)) - 0.5;
    });

    return (
        <>
            {BLOCKS.map((def) => (
                <Block key={def.label} def={def} spreadX={spreadX} pointer={pointer} scroll={scroll} />
            ))}
        </>
    );
}

export default function SocialBlocks3D() {
    return (
        <Canvas
            className="ef-social3d-canvas"
            camera={{ position: [0, 0, 6.2], fov: 42 }}
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 2]}
        >
            <Scene />
        </Canvas>
    );
}
