import { useEffect, useRef, useState } from "react";
import { useClock } from "./Hooks.tsx";

export default function Hero() {
    const time = useClock();
    const stageRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        const onMove = (e) => {
            setMouse({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("mousemove", onMove);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("mousemove", onMove);
        };
    }, []);

    const py = (mul) => ({
        transform: `translate3d(0, ${scrollY * mul}px, 0)`,
    });
    const pxy = (mx, my, sy) => ({
        transform: `translate3d(${(mouse.x - 0.5) * mx}px, ${(mouse.y - 0.5) * my + scrollY * sy}px, 0)`,
    });

    return (
        <section
            className="ef-hero"
            id="top"
            data-screen-label="01 Hero"
            ref={stageRef}
        >
            <div className="ef-hero-field" aria-hidden>
                <div className="ef-hero-grid" />

                <div className="ef-rect ef-rect--a" style={pxy(-8, 0, -0.12)} />
                <div className="ef-rect ef-rect--b" style={pxy(12, 0, -0.22)} />
                <div className="ef-rect ef-rect--c" style={pxy(-6, 0, -0.34)} />
                <div className="ef-rect ef-rect--d" style={pxy(4, 0, -0.18)} />
                <div
                    className="ef-rect ef-rect--e"
                    style={pxy(-14, 0, -0.06)}
                />

                <div className="ef-rect ef-rule-v" style={pxy(0, 0, -0.4)} />
                <div className="ef-rect ef-rule-h" style={pxy(0, 0, -0.08)} />

                <div className="ef-hero-dot" style={pxy(20, 14, 0)} />

                <svg
                    className="ef-hero-cross"
                    viewBox="0 0 40 40"
                    style={py(-0.2)}
                >
                    <line x1="0" y1="20" x2="40" y2="20" />
                    <line x1="20" y1="0" x2="20" y2="40" />
                    <circle cx="20" cy="20" r="4" />
                </svg>

                <div
                    className="ef-rect ef-rect--acc"
                    style={pxy(-10, 6, -0.28)}
                />
            </div>

            <div className="ef-hero-toprow">
                <span />
                <span />
            </div>

            <div className="ef-hero-stage">
                <h1 className="ef-hero-title">
                    <span className="ef-line ef-line--1">
                        <span className="ef-w">backend</span>
                        <em className="ef-w ef-w--em">engineer</em>
                    </span>
                    <span className="ef-line ef-line--2">
                        <span className="ef-w">&amp;</span>
                        <span className="ef-w ef-w--thin">occasional</span>
                    </span>
                    <span className="ef-line ef-line--3">
                        <span className="ef-w ef-w--thin">frontend</span>
                        <span className="ef-w">author.</span>
                    </span>
                </h1>

                <div className="ef-hero-sub">
                    <div className="ef-hero-sub-col">
                        <span className="ef-label">idx — 01</span>
                        <p>
                            Emanuele Frascella. Systems, APIs and the things
                            that run on them — designed to stay up, stay
                            readable, and ship on time.
                        </p>
                    </div>
                    <div className="ef-hero-sub-col">
                        <span className="ef-label">based — taranto, it</span>
                        <p>
                            I like solving problems that stay solved. When I'm
                            not shipping production code, I'm probably
                            overengineering something at home for fun.
                        </p>
                    </div>
                </div>
            </div>

            <div className="ef-hero-botrow">
                <div className="ef-hero-botcol">
                    <span className="ef-label">lat — 40.47° n</span>
                    <span className="ef-label">lon — 17.24° e</span>
                </div>
                <a href="#work" className="ef-hero-scroll" data-cursor="link">
                    <span className="ef-hero-scroll-track">
                        <span className="ef-hero-scroll-dot" />
                    </span>
                    <span>scroll to index</span>
                </a>
                <div className="ef-hero-botcol ef-hero-botcol--right">
                    <span className="ef-label">v — 2026.04</span>
                    <span className="ef-label">taranto, it</span>
                </div>
            </div>

            <div
                className="ef-hero-bigname"
                aria-hidden
                style={{
                    transform: `translate3d(${(mouse.x - 0.5) * -14}px, ${scrollY * 0.22}px, 0)`,
                }}
            >
                frascella
            </div>
        </section>
    );
}
