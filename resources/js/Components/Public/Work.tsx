import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReveal } from "./Hooks.tsx";
import { QuestionBlock } from "./Blocks.tsx";
import { Tile } from "./Tile.tsx";

const BLOCKS = [
    {
        desktop: { size: 192, top: "14%", left: "20%" },
        mobile: { size: 104, top: "12%", left: "10%" },
        mouse: { x: -32, y: -22 },
        scroll: -110,
        tilt: -5,
        amp: { x: 18, y: 14, r: 3 },
        speed: 2800,
        phase: 0,
        tile: {
            slug: "wip-01",
            tone: "ink",
            title: "Untitled · 01",
            tagline: "A project parked behind this block. Coming soon.",
            year: "2026",
            metric: { n: "WIP", l: "Status" },
            stack: ["TypeScript", "React"],
        },
    },
    {
        desktop: { size: 176, top: "44%", left: "62%" },
        mobile: { size: 88, top: "40%", left: "60%" },
        mouse: { x: 44, y: 28 },
        scroll: -60,
        tilt: 6,
        amp: { x: 22, y: 18, r: 4 },
        speed: 2100,
        phase: 1.7,
        tile: {
            slug: "wip-02",
            tone: "paper",
            title: "Untitled · 02",
            tagline: "Locked for now — case study soon.",
            year: "2026",
            metric: { n: "WIP", l: "Status" },
            stack: ["Go", "Postgres"],
        },
    },
    {
        desktop: { size: 160, top: "62%", left: "30%" },
        mobile: { size: 72, top: "70%", left: "22%" },
        mouse: { x: 18, y: -36 },
        scroll: -180,
        tilt: -2,
        amp: { x: 14, y: 20, r: 5 },
        speed: 3400,
        phase: 3.4,
        tile: {
            slug: "wip-03",
            tone: "accent",
            title: "Untitled · 03",
            tagline: "Drafting. Drop a line if you want a preview.",
            year: "2026",
            metric: { n: "WIP", l: "Status" },
            stack: ["Laravel", "Inertia"],
        },
    },
];

function useIsMobile(bp = 1000) {
    const [mob, setMob] = useState(
        () => typeof window !== "undefined" && window.innerWidth < bp,
    );
    useEffect(() => {
        const onResize = () => setMob(window.innerWidth < bp);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [bp]);
    return mob;
}

function MobileDialog({ tile, onClose }: { tile: any; onClose: () => void }) {
    useEffect(() => {
        if (!tile) return;
        const prevBody = document.body.style.overflow;
        const prevHtml = document.documentElement.style.overflow;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        const lenis = (window as any).__lenis;
        lenis?.stop?.();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevBody;
            document.documentElement.style.overflow = prevHtml;
            lenis?.start?.();
            window.removeEventListener("keydown", onKey);
        };
    }, [tile, onClose]);

    if (!tile) return null;

    return createPortal(
        <div
            className="ef-work-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={tile.title}
        >
            <Tile
                p={tile}
                i={0}
                idx="01"
                layout={{ x: 1, y: 1, w: 1, h: 1, tilt: 0 }}
                rel={0.5}
                mouse={{ x: 0.5, y: 0.5 }}
                focused={tile.slug}
                onFocus={() => {}}
                onBlur={() => {}}
                onClose={onClose}
            />
        </div>,
        document.body,
    );
}

function FollowTile({
    tile,
    mousePx,
    vel,
    wrapW,
    wrapH,
}: {
    tile: any;
    mousePx: { x: number; y: number };
    vel: { vx: number; vy: number };
    wrapW: number;
    wrapH: number;
}) {
    const W = 380;
    const H = 300;
    let left = mousePx.x - W / 2;
    let top = mousePx.y - H / 2;
    const m = 16;
    if (left < m) left = m;
    if (top < m) top = m;
    if (left + W > wrapW - m) left = wrapW - m - W;
    if (top + H > wrapH - m) top = wrapH - m - H;

    const rot = Math.max(-8, Math.min(8, vel.vx * 50));
    const visible = tile != null;

    return (
        <div
            className={`ef-work-follow ${visible ? "is-visible" : ""}`}
            style={{ transform: `translate3d(${left}px, ${top}px, 0)` }}
            aria-hidden={!visible}
        >
            {tile && (
                <div
                    className="ef-work-follow-inner"
                    style={{ transform: `rotate(${rot}deg)` }}
                >
                    <Tile
                        p={tile}
                        i={0}
                        idx="01"
                        layout={{ x: 1, y: 1, w: 1, h: 1, tilt: 0 }}
                        rel={0.5}
                        mouse={{ x: 0.5, y: 0.5 }}
                        focused={tile.slug}
                        onFocus={() => {}}
                        onBlur={() => {}}
                        showArrow={false}
                    />
                </div>
            )}
        </div>
    );
}

export default function Work() {
    const [revealRef, shown] = useReveal();
    const sectionRef = useRef<HTMLElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [rel, setRel] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const [mousePx, setMousePx] = useState({ x: 0, y: 0 });
    const lastMouseRef = useRef({ x: 0, y: 0, t: 0 });
    const [vel, setVel] = useState({ vx: 0, vy: 0 });
    const [wrapDims, setWrapDims] = useState({ w: 0, h: 0 });
    const [hovered, setHovered] = useState<number | null>(null);
    const [dialogTile, setDialogTile] = useState<any | null>(null);
    const isMobile = useIsMobile();

    const setRefs = (node: HTMLElement | null) => {
        sectionRef.current = node;
        if (revealRef) revealRef.current = node;
    };

    useEffect(() => {
        const compute = () => {
            const el = wrapRef.current;
            if (!el) return;
            setWrapDims({ w: el.clientWidth, h: el.clientHeight });
        };
        compute();
        window.addEventListener("resize", compute);
        return () => window.removeEventListener("resize", compute);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            const el = sectionRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = vh + r.height;
            const travelled = vh - r.top;
            setRel(Math.max(0, Math.min(1, travelled / total)));
        };
        const onMove = (e: MouseEvent) => {
            const sec = sectionRef.current;
            if (sec) {
                const sr = sec.getBoundingClientRect();
                setMouse({
                    x: Math.max(
                        0,
                        Math.min(1, (e.clientX - sr.left) / sr.width),
                    ),
                    y: Math.max(
                        0,
                        Math.min(1, (e.clientY - sr.top) / sr.height),
                    ),
                });
            }
            const wr = wrapRef.current;
            if (wr) {
                const wrr = wr.getBoundingClientRect();
                const px = e.clientX - wrr.left;
                const py = e.clientY - wrr.top;
                setMousePx({ x: px, y: py });
                const now = performance.now();
                const last = lastMouseRef.current;
                const dt = Math.max(1, now - last.t);
                const vx = (px - last.x) / dt;
                const vy = (py - last.y) / dt;
                lastMouseRef.current = { x: px, y: py, t: now };
                setVel((prev) => ({
                    vx: prev.vx * 0.7 + vx * 0.3,
                    vy: prev.vy * 0.7 + vy * 0.3,
                }));
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("mousemove", onMove, { passive: true });
        onScroll();
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("mousemove", onMove);
        };
    }, []);

    const [, force] = useState(0);
    useEffect(() => {
        let raf: number;
        const loop = () => {
            force((n) => (n + 1) % 1000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const pxy = (mx: number, my: number, sy: number) => ({
        transform: `translate3d(${(mouse.x - 0.5) * mx}px, ${(mouse.y - 0.5) * my + (rel - 0.5) * sy}px, 0)`,
    });

    const t = Date.now();

    return (
        <section
            className={`ef-work ${shown ? "is-in" : ""}`}
            id="work"
            ref={setRefs}
            data-screen-label="02 Work"
        >
            <div className="ef-work-field" aria-hidden>
                <div className="ef-work-grid-bg" />

                <div
                    className="ef-rect ef-w-rect--1"
                    style={pxy(-10, 0, -160)}
                />
                <div
                    className="ef-rect ef-w-rect--2"
                    style={pxy(10, 0, -220)}
                />
                <div className="ef-rect ef-w-rect--3" style={pxy(-6, 0, -90)} />
                <div
                    className="ef-rect ef-w-rect--4"
                    style={pxy(14, 0, -260)}
                />
                <div
                    className="ef-rect ef-w-rect--5"
                    style={pxy(-4, 0, -180)}
                />
                <div
                    className="ef-rect ef-w-rect--acc"
                    style={pxy(-12, 10, -200)}
                />

                <div className="ef-rect ef-w-rule-v" style={pxy(0, 0, -60)} />
                <div className="ef-rect ef-w-rule-h" style={pxy(0, 0, -30)} />

                <svg
                    className="ef-w-cross"
                    viewBox="0 0 40 40"
                    style={pxy(-8, 8, -200)}
                >
                    <line x1="0" y1="20" x2="40" y2="20" />
                    <line x1="20" y1="0" x2="20" y2="40" />
                    <circle cx="20" cy="20" r="4" />
                </svg>

                <div className="ef-w-dot" style={pxy(22, 16, -240)} />
            </div>

            <div className="ef-work-head">
                <span className="ef-label">§ 02 — Selected work</span>
                <h2 className="ef-work-title">
                    <span className="ef-line ef-line--1">
                        <span className="ef-w">systems,</span>
                        <em className="ef-w ef-w--em">apis</em>
                    </span>
                    <span className="ef-line ef-line--2">
                        <span className="ef-w ef-w--thin">
                            &amp; the things that
                        </span>
                    </span>
                    <span className="ef-line ef-line--3">
                        <span className="ef-w">run on them.</span>
                    </span>
                </h2>
                <div className="ef-work-head-foot">
                    <p className="ef-work-note">
                        A partial record — click to open the case study.
                    </p>
                    <span className="ef-mono ef-work-count">soon</span>
                </div>
            </div>

            <div
                className="ef-work-canvas-wrap"
                ref={wrapRef}
                onMouseLeave={() => setHovered(null)}
            >
                <div className="ef-work-canvas-rules" aria-hidden>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <span key={`v${i}`} />
                    ))}
                </div>

                <div className="ef-work-blocks">
                    {BLOCKS.map((b, i) => {
                        const pos = isMobile ? b.mobile : b.desktop;
                        const phase = t / b.speed + b.phase;
                        const driftX = Math.sin(phase) * b.amp.x;
                        const driftY = Math.cos(phase * 0.85) * b.amp.y;
                        const driftR = Math.sin(phase * 0.6) * b.amp.r;
                        const mx = (mouse.x - 0.5) * b.mouse.x;
                        const my =
                            (mouse.y - 0.5) * b.mouse.y +
                            (rel - 0.5) * b.scroll;
                        return (
                            <div
                                key={i}
                                className="ef-work-block"
                                style={{
                                    top: pos.top,
                                    left: pos.left,
                                    transform: `translate3d(${mx + driftX}px, ${my + driftY}px, 0) rotate(${b.tilt + driftR}deg)`,
                                }}
                                onMouseEnter={
                                    isMobile ? undefined : () => setHovered(i)
                                }
                                onMouseLeave={
                                    isMobile
                                        ? undefined
                                        : () => setHovered(null)
                                }
                                onClick={
                                    isMobile
                                        ? () => setDialogTile(b.tile)
                                        : undefined
                                }
                            >
                                <QuestionBlock size={pos.size} />
                            </div>
                        );
                    })}
                </div>

                <FollowTile
                    tile={hovered != null ? BLOCKS[hovered].tile : null}
                    mousePx={mousePx}
                    vel={vel}
                    wrapW={wrapDims.w}
                    wrapH={wrapDims.h}
                />

                <MobileDialog
                    tile={dialogTile}
                    onClose={() => setDialogTile(null)}
                />

                <div
                    className="ef-work-bigword"
                    aria-hidden
                    style={{
                        transform: `translate3d(${(mouse.x - 0.5) * -10}px, ${(rel - 0.5) * 120}px, 0)`,
                    }}
                >
                    work.
                </div>
            </div>

            <div className="ef-work-strip">
                <span className="ef-label">Archive</span>
                <a
                    className="ef-work-strip-link"
                    href="https://github.com/manuto276"
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="link"
                >
                    <span>more projects on github.com/manuto276</span>
                    <span className="ef-work-strip-arrow" aria-hidden>
                        ↗
                    </span>
                </a>
                <span className="ef-mono">EST. 2021 — ∞</span>
            </div>
        </section>
    );
}
