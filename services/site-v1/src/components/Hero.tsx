import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap.ts";

export default function Hero() {
    const stageRef = useRef(null);
    const titleRef = useRef(null);
    const subRef = useRef(null);
    const botrowRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

    // GSAP entrance pass. Hero sits above the fold, so unlike every other
    // section's scroll-triggered reveal, its content plays immediately on
    // load rather than waiting for a ScrollTrigger: the headline words rise
    // up out of their masked lines, then the sub-copy and the bottom meta
    // row settle in just behind them.
    useLayoutEffect(() => {
        if (!stageRef.current) return;
        const ctx = gsap.context(() => {
            if (prefersReducedMotion()) return; // final state IS the DOM's resting state — nothing to set.

            // Headline words rise up from behind their line's mask (see the
            // `.ef-hero-title .ef-line { overflow: hidden }` rule in
            // hero.css) — the word spans are already `display: inline-block`
            // there, which is what lets a yPercent transform apply cleanly.
            const words = titleRef.current
                ? titleRef.current.querySelectorAll(".ef-w")
                : [];
            if (words.length) {
                gsap.from(words, {
                    yPercent: 120,
                    opacity: 0,
                    duration: 0.9,
                    stagger: 0.06,
                    ease: "power3.out",
                    delay: 0.15,
                });
            }

            const tail = [subRef.current, botrowRef.current].filter(Boolean);
            if (tail.length) {
                gsap.from(tail, {
                    y: 20,
                    opacity: 0,
                    duration: 0.8,
                    stagger: 0.12,
                    ease: "power2.out",
                    delay: 0.6,
                });
            }
        }, stageRef);

        // ctx.revert() cleans up the tweens on unmount — matters here since the
        // React island can remount.
        return () => ctx.revert();
    }, []);

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
                <h1 className="ef-hero-title" ref={titleRef}>
                    <span className="ef-line ef-line--1">
                        <span className="ef-w">software</span>
                        <em className="ef-w ef-w--em">engineer</em>
                    </span>
                    <span className="ef-line ef-line--2">
                        <span className="ef-w ef-w--thin">across</span>
                        <span className="ef-w">systems</span>
                    </span>
                    <span className="ef-line ef-line--3">
                        <span className="ef-w ef-w--thin">&amp;</span>
                        <span className="ef-w">interfaces.</span>
                    </span>
                </h1>

                <div className="ef-hero-sub" ref={subRef}>
                    <div className="ef-hero-sub-col">
                        <span className="ef-label">idx — 01</span>
                        <p>
                            Emanuele Frascella. I build software meant to
                            hold up — stable under load, considered in
                            the details.
                        </p>
                    </div>
                    <div className="ef-hero-sub-col">
                        <span className="ef-label">based — taranto, it</span>
                        <p>
                            I like solving problems that stay solved. When I'm
                            not writing production code, I'm probably
                            overengineering something at home for fun.
                        </p>
                    </div>
                </div>
            </div>

            <div className="ef-hero-botrow" ref={botrowRef}>
                <div className="ef-hero-botcol">
                    <span className="ef-label">lat — 40.47° n</span>
                    <span className="ef-label">lon — 17.24° e</span>
                </div>
                <a href="#about" className="ef-hero-scroll" data-cursor="link">
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
