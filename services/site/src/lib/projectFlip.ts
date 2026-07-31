// A tiny module-level mailbox that carries a GSAP Flip "before" state across
// the Work -> ProjectPage hash-route swap.
//
// Why a module singleton and not React context/state: the two ends of the
// hand-off never coexist. Work captures the state and, in the same tick,
// flips the hash — React then unmounts Work and mounts ProjectPage as a
// completely separate subtree (see App.tsx: `onDetail ? <ProjectPage/> :
// <>...</>`). There's no shared parent to thread props or context through
// between the two renders, so a plain module variable is the simplest thing
// that works: write it just before the hash change, read (and clear) it once
// on the very next mount.
import { Flip } from "./gsap.ts";

let stashed: Flip.FlipState | null = null;

// Flip matches elements between a captured state and a later `.from()` call
// by their `data-flip-id` attribute (auto-assigning one per element if it's
// missing) — so morphing from the *card* (unmounted) onto the *hero* (a
// different element entirely) only works if both wear the same id. One
// fixed id is enough: only one hand-off is ever in flight at a time (a
// single click, a single navigation).
const FLIP_ID = "project-hero";

/** Capture the clicked card's current box (position, size) before the hash
 *  change unmounts it. Call this synchronously in the click handler, before
 *  `location.hash` is assigned — Flip.getState reads the live DOM, so it has
 *  to run while the source element still exists. */
export function stashProjectFlip(el: Element | null | undefined) {
    if (!el) return;
    el.setAttribute("data-flip-id", FLIP_ID);
    stashed = Flip.getState(el);
}

/** Tag the ProjectPage hero (or 404 panel) with the same id right before
 *  Flip.from runs, so it's recognised as the same "flip" as the card that
 *  was stashed — Flip.from(state, {targets}) only animates elements whose
 *  data-flip-id matches something in `state`. */
export function tagProjectFlipTarget(el: Element | null | undefined) {
    if (!el) return;
    el.setAttribute("data-flip-id", FLIP_ID);
}

/** Read and clear the stashed state. Returns null if nothing was stashed
 *  (direct load, a reload, prev/next nav within ProjectPage, or reduced
 *  motion, which never stashes in the first place) — callers should fall
 *  back to a plain entrance in that case. */
export function takeProjectFlip(): Flip.FlipState | null {
    const s = stashed;
    stashed = null;
    return s;
}
