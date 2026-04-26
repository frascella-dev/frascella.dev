import { useEffect, useRef, useState } from 'react';
import { useReveal } from './Hooks.tsx';
import heroLightAvif from '../../../images/hero-light.avif';
import heroLightWebp from '../../../images/hero-light.webp';

function Timeline({ items }) {
    const wrapRef = useRef(null);
    const pathRef = useRef(null);
    const [active, setActive] = useState(null);
    const [progress, setProgress] = useState(0);
    const [positions, setPositions] = useState([]);
    const [travelPt, setTravelPt] = useState(null);
    const [dims, setDims] = useState({ w: 1400, h: 900 });
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const [mousePx, setMousePx] = useState({ x: 0, y: 0, inside: false });
    const lastMouseRef = useRef({ x: 0, y: 0, t: 0 });
    const [vel, setVel] = useState({ vx: 0, vy: 0 });

    useEffect(() => {
        const compute = () => {
            const wrap = wrapRef.current;
            if (!wrap) return;
            const w = wrap.clientWidth;
            const h = Math.max(780, Math.min(1280, w * 0.72));
            setDims({ w, h });
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, []);

    useEffect(() => {
        const p = pathRef.current;
        if (!p) return;
        requestAnimationFrame(() => {
            const total = p.getTotalLength();
            const pts = items.map((entry) => {
                const t = entry.fraction;
                const pt = p.getPointAtLength(t * total);
                const pt2 = p.getPointAtLength(Math.min(total, t * total + 1));
                const tangent = Math.atan2(pt2.y - pt.y, pt2.x - pt.x);
                return { x: pt.x, y: pt.y, tangent };
            });
            setPositions(pts);
            const tp = p.getPointAtLength(progress * total);
            setTravelPt(tp);
        });
    }, [dims, progress]);

    useEffect(() => {
        const onScroll = () => {
            const el = wrapRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = r.height + vh;
            const travelled = vh - r.top;
            const p = travelled / total;
            setProgress(Math.max(0, Math.min(1, p)));
        };
        const onMove = (e) => {
            const el = wrapRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
            setMouse({ x, y });

            const px = e.clientX - r.left;
            const py = e.clientY - r.top;
            const inside = px >= 0 && py >= 0 && px <= r.width && py <= r.height;
            setMousePx({ x: px, y: py, inside });

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
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', onMove, { passive: true });
        onScroll();
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    useEffect(() => {
        if (!mousePx.inside || positions.length === 0) {
            setActive((cur) => cur);
            return;
        }
        const threshold = Math.max(140, dims.h * 0.28);
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < positions.length; i++) {
            const p = positions[i];
            const dx = p.x - mousePx.x;
            const dy = p.y - mousePx.y;
            const d = Math.hypot(dx, dy);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        if (bestDist <= threshold) {
            setActive(bestIdx);
        } else {
            setActive(null);
        }
    }, [mousePx, positions, dims.h]);

    const first = items[0]?.year;
    const last = items[items.length - 1]?.year;
    const { w, h } = dims;

    const baseWaypoints = [
        { x: -0.08, y: 0.70 },
        { x: 0.16, y: 0.22 },
        { x: 0.30, y: 0.82 },
        { x: 0.46, y: 0.28 },
        { x: 0.58, y: 0.72 },
        { x: 0.74, y: 0.18 },
        { x: 0.86, y: 0.74 },
        { x: 1.08, y: 0.32 },
    ];
    const warp = 0.02;
    const wpts = baseWaypoints.map((p, i) => {
        const phase = (i / baseWaypoints.length) * Math.PI * 2;
        return {
            x: (p.x + (mouse.x - 0.5) * warp * Math.sin(phase)) * w,
            y: (p.y + (mouse.y - 0.5) * warp * Math.cos(phase)) * h,
        };
    });

    const pathD = (() => {
        if (wpts.length < 2) return '';
        let d = `M ${wpts[0].x} ${wpts[0].y}`;
        for (let i = 0; i < wpts.length - 1; i++) {
            const p0 = wpts[i - 1] || wpts[i];
            const p1 = wpts[i];
            const p2 = wpts[i + 1];
            const p3 = wpts[i + 2] || p2;
            const tension = 0.55;
            const c1x = p1.x + (p2.x - p0.x) * tension * 0.3;
            const c1y = p1.y + (p2.y - p0.y) * tension * 0.3;
            const c2x = p2.x - (p3.x - p1.x) * tension * 0.3;
            const c2y = p2.y - (p3.y - p1.y) * tension * 0.3;
            d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    })();

    return (
        <div className="ef-timeline ef-tl--bleed">
            <div className="ef-tl-head">
                <span className="ef-label">§ 04 — A thread</span>
                <h3 className="ef-h3 ef-tl-title">
                    <span>a short thread,</span>
                    <em>the way I got here.</em>
                </h3>
                <p className="ef-tl-lede">
                    Hover a year to see what happened. Scroll to pull the thread. {first} → {last}.
                </p>
            </div>

            <div
                className="ef-tl-spline-wrap"
                ref={wrapRef}
                onMouseLeave={() => { setActive(null); setMousePx((p) => ({ ...p, inside: false })); }}
                style={{ height: h }}
            >
                <div className="ef-tl-decades" aria-hidden>
                    <span className="ef-tl-decade ef-tl-decade--1" style={{ transform: `translate3d(${(mouse.x - 0.5) * -24}px, ${(mouse.y - 0.5) * -10}px, 0)` }}>2000s</span>
                    <span className="ef-tl-decade ef-tl-decade--2" style={{ transform: `translate3d(${(mouse.x - 0.5) * 18}px, ${(mouse.y - 0.5) * -14}px, 0)` }}>2010s</span>
                    <span className="ef-tl-decade ef-tl-decade--3" style={{ transform: `translate3d(${(mouse.x - 0.5) * -16}px, ${(mouse.y - 0.5) * 12}px, 0)` }}>2020s</span>
                </div>

                <div className="ef-tl-floaters" aria-hidden>
                    <span className="ef-tl-floater ef-tl-floater--a" style={{ transform: `translate3d(${(mouse.x - 0.5) * -20}px, ${(mouse.y - 0.5) * -14}px, 0)` }} />
                    <span className="ef-tl-floater ef-tl-floater--c" style={{ transform: `translate3d(${(mouse.x - 0.5) * 10}px, ${(mouse.y - 0.5) * 18}px, 0)` }} />
                </div>

                <svg
                    className="ef-tl-spline"
                    viewBox={`0 0 ${w} ${h}`}
                    width={w}
                    height={h}
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <defs>
                        <linearGradient id="ef-tl-accent-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--ink)" />
                            <stop offset="80%" stopColor="var(--ink)" />
                            <stop offset="100%" stopColor="var(--accent)" />
                        </linearGradient>
                        <pattern id="ef-tl-ticks" x="0" y="0" width="28" height="14" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="7" x2="4" y2="7" stroke="var(--rule)" strokeWidth="1" />
                        </pattern>
                    </defs>

                    <path
                        d={pathD}
                        fill="none"
                        stroke="var(--rule)"
                        strokeWidth="1.25"
                        strokeDasharray="3 8"
                    />

                    <path
                        d={pathD}
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth="10"
                        opacity="0.04"
                        style={{
                            strokeDasharray: 9999,
                            strokeDashoffset: 9999 * (1 - progress),
                            transition: 'stroke-dashoffset 0.35s linear',
                        }}
                    />

                    <path
                        ref={pathRef}
                        d={pathD}
                        fill="none"
                        stroke="url(#ef-tl-accent-grad)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{
                            strokeDasharray: 9999,
                            strokeDashoffset: 9999 * (1 - progress),
                            transition: 'stroke-dashoffset 0.35s linear',
                        }}
                    />

                    {travelPt && progress > 0.01 && progress < 0.99 && (
                        <g className="ef-tl-traveler" transform={`translate(${travelPt.x}, ${travelPt.y})`}>
                            <circle r="14" fill="var(--accent)" opacity="0.12" />
                            <circle r="7" fill="var(--accent)" opacity="0.28" />
                            <circle r="3.5" fill="var(--accent)" />
                        </g>
                    )}
                </svg>

                <ol className="ef-tl-nodes">
                    {positions.map((pos, i) => {
                        const item = items[i];
                        if (!item) return null;
                        const isActive = active === i;
                        const vside = pos.y > h * 0.55 ? 'above' : 'below';
                        return (
                            <li
                                key={item.year + item.title}
                                className={`ef-tl-node ef-tl-node--${item.kind} is-${vside} ${isActive ? 'is-active' : ''}`}
                                style={{ left: pos.x, top: pos.y }}
                                onFocus={() => setActive(i)}
                                tabIndex={0}
                                data-cursor="view"
                                data-cursor-label={`${item.year} — ${item.title}`}
                                aria-label={`${item.year}: ${item.title}. ${item.body}`}
                            >
                                <span className="ef-tl-dot" aria-hidden>
                                    <span className="ef-tl-dot-inner" />
                                    <span className="ef-tl-dot-ring" />
                                    <span className="ef-tl-dot-pulse" />
                                </span>
                                <span className="ef-tl-connector" aria-hidden />
                                <span className="ef-mono ef-tl-year">{item.year}</span>
                            </li>
                        );
                    })}
                </ol>

                <FollowCard
                    item={active != null ? items[active] : null}
                    activeIdx={active}
                    mousePx={mousePx}
                    vel={vel}
                    wrapW={w}
                    wrapH={h}
                />
            </div>

            <ol className="ef-tl-mobile" aria-label="Career timeline">
                {items.map((item, i) => {
                    const isLast = i === items.length - 1;
                    return (
                        <li
                            key={item.year + item.title}
                            className={`ef-tl-m-item ef-tl-m-item--${item.kind} ${isLast ? 'is-now' : ''}`}
                        >
                            <div className="ef-tl-m-meta">
                                <span className="ef-tl-m-year">{item.year}</span>
                                <span className="ef-tl-m-kind">{item.kind}</span>
                            </div>
                            <h4 className="ef-tl-m-title">{item.title}</h4>
                            <p className="ef-tl-m-body">{item.body}</p>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function FollowCard({ item, activeIdx, mousePx, vel, wrapW, wrapH }) {
    const CARD_W = 300;
    const CARD_H = 280;

    let left = mousePx.x - CARD_W / 2;
    let top = mousePx.y - CARD_H / 2;

    const m = 16;
    if (left < m) left = m;
    if (top < m) top = m;
    if (left + CARD_W > wrapW - m) left = wrapW - m - CARD_W;
    if (top + CARD_H > wrapH - m) top = wrapH - m - CARD_H;

    const rot = Math.max(-8, Math.min(8, vel.vx * 50));
    const visible = item != null;

    return (
        <div
            className={`ef-tl-follow ${visible ? 'is-visible' : ''}`}
            style={{
                transform: `translate3d(${left}px, ${top}px, 0)`,
            }}
            aria-hidden={!visible}
        >
            {item && (
                <div
                    className={`ef-tl-follow-inner ef-tl-follow--${item.kind}`}
                    style={{
                        transform: `rotate(${rot}deg)`,
                    }}
                >
                    <div className="ef-tl-card-photo">
                        {item.photo ? (
                            <img src={item.photo} alt="" draggable="false" />
                        ) : (
                            <PhotoPlaceholder year={item.year} kind={item.kind} />
                        )}
                    </div>
                    <div className="ef-tl-card-body-wrap">
                        <span className="ef-mono ef-tl-card-meta">
                            <span>{item.year}</span>
                            <span className="ef-tl-card-kind">{item.kind}</span>
                        </span>
                        <h4 className="ef-tl-card-title">{item.title}</h4>
                        <p className="ef-tl-card-body">{item.body}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function PhotoPlaceholder({ year, kind }) {
    return (
        <div className={`ef-tl-photo-ph ef-tl-photo-ph--${kind}`}>
            <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden>
                <defs>
                    <pattern id={`ph-${year}`} width="6" height="6" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="6" x2="6" y2="0" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
                    </pattern>
                </defs>
                <rect width="120" height="90" fill={`url(#ph-${year})`} />
                <rect x="8" y="8" width="104" height="74" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            <span className="ef-mono ef-tl-photo-label">photo / {year}</span>
        </div>
    );
}

export default function About({ timeline = [] }) {
    const [revealRef, shown] = useReveal();
    const sectionRef = useRef(null);
    const [rel, setRel] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

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
            setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', onMove);
        onScroll();
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    const pxy = (mx, my, sy) => ({
        transform: `translate3d(${(mouse.x - 0.5) * mx}px, ${(mouse.y - 0.5) * my + (rel - 0.5) * sy}px, 0)`,
    });

    return (
        <section
            className={`ef-about ${shown ? 'is-in' : ''}`}
            id="about"
            ref={setRefs}
            data-screen-label="03 About"
        >
            <div className="ef-about-field" aria-hidden>
                <div className="ef-about-grid-bg" />

                <div className="ef-rect ef-a-rect--1" style={pxy(-10, 0, -140)} />
                <div className="ef-rect ef-a-rect--2" style={pxy(8, 0, -220)} />
                <div className="ef-rect ef-a-rect--3" style={pxy(-6, 0, -80)} />
                <div className="ef-rect ef-a-rect--4" style={pxy(14, 0, -300)} />
                <div className="ef-rect ef-a-rect--5" style={pxy(-4, 0, -180)} />
                <div className="ef-rect ef-a-rect--acc" style={pxy(-12, 10, -160)} />

                <div className="ef-rect ef-a-rule-v" style={pxy(0, 0, -60)} />
                <div className="ef-rect ef-a-rule-h" style={pxy(0, 0, -40)} />

                <svg className="ef-a-cross" viewBox="0 0 40 40" style={pxy(-8, 8, -200)}>
                    <line x1="0" y1="20" x2="40" y2="20" />
                    <line x1="20" y1="0" x2="20" y2="40" />
                    <circle cx="20" cy="20" r="4" />
                </svg>

                <div className="ef-a-dot" style={pxy(22, 16, -240)} />
            </div>

            <div className="ef-about-head">
                <span className="ef-label">§ 03 — About</span>
                <h2 className="ef-about-title">
                    <span className="ef-line ef-line--1">
                        <span className="ef-w">building things</span>
                    </span>
                    <span className="ef-line ef-line--2">
                        <em className="ef-w ef-w--em">that run</em>
                        <span className="ef-w ef-w--thin">quietly,</span>
                    </span>
                    <span className="ef-line ef-line--3">
                        <span className="ef-w ef-w--thin">and reliably.</span>
                    </span>
                </h2>
            </div>

            <div className="ef-about-body-wrap">
                <div className="ef-about-lead">
                    <span className="ef-label">idx — 01</span>
                    <p className="ef-about-lead-text">
                        I build software end-to-end, but my
                        centre of gravity is the backend —
                        <em> systems, APIs, and the applications that sit on top of them.</em>
                    </p>
                </div>

                <div
                    className="ef-about-portrait"
                    style={{
                        transform: `translate3d(${(mouse.x - 0.5) * -6}px, ${(rel - 0.5) * -60}px, 0) rotate(-2.5deg)`,
                    }}
                >
                    <picture>
                        <source srcSet={heroLightAvif} type="image/avif" />
                        <source srcSet={heroLightWebp} type="image/webp" />
                        <img src={heroLightWebp} alt="Portrait of Emanuele Frascella" draggable="false" />
                    </picture>
                    <div className="ef-about-portrait-tag">
                        <span>e.f.</span>
                        <span>taranto · 2026</span>
                    </div>
                </div>

                <div className="ef-about-cols">
                    <div className="ef-about-col">
                        <span className="ef-label">idx — 02</span>
                        <p>
                            Occasionally I step across to the frontend
                            when the brief calls for it. I care about
                            things being well-made — a query that comes
                            back fast, a deploy that doesn't surprise
                            anyone on Monday.
                        </p>
                    </div>
                    <div className="ef-about-col">
                        <span className="ef-label">idx — 03</span>
                        <p>
                            Currently open to selective collaborations —
                            product teams, studios, and the occasional
                            long weekend on something weird.
                        </p>
                    </div>
                </div>

                <dl className="ef-about-facts">
                    <div><dt>name</dt><dd>Emanuele Frascella</dd></div>
                    <div><dt>based</dt><dd>Taranto, IT</dd></div>
                    <div><dt>tz</dt><dd>CET / CEST</dd></div>
                    <div><dt>exp</dt><dd>5+ years</dd></div>
                </dl>
            </div>

            <Timeline items={timeline} />

            <div
                className="ef-about-bigword"
                aria-hidden
                style={{ transform: `translate3d(${(mouse.x - 0.5) * -10}px, ${(rel - 0.5) * 120}px, 0)` }}
            >
                about
            </div>
        </section>
    );
}
