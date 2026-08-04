import { initContactForm } from "./contact.ts";
import { initNav } from "./nav.ts";
import { isLite } from "./env.ts";
import { projects } from "../data/site.ts";
import type { CorridorState } from "./corridor.ts";

// Deliberately not imported from `./motion.ts` — that module pulls in GSAP,
// and nothing on the reduced-motion path should pay for it.
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// The `js` / `motion` markers this module's behaviour has to agree with are
// set by the inline head script in Base.astro — they have to be on the
// element before the first paint, which a deferred module is far too late for.

// Navigation and the form are the two things that have to work on every
// path — before the motion layer, and whether or not it ever loads.
initNav();
initContactForm();

// The form is the only thing that has to work everywhere. Everything past
// this point is decoration, and a reader who asked for less motion gets the
// page as a plain document — no splash, no fluid, no corridor.
if (!reducedMotion()) {
    const state: CorridorState = { progress: 0, intro: 1, outro: 0 };
    // A phone gets the same page, not a cheaper one — but it gets it without
    // the parts that cost more than they show at that size.
    const lite = isLite();

    const boot = async () => {
        // The pointer is replaced before anything else — the splash is the
        // first thing anyone hovers. (On touch `initCursor` returns straight
        // away; the module is small enough not to be worth branching on.)
        import("./cursor.ts").then(({ initCursor }) => initCursor());

        const [{ playSplash }, { initScroll, prepareHero, stageCoversViewport }] =
            await Promise.all([import("./splash.ts"), import("./scroll.ts")]);

        // The splash owns the first seconds and locks scrolling; layout is
        // measured after it lifts, so ScrollTrigger sees final positions.
        // Same drawing at the same pace everywhere.
        const splash = playSplash();

        // While the panel still covers the page, park the hero in its hidden
        // starting pose — done any later, the iris would reveal the finished
        // layout for a beat before it snapped back to animate in.
        prepareHero();

        const workCanvas = document.querySelector<HTMLCanvasElement>("[data-three]");

        // The fluid is a pressure solve over the whole viewport, eighteen
        // Jacobi iterations a frame. On a phone that is a real amount of
        // battery for a texture you can barely see; `styles/base.css` puts a
        // static paper behind the page there instead.
        if (!lite) {
            const fluidCanvas = document.querySelector<HTMLCanvasElement>("[data-fluid]");
            if (fluidCanvas) {
                import("./fluid.ts").then(({ initFluid }) =>
                    initFluid(fluidCanvas, { paused: stageCoversViewport }),
                );
            }
        }

        if (workCanvas) {
            import("./corridor.ts").then(({ initCorridor }) =>
                initCorridor(workCanvas, projects, state, { lite }),
            );
        }

        await splash;
        initScroll(state);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
}
