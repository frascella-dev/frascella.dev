import { useEffect, useRef, useState } from "react";
import Key from "../components/Key";
import "./pong.css";

// Fixed logical field — the canvas is scaled to fit its container, so the
// physics stay identical whatever the window size.
const W = 1000;
const H = 620;

const PADDLE_W = 14;
const PADDLE_H = 110;
const BALL_R = 9;
const PLAYER_X = 34;
const CPU_X = W - 34 - PADDLE_W;
const WIN_SCORE = 7;

const COL_BG = "#050605";
const COL_DIM = "#3a382f";
const COL_PAPER = "#E9E6DC";
const COL_LIME = "#C7F651";
const COL_ORANGE = "#FFB86B";

type State = {
    ballX: number;
    ballY: number;
    vx: number;
    vy: number;
    playerY: number;
    cpuY: number;
    playerScore: number;
    cpuScore: number;
    over: boolean;
    started: boolean;
};

type Phase = "idle" | "playing" | "over";

function serve(s: State, toPlayer: boolean) {
    s.ballX = W / 2;
    s.ballY = H / 2;
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
    const speed = 7.2;
    s.vx = (toPlayer ? -1 : 1) * speed * Math.cos(angle);
    s.vy = speed * Math.sin(angle);
}

// Keyboard tutorial shown on the start screen and after a game ends.
function Tutorial({ phase }: { phase: Phase }) {
    return (
        <div className="ef-pong-tutorial" aria-hidden>
            <div className="ef-pong-ctrl">
                <div className="ef-pong-wasd">
                    <div className="ef-pong-wasd-row">
                        <Key label="W" active />
                    </div>
                    <div className="ef-pong-wasd-row">
                        <Key label="A" />
                        <Key label="S" active />
                        <Key label="D" />
                    </div>
                </div>
                <span className="ef-pong-hint">move up / down</span>
            </div>
            <div className="ef-pong-ctrl">
                <Key label="space" size="large" />
                <span className="ef-pong-hint">
                    {phase === "over" ? "play again" : "start"}
                </span>
            </div>
        </div>
    );
}

export default function Pong() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [phase, setPhase] = useState<Phase>("idle");

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const state: State = {
            ballX: W / 2,
            ballY: H / 2,
            vx: 0,
            vy: 0,
            playerY: H / 2,
            cpuY: H / 2,
            playerScore: 0,
            cpuScore: 0,
            over: false,
            started: false,
        };
        serve(state, Math.random() < 0.5);

        const keys = { up: false, down: false };

        // React only needs to know when the coarse phase flips — sync on change.
        let reported: Phase = "idle";
        const syncPhase = () => {
            const p: Phase = state.over
                ? "over"
                : state.started
                  ? "playing"
                  : "idle";
            if (p !== reported) {
                reported = p;
                setPhase(p);
            }
        };

        // ── sizing ──────────────────────────────────────────────────────
        let scale = 1;
        let offX = 0;
        let offY = 0;
        // Leave a black overscan margin so the playfield sits inside the tube
        // and the squircle corners fall on empty space, never on the paddles.
        const OVERSCAN = 0.9;
        const resize = () => {
            const rect = wrap.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            scale = Math.min(rect.width / W, rect.height / H) * dpr * OVERSCAN;
            offX = (canvas.width - W * scale) / 2;
            offY = (canvas.height - H * scale) / 2;
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);

        // ── input (keyboard only) ───────────────────────────────────────
        const restart = () => {
            state.playerScore = 0;
            state.cpuScore = 0;
            state.over = false;
            serve(state, Math.random() < 0.5);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
            if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = true;
            if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = true;
            if (e.key === " ") {
                if (state.over) restart();
                state.started = true;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
            if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        // ── loop ────────────────────────────────────────────────────────
        let raf = 0;
        const step = () => {
            // keyboard paddle movement
            const kSpeed = 8.5;
            if (keys.up) state.playerY -= kSpeed;
            if (keys.down) state.playerY += kSpeed;
            state.playerY = Math.max(
                PADDLE_H / 2,
                Math.min(H - PADDLE_H / 2, state.playerY),
            );

            if (state.started && !state.over) {
                state.ballX += state.vx;
                state.ballY += state.vy;

                // walls
                if (state.ballY - BALL_R < 0) {
                    state.ballY = BALL_R;
                    state.vy *= -1;
                }
                if (state.ballY + BALL_R > H) {
                    state.ballY = H - BALL_R;
                    state.vy *= -1;
                }

                // player paddle
                if (
                    state.vx < 0 &&
                    state.ballX - BALL_R <= PLAYER_X + PADDLE_W &&
                    state.ballX - BALL_R >= PLAYER_X - 8 &&
                    Math.abs(state.ballY - state.playerY) <= PADDLE_H / 2 + BALL_R
                ) {
                    state.ballX = PLAYER_X + PADDLE_W + BALL_R;
                    const rel = (state.ballY - state.playerY) / (PADDLE_H / 2);
                    const speed = Math.min(15, Math.hypot(state.vx, state.vy) * 1.05);
                    const angle = rel * (Math.PI / 3.4);
                    state.vx = Math.abs(speed * Math.cos(angle));
                    state.vy = speed * Math.sin(angle);
                }

                // cpu paddle
                if (
                    state.vx > 0 &&
                    state.ballX + BALL_R >= CPU_X &&
                    state.ballX + BALL_R <= CPU_X + PADDLE_W + 8 &&
                    Math.abs(state.ballY - state.cpuY) <= PADDLE_H / 2 + BALL_R
                ) {
                    state.ballX = CPU_X - BALL_R;
                    const rel = (state.ballY - state.cpuY) / (PADDLE_H / 2);
                    const speed = Math.min(15, Math.hypot(state.vx, state.vy) * 1.05);
                    const angle = rel * (Math.PI / 3.4);
                    state.vx = -Math.abs(speed * Math.cos(angle));
                    state.vy = speed * Math.sin(angle);
                }

                // scoring
                if (state.ballX < -BALL_R * 2) {
                    state.cpuScore++;
                    if (state.cpuScore >= WIN_SCORE) state.over = true;
                    else serve(state, false);
                }
                if (state.ballX > W + BALL_R * 2) {
                    state.playerScore++;
                    if (state.playerScore >= WIN_SCORE) state.over = true;
                    else serve(state, true);
                }

                // cpu AI — tracks the ball with a capped speed so it's beatable
                const target = state.vx > 0 ? state.ballY : H / 2;
                const diff = target - state.cpuY;
                const maxSpeed = 6.4;
                state.cpuY += Math.max(-maxSpeed, Math.min(maxSpeed, diff * 0.09));
                state.cpuY = Math.max(
                    PADDLE_H / 2,
                    Math.min(H - PADDLE_H / 2, state.cpuY),
                );
            }

            draw();
            syncPhase();
            raf = requestAnimationFrame(step);
        };

        const draw = () => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = COL_BG;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(scale, 0, 0, scale, offX, offY);

            // field border
            ctx.strokeStyle = COL_DIM;
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, W - 2, H - 2);

            // center line
            ctx.setLineDash([10, 14]);
            ctx.beginPath();
            ctx.moveTo(W / 2, 0);
            ctx.lineTo(W / 2, H);
            ctx.stroke();
            ctx.setLineDash([]);

            // score
            ctx.fillStyle = COL_DIM;
            ctx.font = "600 62px 'JetBrains Mono', ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(String(state.playerScore), W / 2 - 70, 26);
            ctx.fillText(String(state.cpuScore), W / 2 + 70, 26);

            // paddles
            ctx.fillStyle = COL_LIME;
            ctx.fillRect(PLAYER_X, state.playerY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
            ctx.fillStyle = COL_PAPER;
            ctx.fillRect(CPU_X, state.cpuY - PADDLE_H / 2, PADDLE_W, PADDLE_H);

            // ball
            ctx.fillStyle = COL_PAPER;
            ctx.beginPath();
            ctx.arc(state.ballX, state.ballY, BALL_R, 0, Math.PI * 2);
            ctx.fill();

            // win/lose banner — the keyboard tutorial (HTML overlay) carries the
            // rest of the messaging.
            if (state.over) {
                const won = state.playerScore > state.cpuScore;
                ctx.textAlign = "center";
                ctx.fillStyle = won ? COL_LIME : COL_ORANGE;
                ctx.font = "700 40px 'JetBrains Mono', ui-monospace, monospace";
                ctx.fillText(won ? "you win" : "cpu wins", W / 2, H / 2 - 40);
            }
        };

        raf = requestAnimationFrame(step);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    return (
        <div className="ef-pong">
            <div className="ef-pong-tube" ref={wrapRef}>
                <canvas ref={canvasRef} className="ef-pong-canvas" />
                {/* scanlines + vignette + glass glow, clipped to the squircle */}
                <div className="ef-pong-crt" aria-hidden />
                {phase !== "playing" && <Tutorial phase={phase} />}
            </div>
        </div>
    );
}
