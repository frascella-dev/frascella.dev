import { useEffect, useRef, useState } from 'react';
import { useReveal } from './Hooks.tsx';

const LAYOUTS = {
    1: [{ x: 2, y: 1, w: 8, h: 8, tilt: -1.5 }],
    2: [
        { x: 1, y: 1, w: 6, h: 6, tilt: -2 },
        { x: 7, y: 4, w: 5, h: 6, tilt: 2 },
    ],
    3: [
        { x: 1, y: 1, w: 5, h: 5, tilt: -2.5 },
        { x: 7, y: 2, w: 5, h: 4, tilt: 2 },
        { x: 3, y: 6, w: 6, h: 4, tilt: 1.2 },
    ],
    4: [
        { x: 1, y: 1, w: 5, h: 4, tilt: -3 },
        { x: 7, y: 1, w: 5, h: 3, tilt: 2 },
        { x: 2, y: 6, w: 4, h: 4, tilt: 1.5 },
        { x: 7, y: 5, w: 5, h: 5, tilt: -2 },
    ],
    5: [
        { x: 1, y: 1, w: 5, h: 4, tilt: -3 },
        { x: 7, y: 2, w: 5, h: 3, tilt: 2.2 },
        { x: 2, y: 6, w: 4, h: 4, tilt: 1.5 },
        { x: 7, y: 6, w: 3, h: 3, tilt: -2.5 },
        { x: 10, y: 6, w: 3, h: 4, tilt: 3 },
    ],
};

const DESKTOP_MAX = 5;
const MOBILE_MAX = 3;

function useIsMobile(bp = 1000) {
    const [mob, setMob] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp);
    useEffect(() => {
        const onResize = () => setMob(window.innerWidth < bp);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [bp]);
    return mob;
}

function Tile({ p, i, idx, layout, rel, mouse, focused, onFocus, onBlur }) {
    const tileRef = useRef(null);

    const depth = 1 + (i % 3) * 0.4;
    const mouseTx = (mouse.x - 0.5) * 14 * depth;
    const mouseTy = (mouse.y - 0.5) * 10 * depth;
    const scrollTy = (rel - 0.5) * -90 * depth;
    const idle = Math.sin((Date.now() / 2400 + i) % (Math.PI * 2)) * 3;

    const isFocused = focused === p.slug;
    const isDimmed = focused && !isFocused;

    return (
        <div
            ref={tileRef}
            className={`ef-tile ef-tile--${p.tone} ${isFocused ? 'is-focused' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
            style={{
                gridColumn: `${layout.x} / span ${layout.w}`,
                gridRow: `${layout.y} / span ${layout.h}`,
                transform: `translate3d(${mouseTx}px, ${scrollTy + mouseTy + idle}px, 0) rotate(${layout.tilt}deg)`,
            }}
            onMouseEnter={() => onFocus(p.slug)}
            onMouseLeave={() => onBlur()}
            data-cursor="view"
            data-cursor-label={p.title}
        >
            <span className="ef-tile-pattern" aria-hidden />

            <header className="ef-tile-head">
                <span className="ef-mono ef-tile-idx">№ {idx}</span>
                <span className="ef-mono ef-tile-year">{p.year}</span>
            </header>

            <div className="ef-tile-body">
                <h3 className="ef-tile-title">{p.title}</h3>
                <p className="ef-tile-tag">{p.tagline}</p>
            </div>

            <footer className="ef-tile-foot">
                {p.metric && (
                    <div className="ef-tile-metric">
                        <strong>{p.metric.n}</strong>
                        <em>{p.metric.l}</em>
                    </div>
                )}
                <span className="ef-tile-arrow" aria-hidden>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="square" />
                    </svg>
                </span>
            </footer>

            <ul className="ef-tile-stack" aria-hidden>
                {(p.stack || []).map((s) => <li key={s}>{s}</li>)}
            </ul>
        </div>
    );
}

export default function Work({ projects = [] }) {
    const [revealRef, shown] = useReveal();
    const sectionRef = useRef(null);
    const [rel, setRel] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const [focused, setFocused] = useState(null);
    const isMobile = useIsMobile();

    const shown_projects = projects.slice(0, isMobile ? MOBILE_MAX : DESKTOP_MAX);
    const layout = LAYOUTS[shown_projects.length] || LAYOUTS[5];

    const setRefs = (node: HTMLElement | null) => {
        sectionRef.current = node;
        if (revealRef) revealRef.current = node;
    };

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
        const onMove = (e) => {
            const el = sectionRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setMouse({
                x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', onMove);
        onScroll();
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    const [, force] = useState(0);
    useEffect(() => {
        let raf;
        const loop = () => {
            force((n) => (n + 1) % 1000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const pxy = (mx, my, sy) => ({
        transform: `translate3d(${(mouse.x - 0.5) * mx}px, ${(mouse.y - 0.5) * my + (rel - 0.5) * sy}px, 0)`,
    });

    return (
        <section
            className={`ef-work ${shown ? 'is-in' : ''}`}
            id="work"
            ref={setRefs}
            data-screen-label="02 Work"
        >
            <div className="ef-work-field" aria-hidden>
                <div className="ef-work-grid-bg" />

                <div className="ef-rect ef-w-rect--1" style={pxy(-10, 0, -160)} />
                <div className="ef-rect ef-w-rect--2" style={pxy(10, 0, -220)} />
                <div className="ef-rect ef-w-rect--3" style={pxy(-6, 0, -90)} />
                <div className="ef-rect ef-w-rect--4" style={pxy(14, 0, -260)} />
                <div className="ef-rect ef-w-rect--5" style={pxy(-4, 0, -180)} />
                <div className="ef-rect ef-w-rect--acc" style={pxy(-12, 10, -200)} />

                <div className="ef-rect ef-w-rule-v" style={pxy(0, 0, -60)} />
                <div className="ef-rect ef-w-rule-h" style={pxy(0, 0, -30)} />

                <svg className="ef-w-cross" viewBox="0 0 40 40" style={pxy(-8, 8, -200)}>
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
                        <span className="ef-w ef-w--thin">&amp; the things that</span>
                    </span>
                    <span className="ef-line ef-line--3">
                        <span className="ef-w">run on them.</span>
                    </span>
                </h2>
                <div className="ef-work-head-foot">
                    <p className="ef-work-note">
                        A partial record — hover a plate to inspect, click to open the case study.
                    </p>
                    <span className="ef-mono ef-work-count">
                        {String(focused ? shown_projects.findIndex((p) => p.slug === focused) + 1 : 0).padStart(2, '0')} / {String(shown_projects.length).padStart(2, '0')}
                    </span>
                </div>
            </div>

            <div className="ef-work-canvas-wrap">
                <div className="ef-work-canvas-rules" aria-hidden>
                    {Array.from({ length: 12 }).map((_, i) => <span key={`v${i}`} />)}
                </div>

                <div className="ef-work-canvas">
                    {shown_projects.map((p, i) => (
                        <Tile
                            key={p.slug}
                            p={p}
                            i={i}
                            idx={String(i + 1).padStart(2, '0')}
                            layout={layout[i]}
                            rel={rel}
                            mouse={mouse}
                            focused={focused}
                            onFocus={setFocused}
                            onBlur={() => setFocused(null)}
                        />
                    ))}
                </div>

                <div
                    className="ef-work-bigword"
                    aria-hidden
                    style={{ transform: `translate3d(${(mouse.x - 0.5) * -10}px, ${(rel - 0.5) * 120}px, 0)` }}
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
                    <span className="ef-work-strip-arrow" aria-hidden>↗</span>
                </a>
                <span className="ef-mono">EST. 2021 — ∞</span>
            </div>
        </section>
    );
}
