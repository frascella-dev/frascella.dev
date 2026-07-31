// One place to register GSAP + its plugins, so every component imports the
// same already-configured instance instead of each re-registering. GSAP 3.13+
// ships SplitText / ScrollTrigger / Flip in the free public bundle, so no Club
// membership or extra install is needed.
//
// The Lenis <-> ScrollTrigger bridge lives in App.tsx (that's where Lenis is
// created); this module only owns registration and shared config.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";

let registered = false;

/** Idempotent, browser-only plugin registration. Safe to call from any module
 *  top level — Astro renders this island `client:only`, so there's no SSR
 *  pass, but the `window` guard keeps it defensive regardless. */
export function registerGsap() {
    if (registered || typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
    // The whole site honours prefers-reduced-motion elsewhere by simply not
    // starting scroll-driven motion; matchMedia here lets individual tweens
    // opt into the same contract via gsap.matchMedia() when they want it.
    registered = true;
}

registerGsap();

/** True when the visitor asked for less motion — every GSAP entrance in the
 *  site checks this and degrades to an instant, final-state set() instead of
 *  animating, matching the existing IntersectionObserver reveals' behaviour. */
export function prefersReducedMotion(): boolean {
    return (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

export { gsap, ScrollTrigger, SplitText, Flip };
