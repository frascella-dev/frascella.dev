/**
 * One definition of "this is a phone", shared by the scripts and mirrored by
 * the media queries in the stylesheets. Keep the two in step.
 *
 * Two separate questions get asked about small screens, and they don't have
 * the same answer:
 *
 *   LAYOUT  — how wide is the window? Width alone, so a narrowed desktop
 *             window gets the stacked layout too. That lives in CSS as
 *             `@media (max-width: 900px)`.
 *   WEIGHT  — what is this device able to spend? A coarse pointer means a
 *             phone or tablet regardless of how wide it reports, and that is
 *             what decides whether the fluid solver runs, how much dust the
 *             corridor draws, and what pixel ratio it renders at.
 */
export const MOBILE_QUERY = "(max-width: 900px), (pointer: coarse)";

/** True where the heavy version of the page should not be paid for. */
export const isLite = () => matchMedia(MOBILE_QUERY).matches;

/**
 * Scroll lock, counted. Two things lock the page — the splash while it plays,
 * the menu while it is open — and they overlap: open the menu before the
 * splash has finished and whichever releases first would otherwise hand the
 * scroll back while the other still needs it held.
 */
let locks = 0;

// A class rather than an inline `overflow`, because `overflow: hidden` alone
// is not a scroll lock on iOS Safari — touch panning has to be refused too,
// and that (`touch-action`, `overscroll-behavior`, the body mirror) lives in
// one place in base.css. Nothing here touches scroll position, so releasing
// the lock puts the reader back exactly where they were.
export function lockScroll() {
    locks += 1;
    document.documentElement.classList.add("is-locked");
}

export function unlockScroll() {
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.documentElement.classList.remove("is-locked");
}
