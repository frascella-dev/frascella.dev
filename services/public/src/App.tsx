import "./styles/app.css";

import { useEffect, useState } from "react";
import Lenis from "lenis";

import CustomCursor from "./components/CustomCursor.tsx";
import Nav, { useRoute } from "./components/Nav.tsx";
import Splash from "./components/Splash.tsx";
import Hero from "./components/Hero.tsx";
import Work from "./components/Work.tsx";
import About from "./components/About.tsx";
import Contact from "./components/Contact.tsx";
import ProjectPage from "./components/ProjectPage.tsx";
import { timeline } from "./data/timeline.ts";

export default function App() {
    const [booted, setBooted] = useState(() => {
        try {
            return sessionStorage.getItem("ef-splash-seen") === "1";
        } catch {
            return false;
        }
    });
    const routeSlug = useRoute();
    const onDetail = !!routeSlug;

    useEffect(() => {
        if (!booted) return;
        const lenis = new Lenis({
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.4,
        });
        (window as any).__lenis = lenis;
        const raf = (time: number) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);

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

        return () => {
            document.removeEventListener("click", onClick);
            window.removeEventListener("scroll", onScroll);
            lenis.destroy();
            if ((window as any).__lenis === lenis) {
                delete (window as any).__lenis;
            }
        };
    }, [booted]);

    return (
        <>
            <div className="ef-scroll-bar" aria-hidden>
                <div className="ef-scroll-bar-fill" id="ef-scroll-fill" />
            </div>

            {!booted && <Splash onDone={() => setBooted(true)} />}
            <CustomCursor />
            <Nav />
            <main
                style={{
                    opacity: booted ? 1 : 0,
                    transition: "opacity 0.6s ease",
                }}
            >
                {onDetail ? (
                    <ProjectPage />
                ) : (
                    <>
                        <Hero />
                        <Work />
                        <About timeline={timeline} />
                        <Contact />
                    </>
                )}
            </main>
        </>
    );
}
