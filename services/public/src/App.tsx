import "./styles/app.css";

import { lazy, Suspense, useEffect } from "react";
import Lenis from "lenis";

import CustomCursor from "./components/CustomCursor.tsx";
import { useConsoleUnlocked, useIsDesktop } from "./components/Hooks.tsx";
import Nav, { useRoute } from "./components/Nav.tsx";
import Hero from "./components/Hero.tsx";
import Work from "./components/Work.tsx";
import About from "./components/About.tsx";
import Contact from "./components/Contact.tsx";
import ProjectPage from "./components/ProjectPage.tsx";
// Desktop-only, so it's also lazy: gating the render alone would still ship
// xterm and the whole shell in the main bundle to phones that can never open
// it. As a separate chunk, a mobile visitor downloads none of it.
const Console = lazy(() => import("./components/Console.tsx"));
import { timeline } from "./data/timeline.ts";

export default function App() {
    const isDesktop = useIsDesktop();
    const consoleUnlocked = useConsoleUnlocked();
    const routeSlug = useRoute();
    const onDetail = !!routeSlug;

    useEffect(() => {
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
    }, []);

    return (
        <>
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
                        <Work />
                        <About timeline={timeline} />
                        <Contact />
                    </>
                )}
            </main>

            {/* Desktop only, and only once it's been earned. The console
                needs a keyboard and room for draggable windows; on phones and
                tablets it never mounts, so the launcher tab, the terminal and
                the games are all absent — not hidden with CSS, absent. It's
                also an easter egg: until something calls unlockConsole() (see
                lib/consoleUnlock — the trigger is 10 000 points in the § 03.1
                asteroids field, Interests.tsx) it is absent in that same sense, so a visitor who hasn't found it
                downloads none of the chunk either. No fallback: nothing on the
                page depends on it. */}
            {isDesktop && consoleUnlocked && (
                <Suspense fallback={null}>
                    <Console />
                </Suspense>
            )}
        </>
    );
}
