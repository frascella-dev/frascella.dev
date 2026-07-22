import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import LabStage from "../../LabStage.tsx";
import "./pong.css";

// ------------------------------------------------------------------
// pong — 3d. The console's pong (src/games/Pong.tsx) replayed in the
// asteroids rendering register: paper field, thin ink wireframe, the
// same orange/lime accents, shard bursts, score popups and the on-hit
// glitch. Nothing here is filled-block CRT — that look belongs to the
// shipped console game and is deliberately left alone.
//
// Two variants, switchable in-scene (buttons or 1/2 keys):
//   01 / cpu — left paddle is you (W/S or arrows), right paddle is the
//     same capped-speed tracker the console game uses, so it's beatable.
//   02 / two-player — W/S drives the left paddle, arrows the right.
//
// Rules and physics are a faithful copy of the shipped game (same
// logical field, same serve, bounce and AI constants). They're copied,
// not imported: the console version bakes its 2D canvas drawing into
// the same effect as its step loop, and prying them apart risks
// regressing a game that already ships. The constants below are the
// seam — keep them in sync by hand if the console game is retuned.
// ------------------------------------------------------------------

const INK = "#111110";
const ACCENT = "#FF6B1A";
const ACCENT_2 = "#C7F651";

type Variant = "cpu" | "2p";

/* ---- rules, mirrored from src/games/Pong.tsx ------------------- */
const W = 1000;
const H = 620;
const PADDLE_W = 14;
const PADDLE_H = 110;
const BALL_R = 9;
const PLAYER_X = 34;
const CPU_X = W - 34 - PADDLE_W;
const WIN_SCORE = 7;
const PADDLE_SPEED = 8.5;
const CPU_MAX_SPEED = 6.4;

// The console game steps once per animation frame with per-frame deltas.
// Here the sim runs on a fixed 60Hz accumulator instead, so the numbers
// above keep their meaning on any refresh rate.
const TICK = 1 / 60;
const MAX_TICKS = 5;

const EXPLOSION_DURATION = 0.45;
const POPUP_DURATION_MS = 800;
const TRAIL_LEN = 10;

type Sim = {
    ballX: number;
    ballY: number;
    vx: number;
    vy: number;
    leftY: number;
    rightY: number;
    leftScore: number;
    rightScore: number;
};

function serve(s: Sim, toLeft: boolean) {
    s.ballX = W / 2;
    s.ballY = H / 2;
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
    const speed = 7.2;
    s.vx = (toLeft ? -1 : 1) * speed * Math.cos(angle);
    s.vy = speed * Math.sin(angle);
}

function makeSim(): Sim {
    const s: Sim = {
        ballX: W / 2,
        ballY: H / 2,
        vx: 0,
        vy: 0,
        leftY: H / 2,
        rightY: H / 2,
        leftScore: 0,
        rightScore: 0,
    };
    serve(s, Math.random() < 0.5);
    return s;
}

const clampPaddle = (y: number) => Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, y));

// Logical field coords are top-left origin (as in the console game);
// the scene group is centred, so flip Y and offset X on the way in.
const wx = (x: number) => x - W / 2;
const wy = (y: number) => H / 2 - y;

const KEY_MAP: Record<string, "lUp" | "lDown" | "rUp" | "rDown"> = {
    KeyW: "lUp",
    KeyS: "lDown",
    ArrowUp: "rUp",
    ArrowDown: "rDown",
};

/* ---------------------------------------------------------------- */
/* Paddle — ink wireframe slab with a solid accent core, the same    */
/* "wireframe body + one accent detail" build as the asteroids ship. */
/* ---------------------------------------------------------------- */
function Paddle({ setRef, color }: { setRef: (g: any) => void; color: string }) {
    return (
        <group ref={setRef}>
            <mesh>
                <boxGeometry args={[PADDLE_W, PADDLE_H, PADDLE_W]} />
                <meshBasicMaterial color={INK} wireframe />
            </mesh>
            <mesh>
                <boxGeometry args={[PADDLE_W * 0.34, PADDLE_H * 0.62, PADDLE_W * 0.34]} />
                <meshBasicMaterial color={color} />
            </mesh>
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* Ball — tumbling wireframe gem with a solid orange core, trailing  */
/* the same fading tracer bits the asteroids bolts leave behind.     */
/* ---------------------------------------------------------------- */
function Ball({ setRef }: { setRef: (g: any) => void }) {
    const spin = useRef<any>(null);
    useFrame((_, dt) => {
        if (!spin.current) return;
        spin.current.rotation.x += dt * 3.4;
        spin.current.rotation.y += dt * 2.6;
    });
    return (
        <group ref={setRef}>
            <group ref={spin}>
                <mesh>
                    <octahedronGeometry args={[BALL_R * 2.2, 0]} />
                    <meshBasicMaterial color={ACCENT} wireframe />
                </mesh>
                <mesh>
                    <octahedronGeometry args={[BALL_R * 0.7, 0]} />
                    <meshBasicMaterial color={ACCENT} />
                </mesh>
            </group>
        </group>
    );
}

function Trail({ setRef }: { setRef: (m: any, i: number) => void }) {
    return (
        <>
            {Array.from({ length: TRAIL_LEN }, (_, i) => (
                <mesh key={i} ref={(m) => setRef(m, i)}>
                    <boxGeometry args={[BALL_R * 1.2, BALL_R * 0.5, BALL_R * 0.5]} />
                    <meshBasicMaterial
                        color={ACCENT}
                        transparent
                        opacity={0.35 * (1 - i / TRAIL_LEN)}
                    />
                </mesh>
            ))}
        </>
    );
}

/* ---------------------------------------------------------------- */
/* Explosion — wireframe fragments + line bits scattering outward,   */
/* shrinking and fading. Same burst language as asteroids kills.     */
/* ---------------------------------------------------------------- */
type Shard = { dx: number; dy: number; spin: number; kind: "frag" | "bit"; scale: number };

function makeShards(count: number, spread: number): Shard[] {
    return Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = (0.7 + Math.random() * 0.9) * spread;
        return {
            dx: Math.cos(a) * r,
            dy: Math.sin(a) * r,
            spin: (Math.random() - 0.5) * 6,
            kind: Math.random() < 0.55 ? "frag" : "bit",
            scale: 0.6 + Math.random() * 0.7,
        };
    });
}

function Explosion({
    position,
    color,
    count,
    spread,
    onDone,
}: {
    position: [number, number, number];
    color: string;
    count: number;
    spread: number;
    onDone: () => void;
}) {
    const [shards] = useState(() => makeShards(count, spread));
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
                        <octahedronGeometry args={[BALL_R * 1.1, 0]} />
                        <meshBasicMaterial color={color} wireframe transparent opacity={1} />
                    </mesh>
                ) : (
                    <mesh key={i} ref={(m) => (refs.current[i] = m)}>
                        <boxGeometry args={[BALL_R * 2, BALL_R * 0.36, BALL_R * 0.36]} />
                        <meshBasicMaterial color={color} transparent opacity={1} />
                    </mesh>
                ),
            )}
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* ScorePopup — rises + fades via CSS keyframes, coloured by scorer. */
/* ---------------------------------------------------------------- */
function ScorePopup({
    position,
    label,
    color,
    onDone,
}: {
    position: [number, number, number];
    label: string;
    color: string;
    onDone: () => void;
}) {
    useEffect(() => {
        const t = setTimeout(onDone, POPUP_DURATION_MS);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <Html position={position} center pointerEvents="none" wrapperClass="png-popup-wrap">
            <span className="png-popup" style={{ color }}>
                {label}
            </span>
        </Html>
    );
}

/* ---------------------------------------------------------------- */
/* Field — the wrap-free boundary plus the dashed centre line, both  */
/* in the faint ink stroke asteroids uses for its bounds.            */
/* ---------------------------------------------------------------- */
const DASH = 22;
const GAP = 20;

function Field() {
    const rect: [number, number, number][] = [
        [wx(0), wy(H), 0],
        [wx(W), wy(H), 0],
        [wx(W), wy(0), 0],
        [wx(0), wy(0), 0],
        [wx(0), wy(H), 0],
    ];
    const dashes: [number, number][] = [];
    for (let y = 0; y < H; y += DASH + GAP) dashes.push([y, Math.min(H, y + DASH)]);

    return (
        <>
            <Line points={rect} color={INK} lineWidth={1} transparent opacity={0.22} />
            {dashes.map(([a, b], i) => (
                <Line
                    key={i}
                    points={[
                        [0, wy(a), 0],
                        [0, wy(b), 0],
                    ]}
                    color={INK}
                    lineWidth={1}
                    transparent
                    opacity={0.18}
                />
            ))}
        </>
    );
}

function CameraRig() {
    useFrame(({ camera }) => camera.lookAt(0, 0, 0));
    return null;
}

/* ---------------------------------------------------------------- */
/* Game — the sim. Same imperative approach as asteroids: refs are   */
/* mutated every frame, React state only tracks which fx exist.      */
/* ---------------------------------------------------------------- */
type FxData = { x: number; y: number; color: string; count: number; spread: number };
type PopupData = { x: number; y: number; label: string; color: string };

function Game({
    phase,
    variant,
    onScore,
    onConcede,
    onWin,
}: {
    phase: "ready" | "playing" | "gameover";
    variant: Variant;
    onScore: (left: number, right: number) => void;
    onConcede: () => void;
    onWin: (leftWon: boolean) => void;
}) {
    const { viewport } = useThree();
    // One uniform scale keeps the logical field's aspect ratio intact and
    // letterboxes it inside whatever the stage gives us.
    const fit = Math.min((viewport.width * 0.94) / W, (viewport.height * 0.9) / H);

    const keys = useRef({ lUp: false, lDown: false, rUp: false, rDown: false });
    useEffect(() => {
        const set = (e: KeyboardEvent, down: boolean) => {
            const k = KEY_MAP[e.code];
            if (!k) return;
            e.preventDefault();
            keys.current[k] = down;
        };
        const kd = (e: KeyboardEvent) => set(e, true);
        const ku = (e: KeyboardEvent) => set(e, false);
        window.addEventListener("keydown", kd);
        window.addEventListener("keyup", ku);
        return () => {
            window.removeEventListener("keydown", kd);
            window.removeEventListener("keyup", ku);
        };
    }, []);

    const sim = useRef<Sim>(makeSim());
    const acc = useRef(0);
    const leftRef = useRef<any>(null);
    const rightRef = useRef<any>(null);
    const ballRef = useRef<any>(null);
    const trailRefs = useRef<any[]>([]);
    const history = useRef<{ x: number; y: number }[]>([]);

    const idCounter = useRef(0);
    const [fx, setFx] = useState<{ id: number; data: FxData }[]>([]);
    const [popups, setPopups] = useState<{ id: number; data: PopupData }[]>([]);

    const spawnFx = (data: FxData) => {
        const id = ++idCounter.current;
        setFx((s) => [...s, { id, data }]);
    };
    const spawnPopup = (data: PopupData) => {
        const id = ++idCounter.current;
        setPopups((s) => [...s, { id, data }]);
    };
    const removeFx = useCallback((id: number) => setFx((s) => s.filter((f) => f.id !== id)), []);
    const removePopup = useCallback(
        (id: number) => setPopups((s) => s.filter((p) => p.id !== id)),
        [],
    );

    const reset = useCallback(() => {
        sim.current = makeSim();
        acc.current = 0;
        history.current = [];
        setFx([]);
        setPopups([]);
        onScore(0, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // fresh sim on every run, and on variant switch so a half-played cpu
    // match doesn't bleed into a two-player one behind the overlay
    useEffect(() => {
        if (phase === "playing") reset();
    }, [phase, reset]);
    useEffect(() => {
        reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant]);

    // one fixed 60Hz tick — the console game's step loop, verbatim
    const tick = () => {
        const s = sim.current;
        const k = keys.current;

        // in cpu mode the arrows double as the player's keys, as the console
        // game does; in two-player they belong to the right paddle
        const leftUp = k.lUp || (variant === "cpu" && k.rUp);
        const leftDown = k.lDown || (variant === "cpu" && k.rDown);
        if (leftUp) s.leftY -= PADDLE_SPEED;
        if (leftDown) s.leftY += PADDLE_SPEED;
        s.leftY = clampPaddle(s.leftY);

        if (variant === "2p") {
            if (k.rUp) s.rightY -= PADDLE_SPEED;
            if (k.rDown) s.rightY += PADDLE_SPEED;
            s.rightY = clampPaddle(s.rightY);
        }

        s.ballX += s.vx;
        s.ballY += s.vy;

        // walls
        if (s.ballY - BALL_R < 0) {
            s.ballY = BALL_R;
            s.vy *= -1;
            spawnFx({ x: s.ballX, y: 0, color: INK, count: 4, spread: 0.5 });
        }
        if (s.ballY + BALL_R > H) {
            s.ballY = H - BALL_R;
            s.vy *= -1;
            spawnFx({ x: s.ballX, y: H, color: INK, count: 4, spread: 0.5 });
        }

        // left paddle
        if (
            s.vx < 0 &&
            s.ballX - BALL_R <= PLAYER_X + PADDLE_W &&
            s.ballX - BALL_R >= PLAYER_X - 8 &&
            Math.abs(s.ballY - s.leftY) <= PADDLE_H / 2 + BALL_R
        ) {
            s.ballX = PLAYER_X + PADDLE_W + BALL_R;
            const rel = (s.ballY - s.leftY) / (PADDLE_H / 2);
            const speed = Math.min(15, Math.hypot(s.vx, s.vy) * 1.05);
            const angle = rel * (Math.PI / 3.4);
            s.vx = Math.abs(speed * Math.cos(angle));
            s.vy = speed * Math.sin(angle);
            spawnFx({ x: s.ballX, y: s.ballY, color: ACCENT, count: 6, spread: 0.7 });
        }

        // right paddle
        if (
            s.vx > 0 &&
            s.ballX + BALL_R >= CPU_X &&
            s.ballX + BALL_R <= CPU_X + PADDLE_W + 8 &&
            Math.abs(s.ballY - s.rightY) <= PADDLE_H / 2 + BALL_R
        ) {
            s.ballX = CPU_X - BALL_R;
            const rel = (s.ballY - s.rightY) / (PADDLE_H / 2);
            const speed = Math.min(15, Math.hypot(s.vx, s.vy) * 1.05);
            const angle = rel * (Math.PI / 3.4);
            s.vx = -Math.abs(speed * Math.cos(angle));
            s.vy = speed * Math.sin(angle);
            spawnFx({ x: s.ballX, y: s.ballY, color: ACCENT_2, count: 6, spread: 0.7 });
        }

        // scoring
        if (s.ballX < -BALL_R * 2) {
            s.rightScore++;
            spawnFx({ x: 0, y: s.ballY, color: ACCENT_2, count: 14, spread: 1.6 });
            spawnPopup({ x: PLAYER_X + 120, y: s.ballY, label: "+1", color: ACCENT_2 });
            onScore(s.leftScore, s.rightScore);
            // conceding is the moment that stings — same glitch/shake feedback
            // asteroids gives a hit ship
            onConcede();
            if (s.rightScore >= WIN_SCORE) onWin(false);
            else serve(s, false);
            history.current = [];
        }
        if (s.ballX > W + BALL_R * 2) {
            s.leftScore++;
            spawnFx({ x: W, y: s.ballY, color: ACCENT, count: 14, spread: 1.6 });
            spawnPopup({ x: CPU_X - 120, y: s.ballY, label: "+1", color: ACCENT });
            onScore(s.leftScore, s.rightScore);
            if (s.leftScore >= WIN_SCORE) onWin(true);
            else serve(s, true);
            history.current = [];
        }

        // right paddle AI — tracks the ball at a capped speed, recentres
        // while the ball travels away, so it stays beatable
        if (variant === "cpu") {
            const target = s.vx > 0 ? s.ballY : H / 2;
            const diff = target - s.rightY;
            s.rightY += Math.max(-CPU_MAX_SPEED, Math.min(CPU_MAX_SPEED, diff * 0.09));
            s.rightY = clampPaddle(s.rightY);
        }
    };

    useFrame((_, rawDt) => {
        const s = sim.current;

        if (phase === "playing") {
            acc.current += Math.min(rawDt, 0.1);
            let steps = 0;
            while (acc.current >= TICK && steps < MAX_TICKS) {
                acc.current -= TICK;
                steps += 1;
                tick();
            }
            history.current.unshift({ x: s.ballX, y: s.ballY });
            history.current.length = Math.min(history.current.length, TRAIL_LEN);
        }

        if (leftRef.current) leftRef.current.position.set(wx(PLAYER_X + PADDLE_W / 2), wy(s.leftY), 0);
        if (rightRef.current) rightRef.current.position.set(wx(CPU_X + PADDLE_W / 2), wy(s.rightY), 0);
        if (ballRef.current) {
            ballRef.current.position.set(wx(s.ballX), wy(s.ballY), 0);
            ballRef.current.visible = phase === "playing";
        }
        trailRefs.current.forEach((m, i) => {
            if (!m) return;
            const p = history.current[i];
            m.visible = phase === "playing" && !!p;
            if (!p) return;
            m.position.set(wx(p.x), wy(p.y), 0);
            m.rotation.z = Math.atan2(s.vy, s.vx);
        });
    });

    return (
        <group scale={fit}>
            <Field />
            <Paddle setRef={(g) => (leftRef.current = g)} color={ACCENT} />
            <Paddle setRef={(g) => (rightRef.current = g)} color={ACCENT_2} />
            <Trail setRef={(m, i) => (trailRefs.current[i] = m)} />
            <Ball setRef={(g) => (ballRef.current = g)} />
            {fx.map(({ id, data }) => (
                <Explosion
                    key={id}
                    position={[wx(data.x), wy(data.y), 0]}
                    color={data.color}
                    count={data.count}
                    spread={data.spread * BALL_R * 4}
                    onDone={() => removeFx(id)}
                />
            ))}
            {popups.map(({ id, data }) => (
                <ScorePopup
                    key={id}
                    position={[wx(data.x), wy(data.y), 0.3]}
                    label={data.label}
                    color={data.color}
                    onDone={() => removePopup(id)}
                />
            ))}
        </group>
    );
}

/* ---------------------------------------------------------------- */
/* Pong — page shell: LabStage frame, HUD, start/game-over overlay,   */
/* variant switch, and the concede glitch.                            */
/* ---------------------------------------------------------------- */
export default function Pong() {
    const [variant, setVariant] = useState<Variant>("cpu");
    const [phase, setPhase] = useState<"ready" | "playing" | "gameover">("ready");
    const [score, setScore] = useState({ left: 0, right: 0 });
    const [leftWon, setLeftWon] = useState(false);
    const [glitchNonce, setGlitchNonce] = useState(0);
    const canvasWrapRef = useRef<HTMLDivElement>(null);

    const start = useCallback(() => {
        setScore({ left: 0, right: 0 });
        setPhase("playing");
    }, []);

    const switchVariant = useCallback((v: Variant) => {
        setVariant(v);
        setPhase("ready");
        setScore({ left: 0, right: 0 });
    }, []);

    const onScore = useCallback((left: number, right: number) => setScore({ left, right }), []);
    const onConcede = useCallback(() => setGlitchNonce((n) => n + 1), []);
    const onWin = useCallback((won: boolean) => {
        setLeftWon(won);
        setPhase("gameover");
    }, []);

    // restart the (non-remounting) canvas shake on every concede
    useEffect(() => {
        if (glitchNonce === 0) return;
        const el = canvasWrapRef.current;
        if (!el) return;
        el.classList.remove("png-shake");
        void el.offsetWidth; // force reflow so the animation restarts
        el.classList.add("png-shake");
        const t = setTimeout(() => el.classList.remove("png-shake"), 340);
        return () => clearTimeout(t);
    }, [glitchNonce]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                if (phase !== "playing") start();
            } else if (e.code === "Digit1") {
                switchVariant("cpu");
            } else if (e.code === "Digit2") {
                switchVariant("2p");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase, start, switchVariant]);

    const twoPlayer = variant === "2p";

    return (
        <LabStage
            idx="05"
            title="pong — 3d"
            tag="game"
            hint={twoPlayer ? "w/s · ↑/↓ · space serve" : "w/s move · space serve"}
        >
            <div className="png-wrap">
                <div className="png-canvas-wrap" ref={canvasWrapRef}>
                    <Canvas camera={{ position: [0, -1.2, 9.5], fov: 48 }} gl={{ antialias: true }}>
                        <color attach="background" args={["#EEEAE0"]} />
                        <CameraRig />
                        <Game
                            phase={phase}
                            variant={variant}
                            onScore={onScore}
                            onConcede={onConcede}
                            onWin={onWin}
                        />
                    </Canvas>
                </div>

                {glitchNonce > 0 && (
                    <div key={glitchNonce} className="png-glitch" aria-hidden>
                        <div className="png-glitch-scan" />
                    </div>
                )}

                <div className="png-hud">
                    <span className="png-hud-item png-hud-you">
                        {twoPlayer ? "p1" : "you"} — {String(score.left).padStart(2, "0")}
                    </span>

                    <div className="png-variant">
                        <button
                            className={`png-variant-btn${variant === "cpu" ? " is-on" : ""}`}
                            onClick={() => switchVariant("cpu")}
                            data-cursor="link"
                        >
                            variant — 01 / cpu
                        </button>
                        <button
                            className={`png-variant-btn${twoPlayer ? " is-on" : ""}`}
                            onClick={() => switchVariant("2p")}
                            data-cursor="link"
                        >
                            variant — 02 / two-player
                        </button>
                    </div>

                    <span className="png-hud-item png-hud-away">
                        {twoPlayer ? "p2" : "cpu"} — {String(score.right).padStart(2, "0")}
                    </span>
                </div>

                {phase !== "playing" && (
                    <div className="png-overlay">
                        <div className="png-overlay-panel">
                            <span className="png-overlay-label">
                                {phase === "gameover"
                                    ? twoPlayer
                                        ? leftWon
                                            ? "p1 wins"
                                            : "p2 wins"
                                        : leftWon
                                          ? "you win"
                                          : "cpu wins"
                                    : twoPlayer
                                      ? "pong — two-player"
                                      : "pong — 3d"}
                            </span>
                            {phase === "gameover" && (
                                <span className="png-overlay-score">
                                    final — {score.left} : {score.right}
                                </span>
                            )}
                            <button className="png-btn" onClick={start} data-cursor="link">
                                {phase === "gameover" ? "rematch" : "start"}
                            </button>
                            <span className="png-overlay-hint">
                                {twoPlayer ? "w/s p1 · ↑/↓ p2" : "w/s or ↑/↓ move"} · first to{" "}
                                {WIN_SCORE}
                            </span>
                            <span className="png-overlay-hint">1 cpu · 2 two-player</span>
                        </div>
                    </div>
                )}
            </div>
        </LabStage>
    );
}
