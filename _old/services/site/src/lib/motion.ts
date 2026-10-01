import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// On a phone the URL bar slides away as you scroll and the viewport gets
// ~10% taller mid-gesture. Left alone, ScrollTrigger treats that as a resize,
// recalculates every start/end, and the pinned work stage jumps under your
// thumb. This tells it to sit out height-only changes on touch devices.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };

/** The one place the reduced-motion preference is read. */
export const reducedMotion = () =>
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

export const clamp = (min: number, max: number, v: number) =>
    v < min ? min : v > max ? max : v;

/** Linear map of `v` from [a, b] into [0, 1], clamped at both ends. */
export const between = (a: number, b: number, v: number) =>
    b === a ? 0 : clamp(0, 1, (v - a) / (b - a));
