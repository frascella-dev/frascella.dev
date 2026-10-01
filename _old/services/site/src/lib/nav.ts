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
    initLangMenu(root);

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
        // Both labels come off the button itself (Nav.astro writes them), so
        // this module carries no words of its own and cannot say "Close menu"
        // on an Italian page.
        const label = next ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
        if (label) toggle.setAttribute("aria-label", label);
        // The page holds still while the sheet is up — the lock is counted
        // in env.ts, so it composes with the splash's own lock, and it never
        // touches scroll position, so closing puts the reader back exactly
        // where they were.
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

/**
 * The language dropdown in the header (LangMenu.astro) — phones only, and
 * only because a script is here to open it: the component hides itself unless
 * `html.js` is set, precisely so this never has to draw a button it cannot
 * operate.
 *
 * Much smaller than the drawer above, and deliberately so. It is a menu of
 * two links, not a modal: nothing is locked, nothing goes `inert`, and the
 * page behind stays live. What it does owe a reader is the three ways out of
 * an open menu — pick something, press Escape, or click away from it.
 */
function initLangMenu(root: ParentNode = document): void {
    const toggle = root.querySelector<HTMLButtonElement>("[data-lang-toggle]");
    const panel = root.querySelector<HTMLElement>("[data-lang-panel]");
    if (!toggle || !panel) return;

    // The two are siblings rather than parent and child — the button is in the
    // blended header, the panel is outside it (see Nav.astro) — so "inside the
    // control" is a question about either of them, not about one wrapper.
    const inside = (node: Node | null) =>
        Boolean(node && (toggle.contains(node) || panel.contains(node)));

    let open = false;

    const setOpen = (next: boolean, restoreFocus = true) => {
        if (next === open) return;
        open = next;
        panel.classList.toggle("is-open", next);
        toggle.setAttribute("aria-expanded", String(next));
        if (next) panel.querySelector("a")?.focus({ preventScroll: true });
        else if (restoreFocus) toggle.focus({ preventScroll: true });
    };

    toggle.addEventListener("click", () => setOpen(!open));

    // Anywhere outside closes it — including the menu button beside it, which
    // is what makes opening one close the other.
    addEventListener("pointerdown", (e) => {
        if (open && !inside(e.target as Node)) setOpen(false, false);
    });

    addEventListener("keydown", (e) => {
        if (open && e.key === "Escape") setOpen(false);
    });

    // Tabbing past the last link closes it rather than leaving an open menu
    // behind the reader.
    panel.addEventListener("focusout", (e) => {
        if (open && !inside(e.relatedTarget as Node)) setOpen(false, false);
    });

    // The control is not rendered at all above 900px; leaving it open through
    // a rotation would strand a panel with no button under it.
    matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
        if (e.matches) setOpen(false, false);
    });
}
