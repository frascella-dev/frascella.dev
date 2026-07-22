import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Color, Plane, Vector3 } from "three";

// ------------------------------------------------------------------
// interests — the pointer-driven cut of the lab's asteroids study
// (src/lab/experiments/asteroids, variant 02 / chill). Copied, not
// imported: the lab is a dev-only route and must keep working
// untouched, so this file owns its own tuned version.
//
// What's the same: the palette (ink hairlines, sparing orange/lime),
// the wireframe register, the three target types, the shard-burst
// explosions, the score popups, the enemy fire. The lab's screen
// glitch and life counter are gone — nothing here has stakes, so
// nothing needs to shout about them.
// Chill rules throughout — no lives, no game over, targets drift and
// never home in on you.
//
// What's different, and why:
//   1. Controls. No WASD, no spacebar — the pointer *is* the input.
//      The ship flies toward the cursor and its nose always points at
//      it, so the cursor is simultaneously destination and reticle;
//      left button fires along the nose. One input does everything,
//      which is the right ask for a small aside you poke at for ten
//      seconds, where rotate-and-thrust would just be homework.
//   2. No wrapping. The lab wraps at the bounds like classic
//      Asteroids; here the field is walled — ship and targets bounce
//      off, bolts die on contact. The walls themselves are drawn
//      nowhere: they sit exactly on the edges of the field, so the
//      rule is read off the layout instead of off a box.
//   3. Scale. The field is the width of the screen, so the camera sits
//      back far enough that the ship reads at ~70px and there's room
//      to fly rather than twitch.
//   4. No chrome. No frame, no start screen, no boundary box: the
//      field is drawn straight onto the page's paper, already
//      running, with only the score to read.
//   5. It sleeps. The frameloop idles unless the field is on screen.
// ------------------------------------------------------------------

const INK = "#111110";
const ACCENT = "#FF6B1A";
const ACCENT_2 = "#C7F651";

// ship
const SHIP_SPEED = 5.2; // world units/sec, cap
const SHIP_ACCEL = 7; // how hard it chases the cursor
const SHIP_TURN = 12; // nose lerp toward the cursor
const SHIP_DEADZONE = 0.22; // inside this it coasts to a stop
const SHIP_RADIUS = 0.44; // wall clearance (the cone is 0.85 tall, so its
// nose would otherwise cross the line) + enemy-bolt hit radius
const WALL_BOUNCE = 0.42; // energy kept when it kisses a wall

// weapons
const FIRE_COOLDOWN = 0.18;
const BOLT_SPEED = 12;
const BOLT_LIFE = 0.85;
const BOLT_HIT_R = 0.42;
const ENEMY_BOLT_SPEED = 5.6;
const ENEMY_BOLT_LIFE = 2.4;
const ENEMY_BOLT_HIT_R = 0.46;

const EXPLOSION_DURATION = 0.5;
const POPUP_DURATION_MS = 800;
const HIT_FLASH_DURATION = 0.22;

/** Chill population — same knobs, same intent, as the lab's CHILL_CONFIG,
 *  scaled up for a field that now runs the width of the screen: a handful
 *  more targets and a shorter interval, so the arena never reads as empty,
 *  and 10 000 points (the console unlock — see Interests.tsx) is a sitting
 *  rather than a grind. */
const CHILL = {
    startTargets: 4,
    minTargets: 3,
    maxTargets: 6,
    firstSpawnDelay: 0.6,
    spawnIntervalMin: 1.2,
    spawnIntervalMax: 2.4,
    drift: 0.22,
};

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
        weight: 94,
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
        weight: 5,
        scale: 1.15,
        fireIntervalMin: 2.4,
        fireIntervalMax: 3.6,
    },
    {
        kind: 3,
        name: "elite",
        color: ACCENT_2,
        hits: 3,
        points: 500,
        canShoot: true,
        weight: 1,
        scale: 1.3,
        fireIntervalMin: 1.7,
        fireIntervalMax: 2.6,
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

const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v;

/* ---------------------------------------------------------------- */
/* Ship — low-poly wireframe cone, nose (+Y) points at the cursor.   */
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
                <meshBasicMaterial
                    color={ACCENT_2}
                    wireframe
                    transparent
                    opacity={0.85}
                />
            </mesh>
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* Bug — squashed wireframe body, line legs + antennae, colored per  */
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

    // Decorative only — the root group (setRef) is owned by the sim, which
    // sets position/rotation every frame, so this never conflicts.
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
                <mesh position={[0, 0.24, 0]} scale={[0.55, 0.6, 0.55]}>
                    <octahedronGeometry args={[0.22, 0]} />
                    <meshBasicMaterial color={color} wireframe />
                </mesh>
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
                <Line
                    points={[
                        [-0.06, 0.36, 0],
                        [-0.16, 0.58, 0.04],
                    ]}
                    color={color}
                    lineWidth={1}
                />
                <Line
                    points={[
                        [0.06, 0.36, 0],
                        [0.16, 0.58, -0.04],
                    ]}
                    color={color}
                    lineWidth={1}
                />
            </group>
        </group>
    );
}

/* Bolt — solid accent tracer (player fire). Forward is local +X. */
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

/* EnemyBolt — small spinning wireframe diamond, colored per shooter. */
function EnemyBolt({
    setRef,
    color,
}: {
    setRef: (g: any) => void;
    color: string;
}) {
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

/* Explosion — the target's own wireframe bursting apart. Self-timed. */
type Shard = {
    dx: number;
    dy: number;
    spin: number;
    kind: "frag" | "bit";
    scale: number;
};

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
                        <meshBasicMaterial
                            color={color}
                            wireframe
                            transparent
                            opacity={1}
                        />
                    </mesh>
                ) : (
                    <mesh key={i} ref={(m) => (refs.current[i] = m)}>
                        <boxGeometry args={[0.16, 0.03, 0.03]} />
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={1}
                        />
                    </mesh>
                ),
            )}
        </group>
    );
}

/* ScorePopup — rises + fades via CSS keyframes. Self-timed. */
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
        <Html
            position={position}
            center
            pointerEvents="none"
            wrapperClass="ast-popup-wrap"
        >
            <span className="ast-popup">{amount}</span>
        </Html>
    );
}

// The lab's camera sits below the plane and looks back up at it, which is
// lovely for a wrapping field and wrong for a walled one: under perspective
// the z=0 plane resolves to a trapezoid, so the "walls" splay outwards and
// two of them fall outside the panel entirely. Here the camera is dead-on,
// so world bounds and the panel's frame are the same rectangle and the rule
// reads at a glance. Depth still comes from the wireframes themselves.

/* ---------------------------------------------------------------- */
/* Game — the sim. Positions are mutated imperatively on refs every  */
/* frame; React state only tracks which entities exist.              */
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
type BoltData = {
    pos: { x: number; y: number };
    dir: { x: number; y: number };
    age: number;
};
type EnemyBoltData = BoltData & { color: string };
type FxData = { pos: { x: number; y: number }; color: string };
type PopupData = { pos: { x: number; y: number }; amount: number };

function buildBug(
    pos: { x: number; y: number },
    vel: { x: number; y: number },
    def: TargetTypeDef,
): BugData {
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
            ? def.fireIntervalMin +
              Math.random() * (def.fireIntervalMax - def.fireIntervalMin)
            : Infinity,
        scale: def.scale,
        flash: 0,
    };
}

const AIM_PLANE = new Plane(new Vector3(0, 0, 1), 0);
const AIM_HIT = new Vector3();

function Game({
    active,
    spawning,
    firing,
    onScore,
}: {
    /** on screen — the sim holds still off screen, but is NOT reset: come
     *  back and you pick the same field up where you left it. */
    active: boolean;
    /** False once the bonus has been earned: the spawner stops and the field
     *  empties out as you clear it. Nothing else changes — what's already up
     *  there still drifts, still shoots, still counts. */
    spawning: boolean;
    firing: React.MutableRefObject<boolean>;
    onScore: (amount: number) => void;
}) {
    const { viewport } = useThree();
    const bounds = useRef({ x: 5, y: 3 });
    bounds.current.x = Math.max(2.6, viewport.width / 2 - 0.1);
    bounds.current.y = Math.max(1.9, viewport.height / 2 - 0.1);

    const shipGroup = useRef<any>(null);
    const shipPos = useRef({ x: 0, y: -1.2 });
    const shipVel = useRef({ x: 0, y: 0 });
    const shipDir = useRef({ x: 0, y: 1 });
    const aim = useRef({ x: 0, y: 0.8 });
    const fireCooldown = useRef(0);
    const spawnTimer = useRef(CHILL.firstSpawnDelay);

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
    }>({ bugs: [], bolts: [], enemyBolts: [], fx: [], popups: [] });

    /** One calm target, placed clear of the ship, drifting nowhere in
     *  particular — the chill spawner, same as the lab's. */
    const spawnChillBug = () => {
        const { x: BX, y: BY } = bounds.current;
        let pos = { x: 0, y: 0 };
        let tries = 0;
        do {
            pos = {
                x: (Math.random() * 2 - 1) * BX * 0.78,
                y: (Math.random() * 2 - 1) * BY * 0.78,
            };
            tries += 1;
        } while (
            Math.hypot(pos.x - shipPos.current.x, pos.y - shipPos.current.y) <
                1.6 &&
            tries < 8
        );
        const a = Math.random() * Math.PI * 2;
        const vel = {
            x: Math.cos(a) * CHILL.drift,
            y: Math.sin(a) * CHILL.drift,
        };
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
        shipPos.current = { x: 0, y: -1.2 };
        shipVel.current = { x: 0, y: 0 };
        shipDir.current = { x: 0, y: 1 };
        fireCooldown.current = 0;
        spawnTimer.current = CHILL.firstSpawnDelay;
        const seeded: number[] = [];
        for (let i = 0; i < CHILL.startTargets; i++)
            seeded.push(spawnChillBug());
        setIds({ bugs: seeded, bolts: [], enemyBolts: [], fx: [], popups: [] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // one seeding, on mount — the run never stops and never restarts
    useEffect(() => {
        resetSim();
    }, [resetSim]);

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

    useFrame((state, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const { x: BX, y: BY } = bounds.current;

        // Where the cursor is, in world space. state.pointer is NDC, updated
        // by r3f from pointer events on the canvas only — so leaving the
        // panel simply parks the ship at the last aim instead of dragging it
        // across the page. Ray-cast rather than a linear map because the
        // camera is off-axis (below the plane, looking back at the origin).
        state.raycaster.setFromCamera(state.pointer as any, state.camera);
        if (state.raycaster.ray.intersectPlane(AIM_PLANE, AIM_HIT)) {
            aim.current.x = clamp(AIM_HIT.x, -BX, BX);
            aim.current.y = clamp(AIM_HIT.y, -BY, BY);
        }

        if (!active) return;

        // --- ship: chase the cursor, nose always pointing at it ---------
        const tox = aim.current.x - shipPos.current.x;
        const toy = aim.current.y - shipPos.current.y;
        const dist = Math.hypot(tox, toy);
        const moving = dist > SHIP_DEADZONE;
        if (dist > 0.001) {
            const nx = tox / dist;
            const ny = toy / dist;
            shipDir.current.x +=
                (nx - shipDir.current.x) * Math.min(1, dt * SHIP_TURN);
            shipDir.current.y +=
                (ny - shipDir.current.y) * Math.min(1, dt * SHIP_TURN);
            const dl = Math.hypot(shipDir.current.x, shipDir.current.y) || 1;
            shipDir.current.x /= dl;
            shipDir.current.y /= dl;
            if (moving) {
                // speed tapers with distance, so it arrives instead of
                // overshooting and oscillating around the cursor
                const speed = Math.min(SHIP_SPEED, dist * 3.4);
                shipVel.current.x +=
                    (nx * speed - shipVel.current.x) *
                    Math.min(1, dt * SHIP_ACCEL);
                shipVel.current.y +=
                    (ny * speed - shipVel.current.y) *
                    Math.min(1, dt * SHIP_ACCEL);
            }
        }
        if (!moving) {
            const damp = 1 - Math.min(1, dt * 6);
            shipVel.current.x *= damp;
            shipVel.current.y *= damp;
        }
        shipPos.current.x += shipVel.current.x * dt;
        shipPos.current.y += shipVel.current.y * dt;

        // --- walls: hard stop, small bounce, and the edge lights up -----
        const wx = BX - SHIP_RADIUS;
        const wy = BY - SHIP_RADIUS;
        if (shipPos.current.x > wx) {
            shipPos.current.x = wx;
            shipVel.current.x = -Math.abs(shipVel.current.x) * WALL_BOUNCE;
        } else if (shipPos.current.x < -wx) {
            shipPos.current.x = -wx;
            shipVel.current.x = Math.abs(shipVel.current.x) * WALL_BOUNCE;
        }
        if (shipPos.current.y > wy) {
            shipPos.current.y = wy;
            shipVel.current.y = -Math.abs(shipVel.current.y) * WALL_BOUNCE;
        } else if (shipPos.current.y < -wy) {
            shipPos.current.y = -wy;
            shipVel.current.y = Math.abs(shipVel.current.y) * WALL_BOUNCE;
        }

        if (shipGroup.current) {
            shipGroup.current.position.set(
                shipPos.current.x,
                shipPos.current.y,
                0,
            );
            shipGroup.current.rotation.z =
                Math.atan2(shipDir.current.y, shipDir.current.x) - Math.PI / 2;
            shipGroup.current.userData.moving = moving;
        }

        // --- fire (left button held) ------------------------------------
        fireCooldown.current -= dt;
        if (firing.current && fireCooldown.current <= 0) {
            fireCooldown.current = FIRE_COOLDOWN;
            const id = nextId();
            const dir = { x: shipDir.current.x, y: shipDir.current.y };
            data.current.bolts.set(id, {
                pos: {
                    x: shipPos.current.x + dir.x * 0.55,
                    y: shipPos.current.y + dir.y * 0.55,
                },
                dir,
                age: 0,
            });
            setIds((s) => ({ ...s, bolts: [...s.bolts, id] }));
        }

        // --- player bolts: advance, die on the walls --------------------
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
            if (Math.abs(b.pos.x) >= BX || Math.abs(b.pos.y) >= BY) {
                // bolts don't bounce — they spend themselves on the wall
                deadBolts.push(id);
            } else if (b.age > BOLT_LIFE) {
                deadBolts.push(id);
            }
        });

        // --- spawn ------------------------------------------------------
        spawnTimer.current -= dt;
        const wantForce = spawning && data.current.bugs.size < CHILL.minTargets;
        if (
            spawning &&
            (wantForce || spawnTimer.current <= 0) &&
            data.current.bugs.size < CHILL.maxTargets
        ) {
            const id = spawnChillBug();
            spawnTimer.current = wantForce
                ? 0.5
                : CHILL.spawnIntervalMin +
                  Math.random() *
                      (CHILL.spawnIntervalMax - CHILL.spawnIntervalMin);
            setIds((s) => ({ ...s, bugs: [...s.bugs, id] }));
        }

        // --- targets: drift, bounce off the walls, shoot back -----------
        const deadBugs: number[] = [];
        data.current.bugs.forEach((b, id) => {
            b.pos.x += b.vel.x * dt;
            b.pos.y += b.vel.y * dt;
            const bwx = BX - 0.34;
            const bwy = BY - 0.34;
            if (b.pos.x > bwx || b.pos.x < -bwx) {
                b.pos.x = clamp(b.pos.x, -bwx, bwx);
                b.vel.x *= -1;
            }
            if (b.pos.y > bwy || b.pos.y < -bwy) {
                b.pos.y = clamp(b.pos.y, -bwy, bwy);
                b.vel.y *= -1;
            }

            const mesh = meshes.current.bugs.get(id);
            if (mesh) {
                mesh.position.set(b.pos.x, b.pos.y, 0);
                mesh.rotation.z = Math.atan2(b.vel.y, b.vel.x) - Math.PI / 2;
                if (b.flash > 0) {
                    b.flash = Math.max(0, b.flash - dt);
                    const s = b.flash / HIT_FLASH_DURATION;
                    mesh.position.x += (Math.random() - 0.5) * 0.06 * s;
                    mesh.position.y += (Math.random() - 0.5) * 0.06 * s;
                    mesh.traverse((child: any) => {
                        if (child.material?.color)
                            child.material.color.lerp(b.colorObj, dt * 9);
                    });
                }
            }

            if (b.canShoot) {
                b.fireCooldown -= dt;
                if (b.fireCooldown <= 0) {
                    const def = TARGET_TYPES.find((t) => t.kind === b.kind)!;
                    b.fireCooldown =
                        def.fireIntervalMin +
                        Math.random() *
                            (def.fireIntervalMax - def.fireIntervalMin);
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
                    setIds((s) => ({
                        ...s,
                        enemyBolts: [...s.enemyBolts, ebId],
                    }));
                }
            }
        });

        // --- collisions: player bolts vs targets ------------------------
        data.current.bolts.forEach((bolt, boltId) => {
            if (deadBolts.includes(boltId)) return;
            data.current.bugs.forEach((b, bugId) => {
                if (deadBolts.includes(boltId) || deadBugs.includes(bugId))
                    return;
                const dx = bolt.pos.x - b.pos.x;
                const dy = bolt.pos.y - b.pos.y;
                if (dx * dx + dy * dy < BOLT_HIT_R * BOLT_HIT_R) {
                    deadBolts.push(boltId);
                    b.hp -= 1;
                    if (b.hp <= 0) {
                        deadBugs.push(bugId);
                        spawnFx(b.pos, b.color);
                        spawnPopup(b.pos, b.points);
                        onScore(b.points);
                    } else {
                        b.flash = HIT_FLASH_DURATION;
                        const hitMesh = meshes.current.bugs.get(bugId);
                        if (hitMesh) {
                            hitMesh.traverse((child: any) => {
                                if (child.material?.color)
                                    child.material.color.set("#ffffff");
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

        // --- enemy bolts -------------------------------------------------
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
            } else if (
                eb.age > ENEMY_BOLT_LIFE ||
                Math.abs(eb.pos.x) >= BX ||
                Math.abs(eb.pos.y) >= BY
            ) {
                deadEnemyBolts.push(id);
            }
        });
        if (deadEnemyBolts.length) {
            deadEnemyBolts.forEach((id) => {
                data.current.enemyBolts.delete(id);
                meshes.current.enemyBolts.delete(id);
            });
            setIds((s) => ({
                ...s,
                enemyBolts: s.enemyBolts.filter(
                    (id) => !deadEnemyBolts.includes(id),
                ),
            }));
        }
        if (enemyHitShip) {
            // chill: cosmetic only — there is nothing to lose. A small burst
            // where it landed, and that's the whole consequence.
            spawnFx(
                { x: shipPos.current.x, y: shipPos.current.y },
                enemyHitColor,
            );
        }
    });

    return (
        <>
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
                <Bolt
                    key={id}
                    setRef={(m) => m && meshes.current.bolts.set(id, m)}
                />
            ))}
            {ids.enemyBolts.map((id) => {
                const eb = data.current.enemyBolts.get(id);
                if (!eb) return null;
                return (
                    <EnemyBolt
                        key={id}
                        color={eb.color}
                        setRef={(m) =>
                            m && meshes.current.enemyBolts.set(id, m)
                        }
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
/* The panel: canvas + HUD + the "click to start" plate.             */
/* `visible` comes from the section — when the panel scrolls off the */
/* screen the frameloop stops entirely, so an idle game costs        */
/* nothing while you read the rest of the page.                      */
/* ---------------------------------------------------------------- */
export default function InterestsAsteroids({
    visible = true,
    spawning = true,
    onScore,
}: {
    visible?: boolean;
    /** Section-owned: goes false once the bonus score is in. */
    spawning?: boolean;
    /** Called with the new running total on every kill — the section owns the
     *  readout (it's rendered big, under the field) and the bonus threshold. */
    onScore?: (total: number) => void;
}) {
    const total = useRef(0);
    const firing = useRef(false);

    const addScore = useCallback(
        (amount: number) => {
            total.current += amount;
            onScore?.(total.current);
        },
        [onScore],
    );

    // No start screen: the field is already live when you reach it. The only
    // input is the pointer, so there is nothing to explain that a moment of
    // moving the mouse doesn't explain better.
    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        // Deliberately NOT preventDefault() here: cancelling pointerdown also
        // cancels the compatibility mouse events, and the site's custom cursor
        // (CustomCursor.tsx) listens on window mousemove — so the crosshair
        // would freeze in place for as long as you held fire. Text selection
        // is handled with user-select: none on the play area instead.
        firing.current = true;
    };
    const stopFiring = () => {
        firing.current = false;
    };

    useEffect(() => {
        const up = () => stopFiring();
        window.addEventListener("pointerup", up);
        window.addEventListener("blur", up);
        return () => {
            window.removeEventListener("pointerup", up);
            window.removeEventListener("blur", up);
        };
    }, []);

    // scrolled away mid-run: drop the trigger, keep the field
    useEffect(() => {
        if (!visible) firing.current = false;
    }, [visible]);

    return (
        <div
            className="ast-wrap"
            data-cursor="crosshair"
            onPointerDown={onPointerDown}
            onPointerUp={stopFiring}
            onPointerLeave={stopFiring}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="ast-canvas-wrap">
                {/* frameloop "demand" (not "never") off-screen: one frame is
                    still drawn on mount, so the field is never blank — it just
                    stops animating until it's back in view. */}
                <Canvas
                    camera={{ position: [0, 0, 10.8], fov: 46 }}
                    gl={{ alpha: true, antialias: true }}
                    dpr={[1, 2]}
                    frameloop={visible ? "always" : "demand"}
                >
                    <Game
                        active={visible}
                        spawning={spawning}
                        firing={firing}
                        onScore={addScore}
                    />
                </Canvas>
            </div>
        </div>
    );
}
