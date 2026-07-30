import { useEffect, useRef, useState } from "react";
import { useReveal } from "./Hooks.tsx";

export default function About() {
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
            setMouse({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("mousemove", onMove);
        onScroll();
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("mousemove", onMove);
        };
    }, []);

    const pxy = (mx, my, sy) => ({
        transform: `translate3d(${(mouse.x - 0.5) * mx}px, ${(mouse.y - 0.5) * my + (rel - 0.5) * sy}px, 0)`,
    });

    return (
        <section
            className={`ef-about ${shown ? "is-in" : ""}`}
            id="about"
            ref={setRefs}
            data-screen-label="02 About"
        >
            <div className="ef-about-field" aria-hidden>
                <div className="ef-about-grid-bg" />

                <div
                    className="ef-rect ef-a-rect--1"
                    style={pxy(-10, 0, -140)}
                />
                <div className="ef-rect ef-a-rect--2" style={pxy(8, 0, -220)} />
                <div className="ef-rect ef-a-rect--3" style={pxy(-6, 0, -80)} />
                <div
                    className="ef-rect ef-a-rect--4"
                    style={pxy(14, 0, -300)}
                />
                <div
                    className="ef-rect ef-a-rect--5"
                    style={pxy(-4, 0, -180)}
                />
                <div
                    className="ef-rect ef-a-rect--acc"
                    style={pxy(-12, 10, -160)}
                />

                <div className="ef-rect ef-a-rule-v" style={pxy(0, 0, -60)} />
                <div className="ef-rect ef-a-rule-h" style={pxy(0, 0, -40)} />

                <svg
                    className="ef-a-cross"
                    viewBox="0 0 40 40"
                    style={pxy(-8, 8, -200)}
                >
                    <line x1="0" y1="20" x2="40" y2="20" />
                    <line x1="20" y1="0" x2="20" y2="40" />
                    <circle cx="20" cy="20" r="4" />
                </svg>

                <div className="ef-a-dot" style={pxy(22, 16, -240)} />
            </div>

            {/* Wraps the head + body content: .ef-about-bigword is
                position:absolute and needs this as its containing block so
                it bleeds at the bottom of the content where it reads. */}
            <div className="ef-about-content">
                <div className="ef-about-head">
                    <span className="ef-label">§ 02 — About</span>
                    <h2 className="ef-about-title">
                        <span className="ef-line ef-line--1">
                            <span className="ef-w">building things</span>
                        </span>
                        <span className="ef-line ef-line--2">
                            <em className="ef-w ef-w--em">that run</em>
                            <span className="ef-w ef-w--thin">quietly,</span>
                        </span>
                        <span className="ef-line ef-line--3">
                            <span className="ef-w ef-w--thin">and well.</span>
                        </span>
                    </h2>
                </div>

                <div className="ef-about-body-wrap">
                    <div className="ef-about-lead">
                        <span className="ef-label">idx — 01</span>
                        <p className="ef-about-lead-text">
                            I work across the whole stack — the data and
                            contracts underneath, the surface people
                            actually touch —
                            <em>
                                {" "}
                                same standard, either layer.
                            </em>
                        </p>
                    </div>

                    <div
                        className="ef-about-portrait"
                        style={{
                            transform: `translate3d(${(mouse.x - 0.5) * -6}px, ${(rel - 0.5) * -60}px, 0) rotate(-2.5deg)`,
                        }}
                    >
                        <picture>
                            <source
                                srcSet={"/images/hero-light.avif"}
                                type="image/avif"
                            />
                            <source
                                srcSet={"/images/hero-light.webp"}
                                type="image/webp"
                            />
                            <img
                                src={"/images/hero-light.jpg"}
                                alt="Portrait of Emanuele Frascella"
                                draggable="false"
                            />
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
                                I care about work that's well-made — a
                                query that comes back fast, an interface
                                that doesn't make you think twice, a deploy
                                that surprises no one on Monday.
                            </p>
                        </div>
                        <div className="ef-about-col">
                            <span className="ef-label">idx — 03</span>
                            <p>
                                Side projects keep me honest — the day job
                                gets the best of me, but not all of me.
                            </p>
                        </div>
                    </div>

                    <dl className="ef-about-facts">
                        <div>
                            <dt>name</dt>
                            <dd>Emanuele Frascella</dd>
                        </div>
                        <div>
                            <dt>based</dt>
                            <dd>Taranto, IT</dd>
                        </div>
                        <div>
                            <dt>tz</dt>
                            <dd>CET / CEST</dd>
                        </div>
                        <div>
                            <dt>exp</dt>
                            <dd>5+ years</dd>
                        </div>
                    </dl>
                </div>

                <div
                    className="ef-about-bigword"
                    aria-hidden
                    style={{
                        transform: `translate3d(${(mouse.x - 0.5) * -10}px, ${(rel - 0.5) * 120}px, 0)`,
                    }}
                >
                    about
                </div>
            </div>
        </section>
    );
}
