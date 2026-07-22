import { lazy, Suspense, useEffect, useRef, useState } from "react";
import ConsoleUnlockDialog from "./ConsoleUnlockDialog.tsx";
import { isConsoleUnlocked, unlockConsole } from "../lib/consoleUnlock.ts";

// The playable panel drags in three.js + r3f, so it's a separate chunk
// fetched only once the section is near the viewport — the same lazy +
// near-viewport pattern About uses for the big-bang timeline, Work for the
// corridor and Contact for the social blocks. Until then (and forever on
// touch, and under reduced motion) the still plate below stands in, so the
// layout is never an empty box waiting on a download.
const InterestsAsteroids = lazy(() => import("./InterestsAsteroids.tsx"));

/** True once the element is within `rootMargin` of the viewport — latches on. */
function useNearViewport(
    ref: React.MutableRefObject<HTMLElement | null>,
    rootMargin = "500px",
) {
    const [near, setNear] = useState(false);
    useEffect(() => {
        if (near) return;
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setNear(true);
                    io.disconnect();
                }
            },
            { rootMargin },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [ref, near, rootMargin]);
    return near;
}

/** Unlatched: true only while the element is actually on screen. Drives the
 *  game's frameloop, so an idle run costs nothing once you've scrolled past. */
function useOnScreen(ref: React.MutableRefObject<HTMLElement | null>) {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(
            (entries) => setOn(entries.some((e) => e.isIntersecting)),
            { threshold: 0.15 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [ref]);
    return on;
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const on = () => setReduced(mq.matches);
        mq.addEventListener("change", on);
        return () => mq.removeEventListener("change", on);
    }, []);
    return reduced;
}

/** Fine pointer + a real hover: the two things this game's controls assume.
 *  Not a width check — a small window on a laptop still has a mouse, and a
 *  1024px tablet very much doesn't. */
function useHasPointer() {
    const [has, setHas] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    );
    useEffect(() => {
        const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
        const on = () => setHas(mq.matches);
        mq.addEventListener("change", on);
        return () => mq.removeEventListener("change", on);
    }, []);
    return has;
}

/**
 * The still plate — what the field is when there's no mouse to play it with
 * (touch), when motion is reduced, and for the moment before the chunk
 * lands. Same register as the running game, one frame of it held: hairline
 * wireframe ship, a few drifting targets, one orange tracer. Drawn as inline
 * SVG so it costs nothing and scales with the stage.
 */
function InterestsPlate({ note }: { note: string }) {
    // Spread across a deliberately roomy viewBox: the plate is an underlay
    // behind the section's copy, so the glyphs want to be sparse and small
    // rather than a busy illustration fighting the type.
    const bugs: [number, number, number][] = [
        [470, 120, 1],
        [150, 96, 0.82],
        [548, 300, 0.9],
        [300, 348, 0.7],
    ];
    return (
        <div className="ef-int-plate">
            {/* "slice", not the default "meet": the stage is full-bleed and its
                aspect swings wildly between phone and desktop, so the plate
                crops rather than letterboxing — the glyphs keep their
                proportions either way. */}
            <svg
                viewBox="0 0 680 420"
                preserveAspectRatio="xMidYMid slice"
                className="ef-int-plate-svg"
                aria-hidden
            >
                {/* ship */}
                <g transform="translate(214 268) rotate(38)">
                    <path
                        d="M0 -15 L10 11 L0 5 L-10 11 Z"
                        className="ef-int-plate-ship"
                    />
                    <circle
                        cx="0"
                        cy="-3"
                        r="2.6"
                        className="ef-int-plate-acc"
                    />
                </g>
                {/* tracer */}
                <path d="M234 242 L268 216" className="ef-int-plate-bolt" />
                {/* targets */}
                {bugs.map(([x, y, s], i) => (
                    <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
                        <path
                            d="M0 -13 L8 0 L0 13 L-8 0 Z"
                            className="ef-int-plate-bug"
                        />
                        <path
                            d="M0 -13 L0 -20 M-4 -18 L-7 -24 M4 -18 L7 -24"
                            className="ef-int-plate-bug"
                        />
                        <path
                            d="M-8 -2 L-15 -6 M-8 3 L-15 8 M8 -2 L15 -6 M8 3 L15 8"
                            className="ef-int-plate-bug"
                        />
                    </g>
                ))}
            </svg>
            <span className="ef-int-plate-note ef-mono">{note}</span>
        </div>
    );
}

/** The score that earns the console. High enough to be a real sitting —
 *  ~20 kills of the common target — low enough that it's plainly reachable. */
const BONUS_SCORE = 10000;

export default function Interests() {
    const wrapRef = useRef<HTMLElement | null>(null);
    const near = useNearViewport(wrapRef);
    const onScreen = useOnScreen(wrapRef);
    const reducedMotion = usePrefersReducedMotion();
    const hasPointer = useHasPointer();
    const [score, setScore] = useState(0);
    const [celebrating, setCelebrating] = useState(false);
    const [unlocked, setUnlocked] = useState(() => isConsoleUnlocked());

    // The bonus is not a promise this section can't keep: 10 000 points is the
    // trigger lib/consoleUnlock.ts was written for and never got (see App.tsx
    // — "no trigger is wired at the moment"). Crossing the line unlocks the
    // terminal for real and shows the shared payoff card once, on the moment
    // itself, never off the persisted flag.
    // Past the line the spawner is switched off (see `spawning` below): the
    // field empties as you clear it instead of running forever, so the
    // section ends rather than idling.
    const onScore = (total: number) => {
        setScore(total);
        if (total >= BONUS_SCORE && !isConsoleUnlocked()) {
            unlockConsole();
            setUnlocked(true);
            setCelebrating(true);
        }
    };

    // Three honest reasons not to boot the game, in order: no mouse (the
    // controls are the whole point and can't be faked with a thumb), motion
    // turned down, or simply too far up the page to have been asked for yet.
    const playable = hasPointer && !reducedMotion;
    const showGame = playable && near;

    const plateNote = !hasPointer
        ? "pointer only — this one needs a mouse"
        : reducedMotion
          ? "motion reduced — still frame"
          : "loading…";

    return (
        <section className="ef-int" ref={wrapRef} aria-labelledby="int-title">
            {/* The field is an underlay: it starts at the § 03.1 rule and runs
                behind the heading and the lede, which are pointer-transparent
                so the whole stage is playable. No frame, no caption, no start
                screen, no control panel — the walls sit exactly on the stage's
                edges, so the boundary is the layout itself, and the one line
                under the score is all the instruction anyone needs. */}
            <div className="ef-int-stage">
                <div className="ef-int-underlay">
                    {showGame ? (
                        <Suspense fallback={<InterestsPlate note="loading…" />}>
                            <InterestsAsteroids
                                visible={onScreen}
                                spawning={score < BONUS_SCORE}
                                onScore={onScore}
                            />
                        </Suspense>
                    ) : (
                        <InterestsPlate note={plateNote} />
                    )}
                </div>

                <div className="ef-int-top">
                    <div className="ef-int-head">
                        {/* 03.1: a subsection of About (§ 03), like the timeline —
                    which shifts to § 03.2 below. § 04 stays the colophon in
                    Contact.tsx. The decimal keeps the § pointing at a real
                    number, which is the only thing the sign is for. */}
                        <span className="ef-label">§ 03.1 — Interests</span>
                        <h3 className="ef-h3 ef-int-title" id="int-title">
                            <span>off the clock,</span>
                            <em>I still write loops.</em>
                        </h3>
                        <p className="ef-int-lede">
                            The first machine I owned came apart more often than
                            it worked, and games were the reason I kept opening
                            it. They're still the clearest thing I know how to
                            explain: read the input, advance the state, draw it,
                            repeat — sixty times a second, and it either holds
                            together or it doesn't. Most of what I do now is the
                            same loop with the deadline attached.
                        </p>
                    </div>
                </div>
            </div>

            {/* The readout, in the same big-word register as About's "about"
                and Work's "work" — the score is the only number this section
                keeps, so it gets to be the section's word. Only where there's
                a game to feed it: on touch a frozen 00000 and a goal nobody
                can reach would be a tease, so the plate's one-line note is
                the whole story there instead. */}
            {playable && (
                <div className="ef-int-foot">
                    <div className="ef-int-score" aria-hidden>
                        {String(score).padStart(5, "0")}
                        {/* The target, set beside the running total in the same
                        cut at a third the size: that's the whole hint. A
                        number you're visibly counting towards reads as a goal
                        without a banner explaining that it is one. */}
                        {!unlocked && (
                            <span className="ef-int-score-goal">/ 10000</span>
                        )}
                    </div>
                    <p className="ef-int-goal ef-label" role="status">
                        {unlocked
                            ? "console unlocked — the tab is on the right edge"
                            : "there's something behind ten thousand."}
                    </p>
                    {playable && !unlocked && (
                        <p className="ef-int-hint ef-label">
                            move to steer · hold click to fire · the edges hold
                        </p>
                    )}
                </div>
            )}

            {celebrating && (
                <ConsoleUnlockDialog onClose={() => setCelebrating(false)} />
            )}
        </section>
    );
}
