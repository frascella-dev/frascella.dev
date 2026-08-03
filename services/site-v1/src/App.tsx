import "./styles/app.css";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./lib/gsap.ts";

import CustomCursor from "./components/CustomCursor.tsx";
import Nav, { useRoute } from "./components/Nav.tsx";
import Hero from "./components/Hero.tsx";
import Work from "./components/Work.tsx";
import About from "./components/About.tsx";
import Contact from "./components/Contact.tsx";
import ProjectPage from "./components/ProjectPage.tsx";

export default function App() {
    const routeSlug = useRoute();
    const onDetail = !!routeSlug;
    const gridRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.4,
        });
        (window as any).__lenis = lenis;

        // Bridge Lenis -> ScrollTrigger: every Lenis scroll frame drives a
        // ScrollTrigger.update(), and Lenis is stepped from GSAP's own ticker
        // (one clock, no double-RAF drift). lagSmoothing off so a heavy 3D
        // frame can't make ScrollTrigger "catch up" and desync from Lenis.
        lenis.on("scroll", ScrollTrigger.update);
        const onTick = (time: number) => lenis.raf(time * 1000); // ticker = seconds
        gsap.ticker.add(onTick);
        gsap.ticker.lagSmoothing(0);

        const onClick = (e: MouseEvent) => {
            const a = (e.target as HTMLElement).closest('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute("href");
            const id = href!.slice(1);
            if (!id) return;
            const el = document.getElementById(id);
            if (!el) return;
            e.preventDefault();
            lenis.scrollTo(el, { offset: -20, duration: 1.4 });
        };
        document.addEventListener("click", onClick);

        const fill = document.getElementById("ef-scroll-fill");
        const onScroll = () => {
            const max =
                document.documentElement.scrollHeight - window.innerHeight;
            const p = max > 0 ? window.scrollY / max : 0;
            if (fill) fill.style.setProperty("--p", String(p));
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        // Site-wide ambient grid parallax: the fixed grid drifts a little
        // slower/further than the page as you scroll, scrubbed 1:1 against
        // total document scroll. `ease: none` keeps it linear so the drift
        // tracks the wheel exactly rather than easing behind it.
        const gridTween = gsap.to(gridRef.current, {
            yPercent: 9,
            ease: "none",
            scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
            },
        });

        return () => {
            document.removeEventListener("click", onClick);
            window.removeEventListener("scroll", onScroll);
            gsap.ticker.remove(onTick);
            gridTween.scrollTrigger?.kill();
            gridTween.kill();
            lenis.destroy();
            if ((window as any).__lenis === lenis) {
                delete (window as any).__lenis;
            }
        };
    }, []);

    return (
        <>
            <div className="ef-site-grid" aria-hidden>
                <div className="ef-site-grid-inner" ref={gridRef} />
            </div>

            <div className="ef-scroll-bar" aria-hidden>
                <div className="ef-scroll-bar-fill" id="ef-scroll-fill" />
            </div>

            <CustomCursor />
            <Nav />
            <main>
                {onDetail ? (
                    <ProjectPage />
                ) : (
                    <>
                        <Hero />
                        <About />
                        <Work />
                        <Contact />
                    </>
                )}
            </main>
        </>
    );
}
