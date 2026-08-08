import { gsap, ScrollTrigger } from "./motion.ts";
import { lockScroll, unlockScroll } from "./env.ts";

/**
 * Draws the monogram on its construction grid, then irises the panel shut.
 * Resolves once the page is scrollable again, so callers can wait for it
 * before measuring anything.
 */
export function playSplash(root: ParentNode = document): Promise<void> {
    const done = () => document.documentElement.classList.remove("splash-open");

    const el = root.querySelector<HTMLElement>("[data-splash]");
    if (!el) {
        done();
        return Promise.resolve();
    }

    const guides = [...el.querySelectorAll<SVGGeometryElement>("[data-g]")];
    const dots = [...el.querySelectorAll<SVGCircleElement>("[data-n]")];
    const paths = [...el.querySelectorAll<SVGPathElement>("[data-splash-path]")];

    // Scroll is locked for the duration: the page underneath is mid-layout
    // and the hero's entrance is timed to start once the panel is gone.
    lockScroll();

    // Prime every stroke to be fully "undrawn".
    for (const p of [...guides, ...paths]) {
        const len = typeof p.getTotalLength === "function" ? p.getTotalLength() : 0;
        if (!len) continue;
        p.style.strokeDasharray = String(len);
        p.style.strokeDashoffset = String(len);
    }
    gsap.set(dots, { opacity: 0, transformOrigin: "50% 50%", scale: 0 });

    return new Promise((resolve) => {
        const finish = () => {
            el.style.display = "none";
            unlockScroll();
            done();
            ScrollTrigger.refresh();
            resolve();
        };

        gsap
            .timeline()
            .to(guides, {
                strokeDashoffset: 0,
                duration: 0.55,
                ease: "power1.inOut",
                stagger: { each: 0.035, from: "center" },
            })
            .to(dots, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)", stagger: 0.022 }, "-=0.25")
            .to(paths, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.14 }, "-=0.1")
            .to(paths, { fillOpacity: 1, duration: 0.55, ease: "power2.out", stagger: 0.07 }, "-=0.2")
            .to([...guides, ...dots], { opacity: 0, duration: 0.5, ease: "power2.inOut" }, "-=0.4")
            .to(paths, { strokeOpacity: 0, duration: 0.35 }, "-=0.35")
            .to(paths, { opacity: 0, duration: 0.4, ease: "power2.in" }, "+=0.3")
            .fromTo(
                el,
                { clipPath: "circle(150% at 50% 50%)" },
                {
                    clipPath: "circle(0% at 50% 50%)",
                    duration: 1.05,
                    ease: "power3.inOut",
                    onComplete: finish,
                },
                "-=0.2",
            );
    });
}
