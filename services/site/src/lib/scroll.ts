import { gsap, ScrollTrigger, clamp, between } from "./motion.ts";
import { projects } from "../data/site.ts";
import { isLite } from "./env.ts";
import type { CorridorState } from "./corridor.ts";

/**
 * Viewport height, cached. On a phone the URL bar slides away mid-scroll and
 * `innerHeight` grows ~10% — every threshold below is expressed in screens,
 * so reading it live would move the whole timeline under the reader's thumb.
 * Only a width change counts as a genuinely new layout there; on a desktop,
 * where dragging the window edge is deliberate, both axes count.
 */
let vh = window.innerHeight;
let vw = window.innerWidth;

function watchViewport() {
    addEventListener("resize", () => {
        if (window.innerWidth === vw && isLite()) return;
        vw = window.innerWidth;
        vh = window.innerHeight;
        ScrollTrigger.refresh();
    });
}

/**
 * True once the work section's dark iris has grown past the edges of the
 * viewport. The fluid background polls it so it can stop simulating a page
 * nobody can see.
 */
let stageCovered = false;
export const stageCoversViewport = () => stageCovered;

/**
 * Everything scroll- and pointer-driven in the DOM. The three.js corridor
 * reads its camera position out of `state`, which this module writes.
 */
export function initScroll(state: CorridorState) {
    watchViewport();
    parallax();
    heroEntrance();
    navHover();
    navRetreat();
    reveals();
    accordion();
    cursorTile();
    workStage(state);
    ScrollTrigger.refresh();
}

/** `data-speed` > 1 moves with the scroll, < 1 lags behind it. */
function parallax() {
    // Stacked, the elements carrying `data-speed` are in normal flow — moving
    // them would just tear a gap in the layout. And it is the first thing to
    // drop on a phone anyway.
    if (isLite()) return;
    document.querySelectorAll<HTMLElement>("[data-speed]").forEach((el) => {
        const s = parseFloat(el.dataset.speed!);
        const sec = el.closest("section");
        const first = sec?.id === "top";
        gsap.fromTo(
            el,
            { y: 0 },
            {
                y: () => (1 - s) * window.innerHeight * (first ? 0.7 : 0.9),
                ease: "none",
                immediateRender: false,
                scrollTrigger: {
                    trigger: sec,
                    start: first ? "top top" : "top bottom",
                    end: "bottom top",
                    scrub: 0.6,
                    invalidateOnRefresh: true,
                },
            },
        );
    });
}

/**
 * The stacked layout's answer to `data-speed`. Nothing in flow moves: the
 * portrait is oversized inside a fixed window and drifts within it, so the
 * image has depth while the layout around it stays exactly where it is.
 * Deliberately one element — on a small screen, type that slides while you
 * read it reads as jank rather than as depth.
 *
 * Created from `prepareHero`, under the splash: the frame is usually already
 * partway up the viewport when the page loads, and a scrubbed trigger born
 * in view *animates* from the `from` pose to the current scroll's value — a
 * quick downward lurch of the image right as the splash lifted. Building it
 * while the panel still covers the page and snapping it to the live progress
 * means the reveal shows the image already settled.
 */
function heroDrift() {
    if (!isLite()) return;
    const frame = document.querySelector<HTMLElement>(".hero-portrait-frame");
    const img = frame?.querySelector("img");
    if (!frame || !img) return;

    const tw = gsap.fromTo(
        img,
        { yPercent: -8 },
        {
            yPercent: 8,
            ease: "none",
            scrollTrigger: {
                trigger: frame,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.5,
                invalidateOnRefresh: true,
            },
        },
    );
    const st = tw.scrollTrigger;
    if (st) tw.progress(st.progress);
}

/**
 * The hero entrance, in two halves. `prepareHero` splits the headline into
 * words and parks everything in its hidden starting pose; it runs while the
 * splash still covers the page, so by the time the panel irises away the
 * hero is already waiting off-stage — no flash of the finished layout
 * snapping back to frame one. `heroEntrance` then only has to play.
 */
const heroWords: HTMLElement[] = [];
let heroPrepared = false;

export function prepareHero() {
    if (heroPrepared) return;
    heroPrepared = true;

    const title = document.querySelector<HTMLElement>("[data-hero-title]");
    if (title && !title.dataset.split) {
        title.dataset.split = "1";
        const walk = (node: Node) => {
            for (const n of [...node.childNodes]) {
                if (n.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    for (const t of (n.textContent ?? "").split(/(\s+)/)) {
                        if (!t.trim()) {
                            if (t) frag.appendChild(document.createTextNode(t));
                            continue;
                        }
                        const sp = document.createElement("span");
                        sp.textContent = t;
                        sp.style.display = "inline-block";
                        sp.setAttribute("data-w", "1");
                        frag.appendChild(sp);
                        heroWords.push(sp);
                    }
                    node.replaceChild(frag, n);
                } else if (n.nodeType === Node.ELEMENT_NODE) {
                    walk(n);
                }
            }
        };
        walk(title);
        gsap.set(heroWords, { yPercent: 108, rotate: 5, opacity: 0 });
    }

    const chips = document.querySelector<HTMLElement>("[data-hero-chips]");
    if (chips) gsap.set(chips.children, { opacity: 0, y: 16 });

    heroDrift();
}

function heroEntrance() {
    // Belt and braces: on any path that never called `prepareHero` this
    // degrades to exactly the old behaviour — set and play in the same tick.
    prepareHero();

    if (heroWords.length) {
        gsap.to(heroWords, {
            yPercent: 0,
            rotate: 0,
            opacity: 1,
            duration: 1.05,
            ease: "power4.out",
            stagger: 0.035,
            delay: 0.12,
        });
    }

    const chips = document.querySelector<HTMLElement>("[data-hero-chips]");
    if (chips) {
        gsap.to(chips.children, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.05,
            delay: 0.7,
        });
    }
}

/** Nav labels roll up and a duplicate rolls in from below. */
function navHover() {
    document.querySelectorAll<HTMLElement>("[data-navlink]").forEach((a) => {
        const up = a.querySelector("[data-nav-a]");
        const down = a.querySelector("[data-nav-b]");
        gsap.set(down, { yPercent: 100, y: 0, visibility: "visible" });
        let tl: gsap.core.Timeline | null = null;
        const run = (u: number, d: number) => {
            tl?.kill();
            tl = gsap
                .timeline()
                .to(up, { yPercent: u, duration: 0.42, ease: "power3.inOut" }, 0)
                .to(down, { yPercent: d, duration: 0.42, ease: "power3.inOut" }, 0);
        };
        a.addEventListener("mouseenter", () => run(-100, 0));
        a.addEventListener("mouseleave", () => run(0, 100));
        a.addEventListener("focus", () => run(-100, 0));
        a.addEventListener("blur", () => run(0, 100));
    });
}

/**
 * The header stands down over the contact section.
 *
 * By the time contact slides under it the bar has nothing left to offer: it
 * is the last section, and its own footer carries the same four links plus
 * everything else. What is left is one blended white rule lying across a page
 * that is trying to end — so it leaves, and comes back on the way up.
 *
 * Wide viewports only. Narrow, the header holds the menu button, which is the
 * only way to navigate at all; hiding it there would strand the reader at the
 * bottom of the page. `gsap.matchMedia` is what puts it back on a resize
 * across the breakpoint — its cleanup runs when the query stops matching.
 */
function navRetreat() {
    const nav = document.querySelector<HTMLElement>(".nav");
    const contact = document.querySelector<HTMLElement>("#contact");
    if (!nav || !contact) return;

    gsap.matchMedia().add("(min-width: 901px)", () => {
        // `autoAlpha` rather than opacity alone: at zero it also sets
        // `visibility: hidden`, which takes the links out of the tab order
        // instead of leaving an invisible header to tab into.
        const retreat = gsap.to(nav, {
            yPercent: -140,
            autoAlpha: 0,
            duration: 0.4,
            ease: "power2.inOut",
            paused: true,
        });

        const trigger = ScrollTrigger.create({
            trigger: contact,
            // The moment the section's top edge reaches the underside of the
            // bar — that is when the two start overlapping, and not before.
            start: "top 76px",
            // Not `max`: a trigger is active for `start <= scroll < end`, so
            // ending at the last scrollable pixel would make it inactive at
            // exactly the position the reader stops at — the header would
            // reappear on the final pixel of the page. Contact is the last
            // section, so its bottom never reaches the top of the viewport
            // and this end is simply never crossed.
            end: "bottom top",
            onToggle: (self) => (self.isActive ? retreat.play() : retreat.reverse()),
        });

        return () => {
            trigger.kill();
            retreat.kill();
            gsap.set(nav, { clearProps: "transform,opacity,visibility" });
        };
    });
}

function reveals() {
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
            opacity: 0,
            yPercent: 14,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
    });
    document.querySelectorAll<HTMLElement>("[data-field]").forEach((el, i) => {
        gsap.from(el, {
            opacity: 0,
            y: 24,
            duration: 0.8,
            ease: "power3.out",
            delay: i * 0.06,
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
    });
}

/** One row open at a time, plus the ink-wipe on each headline. */
function accordion() {
    const rows = [...document.querySelectorAll<HTMLElement>("[data-acc]")];
    if (!rows.length) return;
    let open = -1;

    const setOpen = (i: number) => {
        rows.forEach((row, k) => {
            const on = k === i;
            const head = row.querySelector<HTMLElement>("[data-acc-head]")!;
            head.setAttribute("aria-expanded", String(on));
            gsap.to(row.querySelector("[data-acc-panel]"), {
                height: on ? "auto" : 0,
                duration: 0.62,
                ease: "power3.inOut",
                onComplete: () => ScrollTrigger.refresh(),
            });
            gsap.to(
                [row.querySelector("[data-acc-index]"), row.querySelector("[data-acc-meta]")],
                { color: on ? "rgb(150,110,60)" : "rgba(20,20,20,.5)", duration: 0.35 },
            );
        });
        open = i;
    };

    rows.forEach((row, i) => {
        const head = row.querySelector<HTMLElement>("[data-acc-head]")!;
        // The markup ships expanded (that is the truth without this module);
        // taking the rows over means correcting that first.
        head.setAttribute("aria-expanded", "false");
        gsap.to(row.querySelector("[data-fill]"), {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.15,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 88%", once: true },
        });
        head.addEventListener("click", () => setOpen(open === i ? -1 : i));
        head.addEventListener("mouseenter", () =>
            gsap.to(head, { x: 14, duration: 0.5, ease: "power3.out" }),
        );
        head.addEventListener("mouseleave", () =>
            gsap.to(head, { x: 0, duration: 0.5, ease: "power3.out" }),
        );
    });

    // Open the first row once the section has settled, so the reader sees
    // what "expand any line" is offering without having to guess.
    setTimeout(() => setOpen(0), 400);
}

/**
 * The hatched tile that trails the pointer anywhere inside the about
 * section. It is the pointer while it's up — `#bio` carries
 * `data-cursor="tile"`, which tells the custom cursor to fade out and let
 * the image stand in for it.
 */
function cursorTile() {
    const tile = document.querySelector<HTMLElement>("[data-cursor-tile]");
    const bio = document.querySelector<HTMLElement>("#bio");
    if (!tile || !bio) return;

    const label = tile.querySelector<HTMLElement>("[data-cursor-label]");
    const xTo = gsap.quickTo(tile, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(tile, "y", { duration: 0.5, ease: "power3.out" });
    const rTo = gsap.quickTo(tile, "rotation", { duration: 0.7, ease: "power3.out" });
    let lastX = 0;
    let visible = false;
    // Last known pointer position, so a scroll can re-run the hit test.
    let px = -1;
    let py = -1;
    // The centring has to be GSAP's, not the stylesheet's: the moment a tween
    // writes `transform`, it writes the whole property and the CSS
    // `translate(-50%, -50%)` is gone — leaving the pointer pinned to the
    // tile's top-left corner instead of its middle.
    gsap.set(tile, { xPercent: -50, yPercent: -50, scale: 0.82, opacity: 0 });

    const hide = () => {
        if (!visible) return;
        visible = false;
        // Coming back in is a new hover, even onto the same row.
        lastRow = null;
        gsap.to(tile, {
            opacity: 0,
            scale: 0.82,
            duration: 0.35,
            ease: "power3.out",
            // "auto", never `true`: a blanket overwrite kills every other
            // tween on this element, and three of them are the quickTo
            // instances that make it follow the pointer at all. Killed once,
            // they never restart and the tile stays where it froze.
            overwrite: "auto",
        });
    };

    const show = () => {
        if (visible) return;
        visible = true;
        // Appear where the pointer is rather than flying in from wherever it
        // was left the last time.
        lastX = px;
        gsap.set(tile, { x: px, y: py, rotation: 0 });
        gsap.to(tile, {
            opacity: 1,
            scale: 1,
            duration: 0.45,
            ease: "power3.out",
            overwrite: "auto",
        });
    };

    // Where each gallery has got to. A row shows its next photograph every
    // time it is hovered afresh, so leaving and coming back moves it on
    // rather than replaying the same frame.
    const frames = new Map<string, number>();
    let lastRow: Element | null = null;

    const photos = [...tile.querySelectorAll<HTMLElement>(".cursor-tile-photo")];
    const showPhoto = (key: string | undefined) => {
        for (const el of photos) delete el.dataset.on;
        if (!key) {
            delete tile.dataset.photo;
            return;
        }
        const set = photos.filter((el) => el.dataset.gallery === key);
        if (!set.length) {
            delete tile.dataset.photo;
            return;
        }
        const next = (frames.get(key) ?? -1) + 1;
        frames.set(key, next);
        set[next % set.length].dataset.on = "";
        tile.dataset.photo = "";
    };

    // Each row names its own label and, optionally, its own set of photographs.
    // Between rows the tile keeps whatever it was last showing rather than
    // going blank.
    const setLabel = (target: Element | null | undefined) => {
        const row = target?.closest?.("[data-acc]") ?? null;
        const head = row?.querySelector<HTMLElement>("[data-acc-head]");
        if (label && head?.dataset.img) label.textContent = head.dataset.img;
        // Only advance when the pointer has actually moved to a different row.
        if (row && row !== lastRow) {
            lastRow = row;
            showPhoto(head?.dataset.gallery);
        }
    };

    const onMove = (e: PointerEvent) => {
        px = e.clientX;
        py = e.clientY;
        const target = e.target as Element | null;
        if (!target?.closest?.("#bio")) {
            hide();
            return;
        }
        setLabel(target);
        show();
        // Tilt in the direction of travel, so it reads as a card being dragged.
        xTo(px);
        yTo(py);
        rTo(clamp(-9, 9, (px - lastX) * 0.6));
        lastX = px;
    };

    // Scrolling slides the section out from under a stationary pointer, and
    // no pointer event fires for that. The hit test is coalesced to one per
    // frame rather than one per scroll event.
    let queued = false;
    const onScroll = () => {
        if (px < 0 || queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            const under = document.elementFromPoint(px, py);
            if (under?.closest?.("#bio")) {
                setLabel(under);
                show();
            } else {
                hide();
            }
        });
    };

    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });
}

/**
 * The work section. Two things are driven here: the dark circle that irises
 * open over the paper page as the section arrives (a plain scroll listener,
 * because it has to keep working while the stage is un-pinned), and the
 * intro → corridor → outro sequence (a scrubbed ScrollTrigger).
 */

function workStage(state: CorridorState) {
    // The whole sequence is measured in screens of scroll. A phone gets a
    // shorter section (see Work.astro), so the beats are tightened to match
    // rather than scaled — the intro and the exit are the parts that can
    // afford to be brisk; the projects still get a screen each.
    const lite = isLite();
    const INTRO_HOLD_VH = lite ? 0.45 : 0.8;
    const INTRO_END_VH = lite ? 0.9 : 1.6;
    const CONTENT_END_VH = lite ? 3.3 : 3.8;
    const OUTRO_FULL_VH = lite ? 2.6 : 3.0;
    /** Screens spent dissolving the stage away. */
    const EXIT_VH = lite ? 0.7 : 1.15;
    /**
     * Where the dissolve finishes, measured in screens from the bottom of the
     * section. Contact's top edge reaches the bottom of the viewport exactly
     * one screen from there, so anything less than 1 means the two overlap and
     * the next section turns up while the corridor is still dissolving. The
     * amount over 1 is the beat of plain black in between — worth having on a
     * phone in particular, where the URL bar retracting hands back height and
     * pulls contact into view earlier than the cached viewport says it should.
     */
    const EXIT_GAP_VH = lite ? 1.55 : 1.45;

    const work = document.querySelector<HTMLElement>("[data-work]");
    const ripple = document.querySelector<HTMLElement>("[data-ripple]");
    const stage = document.querySelector<HTMLElement>("[data-work-stage]");
    const intro = document.querySelector<HTMLElement>("[data-work-intro]");
    const outro = document.querySelector<HTMLElement>("[data-work-outro]");
    const copies = [...document.querySelectorAll<HTMLElement>("[data-work-copy]")];
    if (!work || !ripple || !stage) return;

    let shown = -1;
    const syncCopy = (p: number) => {
        const bar = document.querySelector<HTMLElement>("[data-work-bar]");
        if (bar) bar.style.width = (clamp(0, 1, p) * 100).toFixed(1) + "%";

        const i = Math.min(projects.length - 1, Math.round(p * (projects.length - 1)));
        if (i === shown) return;
        shown = i;

        const t = document.querySelector<HTMLElement>("[data-work-title]");
        const d = document.querySelector<HTMLElement>("[data-work-desc]");
        const m = document.querySelector<HTMLElement>("[data-work-meta]");
        const c = document.querySelector<HTMLElement>("[data-work-counter]");
        const it = projects[i];
        if (c) {
            c.textContent = `${String(i + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
        }
        gsap.fromTo(
            [t, d, m],
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power3.out" },
        );
        if (t) t.textContent = it.title;
        if (d) d.textContent = it.desc;
        if (m) m.textContent = it.meta;
    };

    const updateRipple = () => {
        const end = work.offsetTop;
        const start = end - vh * 0.45;
        const bottom = end + work.offsetHeight;
        const y = window.scrollY || 0;
        const t = between(start, end, y);
        const inside = y >= start && y < bottom;
        if (y < end) {
            state.intro = 1;
            state.progress = 0;
            shown = -1;
            for (const el of copies) el.style.opacity = "0";
        }
        stageCovered = inside && t > 0.98;
        ripple.style.clipPath = `circle(${Math.max(0, t * 150).toFixed(2)}% at 50% 60%)`;
        stage.style.visibility = inside ? "visible" : "hidden";

        // The way out. Without this the stage is a fixed overlay at full
        // opacity right up to its last pixel and then simply isn't there —
        // one frame of corridor, next frame of contact. Fading it over the
        // final stretch turns that cut into a dissolve: the ripple, the black
        // tail behind it and the contact section are all the same black, so
        // only the columns and the outro card actually go, while contact
        // scrolls up through what's left. Driven off scroll position rather
        // than the ScrollTrigger so it holds on refresh and on a jump-scroll.
        const exit = between(bottom - vh * (EXIT_VH + EXIT_GAP_VH), bottom - vh * EXIT_GAP_VH, y);
        stage.style.opacity = (1 - exit * exit * (3 - 2 * exit)).toFixed(3);

        // The stage doesn't take pointer events, so nothing under the cursor
        // can report that the page has gone black — the custom cursor reads
        // this instead. Flip once the iris owns most of the frame.
        const dark = inside && t > 0.6;
        if (dark) document.documentElement.dataset.cursorScheme = "dark";
        else delete document.documentElement.dataset.cursorScheme;
    };

    addEventListener("scroll", updateRipple, { passive: true });
    addEventListener("resize", updateRipple);
    ScrollTrigger.addEventListener("refresh", updateRipple);
    updateRipple();

    ScrollTrigger.create({
        trigger: work,
        start: "top top",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true,
        onToggle: updateRipple,
        onUpdate: (st) => {
            const p = st.progress;
            // Every threshold below is expressed in viewports so the timing
            // survives a resize: `vhP` is one screen as a fraction of the
            // section's total scroll length.
            const vhP = vh / work.offsetHeight;
            const INTRO_HOLD = vhP * INTRO_HOLD_VH;
            const INTRO_END = vhP * INTRO_END_VH;
            // The exit needs room to breathe, so the captions hand over well
            // before the end: card fully arrived by OUTRO_FULL, then a hold,
            // then the last EXIT_VH screens are the dissolve into contact.
            const CONTENT_END = 1 - vhP * CONTENT_END_VH;
            const OUTRO_FULL = 1 - vhP * OUTRO_FULL_VH;

            const introVis = 1 - between(INTRO_HOLD, INTRO_END, p);
            state.intro = introVis;
            if (intro) {
                intro.style.opacity = introVis.toFixed(3);
                intro.style.transform = `translateY(${((1 - introVis) * -26).toFixed(1)}px)`;
            }

            // The camera finishes its travel before the captions do. Without
            // this the last project is centred at exactly the frame the outro
            // starts on — it arrives and leaves in the same instant. Spending
            // the last quarter of the range parked on it gives it a beat.
            const DWELL = 0.25;
            const inner = Math.min(1, between(INTRO_END, CONTENT_END, p) / (1 - DWELL));
            state.progress = inner;
            syncCopy(inner);

            // The captions clear out first, then the outro fades up, then
            // the whole card drifts away as the section releases.
            const MID = CONTENT_END + (OUTRO_FULL - CONTENT_END) * 0.5;
            const copyOut = between(CONTENT_END, MID, p);
            const o = between(MID, OUTRO_FULL, p);
            // Same window the stage fades over, so the card drifting up and
            // the corridor dissolving are one gesture rather than two.
            const away = between(1 - vhP * (EXIT_VH + EXIT_GAP_VH), 1 - vhP * EXIT_GAP_VH, p);
            const visible = o * (1 - away);

            state.outro = copyOut;
            if (outro) {
                outro.style.opacity = visible.toFixed(3);
                outro.style.pointerEvents = visible > 0.6 ? "auto" : "none";
                outro.style.transform = `translateY(${((1 - o) * 26 - away * 18).toFixed(1)}px)`;
            }
            for (const el of copies) {
                el.style.opacity = ((1 - copyOut) * (1 - introVis)).toFixed(3);
            }
            stage.style.pointerEvents = visible > 0.6 ? "auto" : "none";
        },
    });
}
