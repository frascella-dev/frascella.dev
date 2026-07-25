import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import LabStage from "../../LabStage.tsx";
import "./blocks.css";

// The footer's Mario-`?`-block social links (see Contact.tsx / Blocks.tsx),
// rebuilt as wireframe cubes — the exact visual language of the canonical
// `example` experiment (boxGeometry + wireframe meshBasicMaterial), each with
// the real brand mark floating at its centre as smooth, flat vector geometry.
// No textures, no voxels, no pixel art: the logos are the official Simple
// Icons outlines (single SVG path each), parsed with three's SVGLoader and
// extruded a hair for presence, then centred and scaled to fit the cage.
//
// Hover  -> the wireframe + the logo both shift from ink to an accent
//           colour, and the whole cube lifts + scales slightly.
// Click  -> a Mario "hit": the cube spins a full turn, bounces up, squashes
//           on landing, and pops a little accent star that flips up and
//           fades — then logs the brand name to the console (no navigation).

const PAPER = "#EEEAE0";
const INK = "#111110";
const ACCENT = "#FF6B1A";

const HIT_DURATION = 0.7;

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// ---- official brand marks (Simple Icons, single <path>, viewBox 0 0 24 24)
// — embedded as plain path-data strings so there's no asset pipeline / no
// SVG file import, just parsed straight into geometry below.
const GITHUB_PATH_D =
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

const LINKEDIN_PATH_D =
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

// SVG path -> centred, unit-scaled ExtrudeGeometry. Parsed once per brand
// (module scope) since the shape never changes.
function buildLogoGeometry(pathD, depth = 0.14) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${pathD}"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
    const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth,
        bevelEnabled: false,
        curveSegments: 16,
    });

    // Centre on all three axes, then flip Y (SVG's is inverted vs three's).
    geometry.computeBoundingBox();
    let box = geometry.boundingBox;
    geometry.translate(
        -(box.max.x + box.min.x) / 2,
        -(box.max.y + box.min.y) / 2,
        -(box.max.z + box.min.z) / 2,
    );
    geometry.scale(1, -1, 1);

    // Normalise so the logo's longest side is a fixed size, independent of
    // each icon's native proportions — keeps both marks reading at the same
    // visual weight inside their cube.
    geometry.computeBoundingBox();
    box = geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y) || 1;
    const target = 0.92;
    geometry.scale(target / maxDim, target / maxDim, 1);

    return geometry;
}

const CUBE_SIZE = 1.8;

function Ground({ halfSpan = 5 }) {
    const points = useMemo(
        () => [
            new THREE.Vector3(-halfSpan, -1.15, 0),
            new THREE.Vector3(halfSpan, -1.15, 0),
        ],
        [halfSpan],
    );
    return <Line points={points} color={INK} lineWidth={1} transparent opacity={0.14} />;
}

function SocialCube({ def, onHoverIn, onHoverOut }) {
    const logoGeometry = useMemo(() => buildLogoGeometry(def.pathD), [def.pathD]);
    const groupRef = useRef(null);
    const spinRef = useRef(null);
    const cubeMatRef = useRef(null);
    const logoMatRef = useRef(null);
    const labelRef = useRef(null);
    const coinRef = useRef(null);
    const [hovered, setHovered] = useState(false);
    const hitStart = useRef(null);
    const frameT = useRef(0);
    const scaleSpring = useRef(1);

    const inkColor = useMemo(() => new THREE.Color(INK), []);
    const hoverColorObj = useMemo(() => new THREE.Color(def.hoverColor), [def.hoverColor]);

    useFrame((state, dt) => {
        const t = state.clock.elapsedTime;
        frameT.current = t;
        const group = groupRef.current;
        const spin = spinRef.current;
        if (!group || !spin) return;

        const bob = Math.sin(t * 0.9 + def.phase) * 0.09;
        // A gentle bounded wobble rather than a full continuous spin — a
        // block that idly rotates all the way around would sit edge-on
        // (logo hidden) for a good chunk of every cycle. Bounding it keeps
        // the face — and the logo — in view at rest; the click "hit" still
        // does its own full 360 on top of this.
        const idleSpin = Math.sin(t * 0.22 + def.spinPhase) * 0.4;

        let lift = hovered ? 0.22 : 0;
        let targetScale = hovered ? 1.15 : 1;
        let extraSpin = 0;
        let squashY = 1;
        let stretchXZ = 1;
        let hitting = false;

        if (hitStart.current != null) {
            const p = Math.min(1, (t - hitStart.current) / HIT_DURATION);
            hitting = p < 1;
            const bounce = Math.sin(Math.min(1, p) * Math.PI);
            lift += bounce * 0.62;
            extraSpin = easeOutCubic(Math.min(1, p)) * Math.PI * 2;
            if (p > 0.78) {
                const q = (p - 0.78) / 0.22;
                const s = Math.sin(Math.min(1, q) * Math.PI);
                squashY = 1 - s * 0.32;
                stretchXZ = 1 + s * 0.24;
            }
            if (p >= 1) hitStart.current = null;
        }

        group.position.set(def.pos[0], def.pos[1] + bob + lift, def.pos[2]);
        spin.rotation.y = idleSpin + extraSpin;

        scaleSpring.current = THREE.MathUtils.damp(scaleSpring.current, targetScale, 7, dt);
        const s = def.scale;
        spin.scale.set(
            scaleSpring.current * stretchXZ * s,
            scaleSpring.current * squashY * s,
            scaleSpring.current * stretchXZ * s,
        );

        const wantHover = hovered || hitting;
        if (cubeMatRef.current) {
            cubeMatRef.current.color.lerp(wantHover ? hoverColorObj : inkColor, 0.18);
        }
        if (logoMatRef.current) {
            logoMatRef.current.color.lerp(wantHover ? hoverColorObj : inkColor, 0.18);
        }

        if (labelRef.current) {
            labelRef.current.classList.toggle("is-lit", wantHover);
        }

        if (coinRef.current) {
            if (hitStart.current != null || hitting) {
                const p = Math.min(1, (t - (hitStart.current ?? t)) / HIT_DURATION);
                const rise = easeOutCubic(p) * 46;
                const fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
                coinRef.current.style.opacity = String(Math.max(0, fade));
                coinRef.current.style.transform = `translateY(${-rise}px) scale(${1 + p * 0.4}) rotate(${p * 50 - 12}deg)`;
            } else {
                coinRef.current.style.opacity = "0";
            }
        }
    });

    const handleClick = (e) => {
        e.stopPropagation();
        hitStart.current = frameT.current;
        // eslint-disable-next-line no-console
        console.log(`[lab/blocks] ${def.log}`);
    };

    const hitboxSize = CUBE_SIZE * 1.05;

    return (
        <group>
            <group ref={groupRef} position={def.pos}>
                <group ref={spinRef}>
                    {/* Invisible hitbox — carries the pointer/click handlers so
                        hover/click work reliably regardless of the wireframe's
                        thin lines or the logo's flat geometry. */}
                    <mesh
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            setHovered(true);
                            onHoverIn?.();
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            setHovered(false);
                            onHoverOut?.();
                        }}
                        onClick={handleClick}
                    >
                        <boxGeometry args={[hitboxSize, hitboxSize, hitboxSize]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>

                    {/* The wireframe cage — same recipe as /example. */}
                    <mesh>
                        <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
                        <meshBasicMaterial ref={cubeMatRef} color={INK} wireframe />
                    </mesh>

                    {/* The brand mark, floating dead-centre, smooth vector geometry. */}
                    <mesh geometry={logoGeometry}>
                        <meshBasicMaterial ref={logoMatRef} color={INK} side={THREE.DoubleSide} />
                    </mesh>
                </group>

                <Html center position={[0, CUBE_SIZE * 0.32, 0]} style={{ pointerEvents: "none" }}>
                    <div ref={coinRef} className="lb-coin" style={{ color: def.hoverColor }}>
                        &#9733;
                    </div>
                </Html>
            </group>

            <Html center position={[def.pos[0], def.pos[1] - CUBE_SIZE * def.scale * 0.82, def.pos[2]]}>
                <div ref={labelRef} className="ef-label lb-label">
                    {def.label}
                </div>
            </Html>
        </group>
    );
}

function useNarrow(bp = 720) {
    const [narrow, setNarrow] = useState(
        () => typeof window !== "undefined" && window.innerWidth < bp,
    );
    useEffect(() => {
        const onResize = () => setNarrow(window.innerWidth < bp);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [bp]);
    return narrow;
}

export default function Blocks3D() {
    const narrow = useNarrow();
    const [hoveredKey, setHoveredKey] = useState(null);

    const spacing = narrow ? 0.85 : 1.45;
    const scale = narrow ? 0.45 : 1;
    const defs = [
        {
            key: "github",
            label: "GITHUB",
            log: "github — manuto276",
            pathD: GITHUB_PATH_D,
            hoverColor: ACCENT,
            phase: 0,
            spinPhase: -0.22,
            scale,
            pos: [-spacing, 0, 0],
        },
        {
            key: "linkedin",
            label: "LINKEDIN",
            log: "linkedin — efrascella256",
            pathD: LINKEDIN_PATH_D,
            hoverColor: ACCENT,
            phase: 2.6,
            spinPhase: 0.22,
            scale,
            pos: [spacing, 0, 0],
        },
    ];

    const camera = narrow
        ? { position: [0, 0.5, 7.6], fov: 46 }
        : { position: [0, 0.85, 6.2], fov: 38 };

    const hovered = defs.find((d) => d.key === hoveredKey);

    return (
        <LabStage
            idx="04"
            title="social blocks — 3d"
            tag="contact"
            hint={hovered ? `${hovered.label} — click to pop` : "hover to light · click to pop"}
        >
            <div className="lb-wrap">
                <Canvas camera={camera} gl={{ antialias: true }}>
                    <color attach="background" args={[PAPER]} />
                    <Ground halfSpan={narrow ? 3 : 5} />
                    {defs.map((def) => (
                        <SocialCube
                            key={def.key}
                            def={def}
                            onHoverIn={() => setHoveredKey(def.key)}
                            onHoverOut={() =>
                                setHoveredKey((cur) => (cur === def.key ? null : cur))
                            }
                        />
                    ))}
                </Canvas>
            </div>
        </LabStage>
    );
}
