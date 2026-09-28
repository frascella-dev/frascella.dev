/**
 * Everything marked to be revealed arrives once, as it comes into view.
 *
 * base.css holds it back under `html.motion` and lets it go on `.is-in`; this only adds
 * the class. The theme's markup opts in with `data-reveal` (a stagger is `--reveal-delay`
 * in the markup, next to the thing it times); an Elementor container with the class
 * `frascella-reveal` brings in its widgets one after the other, 80ms a step, unless a widget sets
 * its own delay.
 *
 * The line is drawn at 88% of the viewport: an element is released once it is properly on
 * screen, so the movement is something the reader watches rather than something already
 * over by the time they get there.
 */

export const REVEAL = "[data-reveal], .frascella-reveal > .elementor-element, .frascella-reveal > .e-con-inner > .elementor-element";

export function initReveal(root: ParentNode = document): void {
    if (!document.documentElement.classList.contains("motion")) return;
    const targets = [...root.querySelectorAll<HTMLElement>(REVEAL)].filter((el) => !el.classList.contains("is-in"));
    if (targets.length === 0) return;

    for (const el of targets) {
        if (!el.hasAttribute("data-reveal") && !el.style.getPropertyValue("--reveal-delay")) {
            const index = [...(el.parentElement?.children ?? [])].indexOf(el);
            el.style.setProperty("--reveal-delay", `${index * 0.08}s`);
        }
    }

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-in");
                    observer.unobserve(entry.target);
                }
            }
        },
        { rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of targets) observer.observe(el);
}
