/**
 * The mobile menu: a full-screen paper overlay that irises open from the
 * button, inverting the page's colours rather than dimming them.
 *
 * It deliberately does *not* use `<dialog>`. A modal dialog is promoted to
 * the top layer, which would put it over the fixed header — and the header is
 * where the button lives. The two lines that opened the menu have to stay
 * sharp, on top, and clickable so they can cross into an X and close it. So
 * the overlay sits under the header instead, and the three things `<dialog>`
 * would have handled are handled here: the page behind goes `inert`, Escape
 * closes, and focus is moved in and given back.
 *
 * Open/close is a class. The animation is CSS transitions rather than GSAP:
 * navigation has to work on the reduced-motion path too, where the motion
 * layer never loads, and the global reduced-motion rule in base.css collapses
 * these on its own.
 */
import { lockScroll, unlockScroll } from "./env.ts";

export function initNav(root: ParentNode = document) {
    const toggle = root.querySelector<HTMLButtonElement>("[data-nav-toggle]");
    const drawer = root.querySelector<HTMLElement>("[data-nav-drawer]");
    if (!toggle || !drawer) return;

    const page = root.querySelector<HTMLElement>("main");
    const links = [...drawer.querySelectorAll("a")];
    let open = false;

    const setOpen = (next: boolean) => {
        if (next === open) return;
        open = next;
        if (next) {
            // The circle opens from the button that was pressed, so the sheet
            // reads as coming out of it rather than arriving from nowhere.
            const r = toggle.getBoundingClientRect();
            drawer.style.setProperty("--ripple-x", `${Math.round(r.left + r.width / 2)}px`);
            drawer.style.setProperty("--ripple-y", `${Math.round(r.top + r.height / 2)}px`);
        }
        drawer.classList.toggle("is-open", next);
        document.documentElement.classList.toggle("menu-open", next);
        toggle.setAttribute("aria-expanded", String(next));
        toggle.setAttribute("aria-label", next ? "Close menu" : "Open menu");
        // The overlay covers the page but does not stop it scrolling, and a
        // pointer would still reach what is behind the glass.
        if (next) lockScroll();
        else unlockScroll();
        if (page) page.inert = next;

        if (next) links[0]?.focus({ preventScroll: true });
        else toggle.focus({ preventScroll: true });
    };

    toggle.addEventListener("click", () => setOpen(!open));

    // Anywhere on the glass that isn't a link is a dismiss.
    drawer.addEventListener("click", (e) => {
        if (!(e.target as Element).closest("a")) setOpen(false);
    });

    addEventListener("keydown", (e) => {
        if (open && e.key === "Escape") setOpen(false);
    });

    for (const link of links) {
        link.addEventListener("click", () => setOpen(false));
    }

    // Rotating into a layout that shows the inline links would otherwise
    // leave the overlay up with nothing to close it.
    matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
        if (e.matches) setOpen(false);
    });
}
