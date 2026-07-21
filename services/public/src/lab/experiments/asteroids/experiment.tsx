import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Color } from "three";
import LabStage from "../../LabStage.tsx";
import "./asteroids.css";

// ------------------------------------------------------------------
// asteroids — 3d bugs. WASD moves the ship directly in the play plane
// (no rotate+thrust), space fires. Two variants, switchable in-scene
// (buttons or 1/2 keys):
//   01 / arcade — bugs spawn at the edges and home in on the ship; a
//     bump costs a life; 0 lives ends the run.
//   02 / chill — no lives, no game over. A handful of bugs spawn and
//     barely drift (no homing, no ship damage from bumping).
//
// Both variants share the same target-type system: three kinds of bug
// (normal / gunner / elite — see TARGET_TYPES below), the same shard-
// burst explosions (colored per target), the same floating score
// popups, and the same enemy-fire + screen-glitch feedback loop.
//
// Hits always shatter into wireframe fragments. Bugs/ship/bolts wrap
// at the bounds like classic Asteroids. Everything renders as thin
// ink-line wireframe with sparing orange/lime accents — no lights,
// only meshBasicMaterial, matching the reference example.
// ------------------------------------------------------------------

const INK = "#111110";
const ACCENT = "#FF6B1A";
const ACCENT_2 = "#C7F651";

type Variant = "arcade" | "chill";

const SHIP_SPEED = 4.6;
const SHIP_TURN = 10;
const FIRE_COOLDOWN = 0.16;
const BOLT_SPEED = 12;
const BOLT_LIFE = 0.85;
const BOLT_HIT_R = 0.42;
const SHIP_HIT_R = 0.5;
const BUG_TURN = 1.1;
const EXPLOSION_DURATION = 0.5;
const POPUP_DURATION_MS = 800;

// enemy fire (types 2/3 shoot back — see TARGET_TYPES) + the on-hit glitch
const ENEMY_BOLT_SPEED = 6.5;
const ENEMY_BOLT_LIFE = 2.4;
const ENEMY_BOLT_HIT_R = 0.46;

// non-lethal hit feedback (a multi-hit target damaged but not destroyed)
const HIT_FLASH_DURATION = 0.22;

/**
 * ============================================================
 * ARCADE CONFIG — tune the classic run here.
 * ============================================================
 */
const ARCADE_CONFIG = {
    /** Hard cap on simultaneous targets. */
    maxTargets: 9,
    /** Delay (seconds) before the very first spawn of a run. */
    firstSpawnDelay: 0.8,
    /** Spawn interval at the start of a run (seconds); ramps down with kills. */
    spawnIntervalBase: 1.6,
    /** Spawn interval never drops below this, however many kills you rack up. */
    spawnIntervalMin: 0.55,
    /** How much the interval shortens per kill (difficulty ramp). */
    spawnRampPerKill: 0.035,
};

/**
 * ============================================================
 * CHILL CONFIG — tune the "calm" variant's target population here.
 * Code-only knobs (no UI) — a developer editing the file changes these.
 * ============================================================
 */
const CHILL_CONFIG = {
    /** Targets present the instant a chill run starts. */
    startTargets: 0,
    /** Floor the spawner tries to maintain once the run is underway (0 = none). */
    minTargets: 0,
    /** Hard cap on simultaneous targets. */
    maxTargets: 5,
    /** Delay (seconds) before the first spawn after startTargets appear. */
    firstSpawnDelay: 1.2,
    /** Random interval (seconds) between spawns once at/above minTargets. */
    spawnIntervalMin: 2.4,
    spawnIntervalMax: 4.4,
    /** How fast targets idle-drift (world units/sec) — no homing, ever. */
    drift: 0.16,
};

/**
 * ============================================================
 * TARGET TYPES — shared by both variants. Rarer tiers are worth more,
 * take more hits, and shoot back. Weighted spawn odds (relative, don't
 * need to sum to 100) keep 2/3 uncommon.
 * ============================================================
 */
type TargetKind = 1 | 2 | 3;
type TargetTypeDef = {
    kind: TargetKind;
    name: string;
    color: string;
    hits: number;
    points: number;
    canShoot: boolean;
    weight: number;
    scale: number;
    fireIntervalMin: number;
    fireIntervalMax: number;
};

const TARGET_TYPES: TargetTypeDef[] = [
    {
        kind: 1,
        name: "normal",
        color: INK,
        hits: 1,
        points: 100,
        canShoot: false,
        weight: 70,
        scale: 1,
        fireIntervalMin: 0,
        fireIntervalMax: 0,
    },
    {
        kind: 2,
        name: "gunner",
        color: ACCENT,
        hits: 2,
        points: 200,
        canShoot: true,
        weight: 22,
        scale: 1.15,
        fireIntervalMin: 2.2,
        fireIntervalMax: 3.4,
    },
    {
        kind: 3,
        name: "elite",
        color: ACCENT_2,
        hits: 3,
        points: 500,
        canShoot: true,
        weight: 8,
        scale: 1.3,
        fireIntervalMin: 1.5,
        fireIntervalMax: 2.4,
    },
];
const TARGET_WEIGHT_TOTAL = TARGET_TYPES.reduce((s, t) => s + t.weight, 0);

function pickTargetType(): TargetTypeDef {
    let roll = Math.random() * TARGET_WEIGHT_TOTAL;
    for (const t of TARGET_TYPES) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return TARGET_TYPES[0];
}

/**
 * ============================================================
 * DEV HOOKS — reassign these in code (right here, or from anywhere
 * that imports nothing — this object is just sitting at module scope)
 * to observe game events: console.log, analytics, an external HUD...
 * No-ops by default. Example:
 *
 *   GAME_HOOKS.onKill = (t) => console.log("[asteroids] kill", t);
 *   GAME_HOOKS.onScore = (s) => console.log("[asteroids] score", s);
 * ============================================================
 */
type KilledTarget = { kind: TargetKind; name: string; points: number };
const GAME_HOOKS = {
    /** Fired the instant a target is destroyed (bolt kill or ship bump). */
    onKill: (_target: KilledTarget) => {},
    /** Fired whenever the score changes, with the new total. */
    onScore: (_newScore: number) => {},
};

function wrap(v: number, half: number) {
    if (v > half) return -half;
    if (v < -half) return half;
    return v;
}

const KEY_MAP: Record<string, "up" | "down" | "left" | "right" | "fire"> = {
    KeyW: "up",
    ArrowUp: "up",
    KeyS: "down",
    ArrowDown: "down",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
    Space: "fire",
};

/* ---------------------------------------------------------------- */
/* Ship — low-poly wireframe cone, nose (+Y) faces travel direction. */
/* ---------------------------------------------------------------- */
function Ship({ groupRef }: { groupRef: (g: any) => void }) {
    const local = useRef<any>(null);
    const thruster = useRef<any>(null);

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
            ref={(g) => {
                local.current = g;
                groupRef(g);
            }}
        >
            <mesh>
                <coneGeometry args={[0.32, 0.85, 3]} />
                <meshBasicMaterial color={INK} wireframe />
            </mesh>
            <mesh position={[0, 0.12, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.12, 0.018, 6, 12]} />
                <meshBasicMaterial color={ACCENT} />
            </mesh>
            <mesh ref={thruster} position={[0, -0.55, 0]} scale={[1, 0.05, 1]}>
                <coneGeometry args={[0.13, 0.5, 3]} />
                <meshBasicMaterial color={ACCENT_2} wireframe transparent opacity={0.85} />
            </mesh>
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* Bug — squashed wireframe body, line legs + antennae, colored per   */
/* target type (ink / orange / lime). Forward is local +Y.           */
/* ---------------------------------------------------------------- */
const LEG_DIRS: [number, number, number][] = [
    [-0.4, -0.16, 0.05],
    [-0.32, -0.36, -0.04],
    [0.32, -0.36, 0.04],
    [0.4, -0.16, -0.05],
];

function Bug({ setRef, color }: { setRef: (g: any) => void; color: string }) {
    const body = useRef<any>(null);
    const visual = useRef<any>(null);
    const seed = useRef(Math.random() * Math.PI * 2);

    // Decorative only — a wrapper group carries a tiny idle bob + the body
    // wiggles in place. The root group (setRef) is owned by the central sim,
    // which sets its position/rotation every frame, so this never conflicts.
    // The central sim also imperatively lerps material colors for hit-flash
    // feedback; since `color` never changes across renders, that's stable.
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (body.current) {
            body.current.rotation.z = Math.sin(t * 4 + seed.current) * 0.14;
            body.current.rotation.x = Math.cos(t * 3.3 + seed.current) * 0.1;
        }
        if (visual.current) {
            visual.current.position.y = Math.sin(t * 1.6 + seed.current) * 0.05;
        }
    });

    return (
        <group ref={setRef}>
            <group ref={visual}>
                {/* head */}
                <mesh position={[0, 0.24, 0]} scale={[0.55, 0.6, 0.55]}>
                    <octahedronGeometry args={[0.22, 0]} />
                    <meshBasicMaterial color={color} wireframe />
                </mesh>
                {/* thorax + abdomen — two stacked low-poly gems read as a segmented body */}
                <mesh ref={body} scale={[0.8, 1.1, 0.8]}>
                    <octahedronGeometry args={[0.3, 0]} />
                    <meshBasicMaterial color={color} wireframe />
                </mesh>
                <mesh position={[0, -0.32, 0]} scale={[0.65, 0.75, 0.65]}>
                    <octahedronGeometry args={[0.24, 0]} />
                    <meshBasicMaterial color={color} wireframe />
                </mesh>
                {LEG_DIRS.map((d, i) => (
                    <Line
                        key={i}
                        points={[[0, -0.05, 0], d]}
                        color={color}
                        lineWidth={1}
                        transparent
                        opacity={0.7}
                    />
                ))}
                <Line points={[[-0.06, 0.36, 0], [-0.16, 0.58, 0.04]]} color={color} lineWidth={1} />
                <Line points={[[0.06, 0.36, 0], [0.16, 0.58, -0.04]]} color={color} lineWidth={1} />
            </group>
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* Bolt — solid accent tracer (player fire). Forward is local +X.    */
/* ---------------------------------------------------------------- */
function Bolt({ setRef }: { setRef: (g: any) => void }) {
    return (
        <group ref={setRef}>
            <mesh>
                <boxGeometry args={[0.42, 0.05, 0.05]} />
                <meshBasicMaterial color={ACCENT} />
            </mesh>
            <mesh position={[-0.32, 0, 0]}>
                <boxGeometry args={[0.26, 0.02, 0.02]} />
                <meshBasicMaterial color={ACCENT} transparent opacity={0.35} />
            </mesh>
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* EnemyBolt — small spinning wireframe diamond, colored per shooter. */
/* Visually distinct from the player's solid orange tracer.          */
/* ---------------------------------------------------------------- */
function EnemyBolt({ setRef, color }: { setRef: (g: any) => void; color: string }) {
    const spin = useRef<any>(null);
    useFrame((_, dt) => {
        if (spin.current) {
            spin.current.rotation.x += dt * 6;
            spin.current.rotation.y += dt * 4.2;
        }
    });
    return (
        <group ref={setRef}>
            <mesh ref={spin}>
                <octahedronGeometry args={[0.14, 0]} />
                <meshBasicMaterial color={color} wireframe />
            </mesh>
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* Explosion — the target's own wireframe bursting apart: small gem   */
/* fragments + line-bit shards scatter outward in the target's color, */
/* shrinking and fading. No ring. Self-timed; calls onDone once.     */
/* ---------------------------------------------------------------- */
type Shard = { dx: number; dy: number; spin: number; kind: "frag" | "bit"; scale: number };

function makeShards(count: number): Shard[] {
    return Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = 0.7 + Math.random() * 0.9;
        return {
            dx: Math.cos(a) * r,
            dy: Math.sin(a) * r,
            spin: (Math.random() - 0.5) * 6,
            kind: Math.random() < 0.55 ? "frag" : "bit",
            scale: 0.6 + Math.random() * 0.7,
        };
    });
}

const SHARD_COUNT = 12;

function Explosion({
    position,
    color,
    onDone,
}: {
    position: [number, number, number];
    color: string;
    onDone: () => void;
}) {
    const [shards] = useState(() => makeShards(SHARD_COUNT));
    const refs = useRef<any[]>([]);
    const age = useRef(0);
    const done = useRef(false);

    useFrame((_, dt) => {
        age.current += dt;
        const t = Math.min(1, age.current / EXPLOSION_DURATION);
        const ease = 1 - (1 - t) * (1 - t);
        refs.current.forEach((m, i) => {
            if (!m) return;
            const s = shards[i];
            m.position.set(s.dx * ease * 1.4, s.dy * ease * 1.4, 0);
            m.rotation.z = s.spin * t * Math.PI;
            m.rotation.x = s.spin * t * 0.6;
            const fade = Math.max(0, 1 - t);
            if (m.material) m.material.opacity = fade;
            m.scale.setScalar(Math.max(0.001, s.scale * fade));
        });
        if (t >= 1 && !done.current) {
            done.current = true;
            onDone();
        }
    });

    return (
        <group position={position}>
            {shards.map((s, i) =>
                s.kind === "frag" ? (
                    <mesh key={i} ref={(m) => (refs.current[i] = m)}>
                        <octahedronGeometry args={[0.09, 0]} />
                        <meshBasicMaterial color={color} wireframe transparent opacity={1} />
                    </mesh>
                ) : (
                    <mesh key={i} ref={(m) => (refs.current[i] = m)}>
                        <boxGeometry args={[0.16, 0.03, 0.03]} />
                        <meshBasicMaterial color={color} transparent opacity={1} />
                    </mesh>
                ),
            )}
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* ScorePopup — plain point value, bigger mono label, rises + fades   */
/* via CSS keyframes. Self-timed; calls onDone once.                 */
/* ---------------------------------------------------------------- */
function ScorePopup({
    position,
    amount,
    onDone,
}: {
    position: [number, number, number];
    amount: number;
    onDone: () => void;
}) {
    useEffect(() => {
        const t = setTimeout(onDone, POPUP_DURATION_MS);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <Html position={position} center pointerEvents="none" wrapperClass="ast-popup-wrap">
            <span className="ast-popup">{amount}</span>
        </Html>
    );
}

/* ---------------------------------------------------------------- */
/* Field bounds — faint rectangle marking the wrap boundary.         */
/* ---------------------------------------------------------------- */
function FieldBounds({ bx, by }: { bx: number; by: number }) {
    const pts: [number, number, number][] = [
        [-bx, -by, 0],
        [bx, -by, 0],
        [bx, by, 0],
        [-bx, by, 0],
        [-bx, -by, 0],
    ];
    return <Line points={pts} color={INK} lineWidth={1} transparent opacity={0.22} />;
}

function CameraRig() {
    useFrame(({ camera }) => camera.lookAt(0, 0, 0));
    return null;
}

/* ---------------------------------------------------------------- */
/* Game — the sim. Lives inside <Canvas>. Positions are mutated      */
/* imperatively on refs every frame; React state only tracks which   */
/* entities exist (mount/unmount), so motion never re-renders React. */
/* ---------------------------------------------------------------- */
type BugData = {
    pos: { x: number; y: number };
    vel: { x: number; y: number };
    kind: TargetKind;
    hp: number;
    points: number;
    color: string;
    colorObj: Color;
    canShoot: boolean;
    fireCooldown: number;
    scale: number;
    flash: number;
};
type BoltData = { pos: { x: number; y: number }; dir: { x: number; y: number }; age: number };
type EnemyBoltData = { pos: { x: number; y: number }; dir: { x: number; y: number }; age: number; color: string };
type FxData = { pos: { x: number; y: number }; color: string };
type PopupData = { pos: { x: number; y: number }; amount: number };

function buildBug(pos: { x: number; y: number }, vel: { x: number; y: number }, def: TargetTypeDef): BugData {
    return {
        pos,
        vel,
        kind: def.kind,
        hp: def.hits,
        points: def.points,
        color: def.color,
        colorObj: new Color(def.color),
        canShoot: def.canShoot,
        fireCooldown: def.canShoot
            ? def.fireIntervalMin + Math.random() * (def.fireIntervalMax - def.fireIntervalMin)
            : Infinity,
        scale: def.scale,
        flash: 0,
    };
}

function Game({
    phase,
    variant,
    onScore,
    onHitShip,
    onGlitch,
}: {
    phase: "ready" | "playing" | "gameover";
    variant: Variant;
    onScore: (amount: number) => void;
    onHitShip: () => void;
    onGlitch: () => void;
}) {
    const { viewport } = useThree();
    const bounds = useRef({ x: 6, y: 3.3 });
    bounds.current.x = Math.max(3.2, viewport.width / 2 - 0.7);
    bounds.current.y = Math.max(2.2, viewport.height / 2 - 0.6);

    const keys = useRef({ up: false, down: false, left: false, right: false, fire: false });
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const k = KEY_MAP[e.code];
            if (!k) return;
            e.preventDefault();
            keys.current[k] = true;
        };
        const up = (e: KeyboardEvent) => {
            const k = KEY_MAP[e.code];
            if (!k) return;
            e.preventDefault();
            keys.current[k] = false;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    const shipGroup = useRef<any>(null);
    const shipPos = useRef({ x: 0, y: 0 });
    const shipDir = useRef({ x: 0, y: 1 });
    const fireCooldown = useRef(0);
    const spawnTimer = useRef(0.9);
    const kills = useRef(0);

    const idCounter = useRef(0);
    const nextId = () => ++idCounter.current;

    const data = useRef({
        bugs: new Map<number, BugData>(),
        bolts: new Map<number, BoltData>(),
        enemyBolts: new Map<number, EnemyBoltData>(),
        fx: new Map<number, FxData>(),
        popups: new Map<number, PopupData>(),
    });
    const meshes = useRef({
        bugs: new Map<number, any>(),
        bolts: new Map<number, any>(),
        enemyBolts: new Map<number, any>(),
    });

    const [ids, setIds] = useState<{
        bugs: number[];
        bolts: number[];
        enemyBolts: number[];
        fx: number[];
        popups: number[];
    }>({
        bugs: [],
        bolts: [],
        enemyBolts: [],
        fx: [],
        popups: [],
    });

    // shared by the per-frame chill spawner AND the reset-time pre-seeding
    // (CHILL_CONFIG.startTargets) — spawns one calm target clear of the ship.
    const spawnChillBug = () => {
        const { x: BX, y: BY } = bounds.current;
        let pos = { x: 0, y: 0 };
        let tries = 0;
        do {
            pos = { x: (Math.random() * 2 - 1) * BX * 0.82, y: (Math.random() * 2 - 1) * BY * 0.82 };
            tries += 1;
        } while (
            Math.hypot(pos.x - shipPos.current.x, pos.y - shipPos.current.y) < 1.6 &&
            tries < 8
        );
        const a = Math.random() * Math.PI * 2;
        const vel = { x: Math.cos(a) * CHILL_CONFIG.drift, y: Math.sin(a) * CHILL_CONFIG.drift };
        const id = nextId();
        data.current.bugs.set(id, buildBug(pos, vel, pickTargetType()));
        return id;
    };

    const resetSim = useCallback(() => {
        data.current.bugs.clear();
        data.current.bolts.clear();
        data.current.enemyBolts.clear();
        data.current.fx.clear();
        data.current.popups.clear();
        meshes.current.bugs.clear();
        meshes.current.bolts.clear();
        meshes.current.enemyBolts.clear();
        shipPos.current = { x: 0, y: 0 };
        shipDir.current = { x: 0, y: 1 };
        fireCooldown.current = 0;
        kills.current = 0;

        const seeded: number[] = [];
        if (variant === "chill") {
            spawnTimer.current = CHILL_CONFIG.firstSpawnDelay;
            for (let i = 0; i < CHILL_CONFIG.startTargets; i++) seeded.push(spawnChillBug());
        } else {
            spawnTimer.current = ARCADE_CONFIG.firstSpawnDelay;
        }
        setIds({ bugs: seeded, bolts: [], enemyBolts: [], fx: [], popups: [] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant]);

    // fresh sim whenever a run starts, and immediately on variant switch so
    // the previous variant's entities don't linger behind the overlay
    useEffect(() => {
        if (phase === "playing") resetSim();
    }, [phase, resetSim]);
    useEffect(() => {
        resetSim();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant]);

    const spawnFx = (pos: { x: number; y: number }, color: string) => {
        const id = nextId();
        data.current.fx.set(id, { pos: { ...pos }, color });
        setIds((s) => ({ ...s, fx: [...s.fx, id] }));
    };

    const removeFx = useCallback((id: number) => {
        data.current.fx.delete(id);
        setIds((s) => ({ ...s, fx: s.fx.filter((x) => x !== id) }));
    }, []);

    const spawnPopup = (pos: { x: number; y: number }, amount: number) => {
        const id = nextId();
        data.current.popups.set(id, { pos: { ...pos }, amount });
        setIds((s) => ({ ...s, popups: [...s.popups, id] }));
    };

    const removePopup = useCallback((id: number) => {
        data.current.popups.delete(id);
        setIds((s) => ({ ...s, popups: s.popups.filter((x) => x !== id) }));
    }, []);

    useFrame((_, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const { x: BX, y: BY } = bounds.current;

        if (phase !== "playing") return;
        const k = keys.current;
        const chill = variant === "chill";

        // ship movement — direct WASD, no rotate+thrust
        let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
        let my = (k.up ? 1 : 0) - (k.down ? 1 : 0);
        const moving = mx !== 0 || my !== 0;
        if (moving) {
            const len = Math.hypot(mx, my) || 1;
            mx /= len;
            my /= len;
            shipPos.current.x = wrap(shipPos.current.x + mx * SHIP_SPEED * dt, BX);
            shipPos.current.y = wrap(shipPos.current.y + my * SHIP_SPEED * dt, BY);
            shipDir.current.x += (mx - shipDir.current.x) * Math.min(1, dt * SHIP_TURN);
            shipDir.current.y += (my - shipDir.current.y) * Math.min(1, dt * SHIP_TURN);
            const dl = Math.hypot(shipDir.current.x, shipDir.current.y) || 1;
            shipDir.current.x /= dl;
            shipDir.current.y /= dl;
        }
        if (shipGroup.current) {
            shipGroup.current.position.set(shipPos.current.x, shipPos.current.y, 0);
            shipGroup.current.rotation.z =
                Math.atan2(shipDir.current.y, shipDir.current.x) - Math.PI / 2;
            shipGroup.current.userData.moving = moving;
        }

        // fire — player bolts
        fireCooldown.current -= dt;
        if (k.fire && fireCooldown.current <= 0) {
            fireCooldown.current = FIRE_COOLDOWN;
            const id = nextId();
            const dir = { x: shipDir.current.x, y: shipDir.current.y };
            data.current.bolts.set(id, {
                pos: { x: shipPos.current.x + dir.x * 0.55, y: shipPos.current.y + dir.y * 0.55 },
                dir,
                age: 0,
            });
            setIds((s) => ({ ...s, bolts: [...s.bolts, id] }));
        }

        // player bolts — advance, expire
        const deadBolts: number[] = [];
        data.current.bolts.forEach((b, id) => {
            b.age += dt;
            b.pos.x += b.dir.x * BOLT_SPEED * dt;
            b.pos.y += b.dir.y * BOLT_SPEED * dt;
            const mesh = meshes.current.bolts.get(id);
            if (mesh) {
                mesh.position.set(b.pos.x, b.pos.y, 0);
                mesh.rotation.z = Math.atan2(b.dir.y, b.dir.x);
            }
            if (b.age > BOLT_LIFE || Math.abs(b.pos.x) > BX + 1 || Math.abs(b.pos.y) > BY + 1) {
                deadBolts.push(id);
            }
        });

        // spawn targets
        spawnTimer.current -= dt;
        if (chill) {
            const wantForce = data.current.bugs.size < CHILL_CONFIG.minTargets;
            if ((wantForce || spawnTimer.current <= 0) && data.current.bugs.size < CHILL_CONFIG.maxTargets) {
                const id = spawnChillBug();
                spawnTimer.current = wantForce
                    ? 0.4
                    : CHILL_CONFIG.spawnIntervalMin +
                      Math.random() * (CHILL_CONFIG.spawnIntervalMax - CHILL_CONFIG.spawnIntervalMin);
                setIds((s) => ({ ...s, bugs: [...s.bugs, id] }));
            }
        } else if (spawnTimer.current <= 0 && data.current.bugs.size < ARCADE_CONFIG.maxTargets) {
            spawnTimer.current = Math.max(
                ARCADE_CONFIG.spawnIntervalMin,
                ARCADE_CONFIG.spawnIntervalBase - kills.current * ARCADE_CONFIG.spawnRampPerKill,
            );
            const edge = Math.floor(Math.random() * 4);
            let pos: { x: number; y: number };
            if (edge === 0) pos = { x: -BX, y: (Math.random() * 2 - 1) * BY };
            else if (edge === 1) pos = { x: BX, y: (Math.random() * 2 - 1) * BY };
            else if (edge === 2) pos = { x: (Math.random() * 2 - 1) * BX, y: -BY };
            else pos = { x: (Math.random() * 2 - 1) * BX, y: BY };
            const toShip = { x: shipPos.current.x - pos.x, y: shipPos.current.y - pos.y };
            const dl = Math.hypot(toShip.x, toShip.y) || 1;
            const speed = 1.5 + Math.random() * 0.8;
            const vel = { x: (toShip.x / dl) * speed, y: (toShip.y / dl) * speed };
            const id = nextId();
            data.current.bugs.set(id, buildBug(pos, vel, pickTargetType()));
            setIds((s) => ({ ...s, bugs: [...s.bugs, id] }));
        }

        // bugs: arcade homes toward the ship and can bump it; chill just
        // barely drifts and never touches the ship. Both: hit-flash decay
        // and enemy fire (types 2/3) run regardless of variant.
        const deadBugs: number[] = [];
        let shipHit = false;
        data.current.bugs.forEach((b, id) => {
            if (chill) {
                b.pos.x = wrap(b.pos.x + b.vel.x * dt, BX);
                b.pos.y = wrap(b.pos.y + b.vel.y * dt, BY);
            } else {
                const toShip = { x: shipPos.current.x - b.pos.x, y: shipPos.current.y - b.pos.y };
                const dl = Math.hypot(toShip.x, toShip.y) || 1;
                const speed = Math.hypot(b.vel.x, b.vel.y) || 1.8;
                const desiredX = (toShip.x / dl) * speed;
                const desiredY = (toShip.y / dl) * speed;
                b.vel.x += (desiredX - b.vel.x) * Math.min(1, dt * BUG_TURN);
                b.vel.y += (desiredY - b.vel.y) * Math.min(1, dt * BUG_TURN);
                b.pos.x = wrap(b.pos.x + b.vel.x * dt, BX);
                b.pos.y = wrap(b.pos.y + b.vel.y * dt, BY);
                if (dl < SHIP_HIT_R) {
                    deadBugs.push(id);
                    shipHit = true;
                    spawnFx(b.pos, b.color);
                    const bumpDef = TARGET_TYPES.find((t) => t.kind === b.kind)!;
                    GAME_HOOKS.onKill({ kind: b.kind, name: bumpDef.name, points: b.points });
                }
            }

            const mesh = meshes.current.bugs.get(id);
            if (mesh) {
                mesh.position.set(b.pos.x, b.pos.y, 0);
                mesh.rotation.z = Math.atan2(b.vel.y, b.vel.x) - Math.PI / 2;

                // non-lethal hit feedback — brief shake + color flash back to normal
                if (b.flash > 0) {
                    b.flash = Math.max(0, b.flash - dt);
                    const s = b.flash / HIT_FLASH_DURATION;
                    mesh.position.x += (Math.random() - 0.5) * 0.06 * s;
                    mesh.position.y += (Math.random() - 0.5) * 0.06 * s;
                    mesh.traverse((child: any) => {
                        if (child.material?.color) child.material.color.lerp(b.colorObj, dt * 9);
                    });
                }
            }

            // enemy fire — types 2/3 only, applies in both variants
            if (b.canShoot && !deadBugs.includes(id)) {
                b.fireCooldown -= dt;
                if (b.fireCooldown <= 0) {
                    const def = TARGET_TYPES.find((t) => t.kind === b.kind)!;
                    b.fireCooldown =
                        def.fireIntervalMin + Math.random() * (def.fireIntervalMax - def.fireIntervalMin);
                    const dx = shipPos.current.x - b.pos.x;
                    const dy = shipPos.current.y - b.pos.y;
                    const dl2 = Math.hypot(dx, dy) || 1;
                    const ebId = nextId();
                    data.current.enemyBolts.set(ebId, {
                        pos: { x: b.pos.x, y: b.pos.y },
                        dir: { x: dx / dl2, y: dy / dl2 },
                        age: 0,
                        color: b.color,
                    });
                    setIds((s) => ({ ...s, enemyBolts: [...s.enemyBolts, ebId] }));
                }
            }
        });

        // collisions: player bolts vs bugs — 1 hp off per hit; kill on 0
        data.current.bolts.forEach((bolt, boltId) => {
            if (deadBolts.includes(boltId)) return;
            data.current.bugs.forEach((b, bugId) => {
                if (deadBolts.includes(boltId) || deadBugs.includes(bugId)) return;
                const dx = bolt.pos.x - b.pos.x;
                const dy = bolt.pos.y - b.pos.y;
                if (dx * dx + dy * dy < BOLT_HIT_R * BOLT_HIT_R) {
                    deadBolts.push(boltId);
                    b.hp -= 1;
                    if (b.hp <= 0) {
                        deadBugs.push(bugId);
                        spawnFx(b.pos, b.color);
                        spawnPopup(b.pos, b.points);
                        kills.current += 1;
                        const def = TARGET_TYPES.find((t) => t.kind === b.kind)!;
                        GAME_HOOKS.onKill({ kind: b.kind, name: def.name, points: b.points });
                        onScore(b.points);
                    } else {
                        // non-lethal — punch the color to a bright flash now;
                        // the per-frame decay below lerps it back to normal
                        b.flash = HIT_FLASH_DURATION;
                        const hitMesh = meshes.current.bugs.get(bugId);
                        if (hitMesh) {
                            hitMesh.traverse((child: any) => {
                                if (child.material?.color) child.material.color.set("#ffffff");
                            });
                        }
                    }
                }
            });
        });

        if (deadBolts.length || deadBugs.length) {
            deadBolts.forEach((id) => {
                data.current.bolts.delete(id);
                meshes.current.bolts.delete(id);
            });
            deadBugs.forEach((id) => {
                data.current.bugs.delete(id);
                meshes.current.bugs.delete(id);
            });
            setIds((s) => ({
                ...s,
                bolts: s.bolts.filter((id) => !deadBolts.includes(id)),
                bugs: s.bugs.filter((id) => !deadBugs.includes(id)),
            }));
        }

        // enemy bolts — advance, expire, collide with the ship
        const deadEnemyBolts: number[] = [];
        let enemyHitShip = false;
        let enemyHitColor = INK;
        data.current.enemyBolts.forEach((eb, id) => {
            eb.age += dt;
            eb.pos.x += eb.dir.x * ENEMY_BOLT_SPEED * dt;
            eb.pos.y += eb.dir.y * ENEMY_BOLT_SPEED * dt;
            const mesh = meshes.current.enemyBolts.get(id);
            if (mesh) mesh.position.set(eb.pos.x, eb.pos.y, 0);
            const dx = eb.pos.x - shipPos.current.x;
            const dy = eb.pos.y - shipPos.current.y;
            if (dx * dx + dy * dy < ENEMY_BOLT_HIT_R * ENEMY_BOLT_HIT_R) {
                deadEnemyBolts.push(id);
                enemyHitShip = true;
                enemyHitColor = eb.color;
            } else if (eb.age > ENEMY_BOLT_LIFE || Math.abs(eb.pos.x) > BX + 1 || Math.abs(eb.pos.y) > BY + 1) {
                deadEnemyBolts.push(id);
            }
        });
        if (deadEnemyBolts.length) {
            deadEnemyBolts.forEach((id) => {
                data.current.enemyBolts.delete(id);
                meshes.current.enemyBolts.delete(id);
            });
            setIds((s) => ({ ...s, enemyBolts: s.enemyBolts.filter((id) => !deadEnemyBolts.includes(id)) }));
        }
        if (enemyHitShip) {
            // cosmetic in chill (no lives there); in arcade it also costs a life,
            // consistent with bumping a bug — getting shot is worse than a bump
            spawnFx({ x: shipPos.current.x, y: shipPos.current.y }, enemyHitColor);
            onGlitch();
            if (!chill) onHitShip();
        }

        if (shipHit) {
            shipPos.current = { x: 0, y: 0 };
            onHitShip();
        }
    });

    return (
        <>
            <FieldBounds bx={bounds.current.x} by={bounds.current.y} />
            <Ship groupRef={(g) => (shipGroup.current = g)} />
            {ids.bugs.map((id) => {
                const b = data.current.bugs.get(id);
                if (!b) return null;
                return (
                    <Bug
                        key={id}
                        color={b.color}
                        setRef={(m) => {
                            if (!m) return;
                            meshes.current.bugs.set(id, m);
                            m.scale.setScalar(b.scale);
                        }}
                    />
                );
            })}
            {ids.bolts.map((id) => (
                <Bolt key={id} setRef={(m) => m && meshes.current.bolts.set(id, m)} />
            ))}
            {ids.enemyBolts.map((id) => {
                const eb = data.current.enemyBolts.get(id);
                if (!eb) return null;
                return (
                    <EnemyBolt
                        key={id}
                        color={eb.color}
                        setRef={(m) => m && meshes.current.enemyBolts.set(id, m)}
                    />
                );
            })}
            {ids.fx.map((id) => {
                const fx = data.current.fx.get(id);
                if (!fx) return null;
                return (
                    <Explosion
                        key={id}
                        position={[fx.pos.x, fx.pos.y, 0]}
                        color={fx.color}
                        onDone={() => removeFx(id)}
                    />
                );
            })}
            {ids.popups.map((id) => {
                const p = data.current.popups.get(id);
                if (!p) return null;
                return (
                    <ScorePopup
                        key={id}
                        position={[p.pos.x, p.pos.y, 0.3]}
                        amount={p.amount}
                        onDone={() => removePopup(id)}
                    />
                );
            })}
        </>
    );
}

/* ---------------------------------------------------------------- */
/* Asteroids — page shell: LabStage frame, HUD, start/game-over,      */
/* variant switch, and the screen-glitch overlay for enemy hits.      */
/* ---------------------------------------------------------------- */
export default function Asteroids() {
    const [variant, setVariant] = useState<Variant>("arcade");
    const [phase, setPhase] = useState<"ready" | "playing" | "gameover">("ready");
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [glitchNonce, setGlitchNonce] = useState(0);
    const canvasWrapRef = useRef<HTMLDivElement>(null);

    const start = useCallback(() => {
        setScore(0);
        setLives(3);
        setPhase("playing");
    }, []);

    const switchVariant = useCallback((v: Variant) => {
        setVariant(v);
        setPhase("ready");
        setScore(0);
        setLives(3);
    }, []);

    const onScore = useCallback((amount: number) => setScore((s) => s + amount), []);
    // fire the dev hook from an effect (not the setState updater, which
    // StrictMode invokes twice in dev) so it's called once per real change
    useEffect(() => {
        GAME_HOOKS.onScore(score);
    }, [score]);
    const onHitShip = useCallback(() => {
        setLives((l) => {
            const next = l - 1;
            if (next <= 0) {
                setPhase("gameover");
                return 0;
            }
            return next;
        });
    }, []);
    const onGlitch = useCallback(() => setGlitchNonce((n) => n + 1), []);

    // restart the (non-remounting) canvas shake on every glitch tick
    useEffect(() => {
        if (glitchNonce === 0) return;
        const el = canvasWrapRef.current;
        if (!el) return;
        el.classList.remove("ast-shake");
        void el.offsetWidth; // force reflow so the animation restarts
        el.classList.add("ast-shake");
        const t = setTimeout(() => el.classList.remove("ast-shake"), 340);
        return () => clearTimeout(t);
    }, [glitchNonce]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                if (phase !== "playing") start();
            } else if (e.code === "Digit1") {
                switchVariant("arcade");
            } else if (e.code === "Digit2") {
                switchVariant("chill");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase, start, switchVariant]);

    const chill = variant === "chill";

    return (
        <LabStage idx="01" title="asteroids — 3d" tag="game" hint="wasd move · space shoot">
            <div className="ast-wrap">
                <div className="ast-canvas-wrap" ref={canvasWrapRef}>
                    <Canvas camera={{ position: [0, -1.6, 9.5], fov: 48 }} gl={{ antialias: true }}>
                        <color attach="background" args={["#EEEAE0"]} />
                        <CameraRig />
                        <Game
                            phase={phase}
                            variant={variant}
                            onScore={onScore}
                            onHitShip={onHitShip}
                            onGlitch={onGlitch}
                        />
                    </Canvas>
                </div>

                {glitchNonce > 0 && (
                    <div key={glitchNonce} className="ast-glitch" aria-hidden>
                        <div className="ast-glitch-scan" />
                    </div>
                )}

                <div className="ast-hud">
                    <span className="ast-hud-item">
                        score — {String(score).padStart(3, "0")}
                    </span>

                    <div className="ast-variant">
                        <button
                            className={`ast-variant-btn${variant === "arcade" ? " is-on" : ""}`}
                            onClick={() => switchVariant("arcade")}
                            data-cursor="link"
                        >
                            variant — 01 / arcade
                        </button>
                        <button
                            className={`ast-variant-btn${variant === "chill" ? " is-on" : ""}`}
                            onClick={() => switchVariant("chill")}
                            data-cursor="link"
                        >
                            variant — 02 / chill
                        </button>
                    </div>

                    <span className="ast-hud-item ast-hud-lives">
                        {chill ? "lives — ∞" : `lives — ${"▲".repeat(Math.max(lives, 0)) || "—"}`}
                    </span>
                </div>

                {phase !== "playing" && (
                    <div className="ast-overlay">
                        <div className="ast-overlay-panel">
                            <span className="ast-overlay-label">
                                {phase === "gameover"
                                    ? "game over"
                                    : chill
                                      ? "asteroids — chill"
                                      : "asteroids — 3d"}
                            </span>
                            {phase === "gameover" && (
                                <span className="ast-overlay-score">
                                    final score — {String(score).padStart(3, "0")}
                                </span>
                            )}
                            <button className="ast-btn" onClick={start} data-cursor="link">
                                {phase === "gameover" ? "restart" : "start"}
                            </button>
                            <span className="ast-overlay-hint">wasd move · space shoot</span>
                            <span className="ast-overlay-hint">1 arcade · 2 chill</span>
                        </div>
                    </div>
                )}
            </div>
        </LabStage>
    );
}
