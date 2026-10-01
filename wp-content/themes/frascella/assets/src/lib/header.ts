/**
 * The phone's menu: "menu" opens a drawer over the page, "chiudi" (or Esc, or a link)
 * closes it.
 *
 * A disclosure, not a modal dialog: the header stays where it is, with the same button now
 * saying "chiudi". The drawer is an overlay (header.css), so opening it moves nothing on
 * the page; the page under it is `inert`, its scroll is locked, and Tab cycles between the
 * button and the drawer. Focus goes to the drawer's first link on opening and back to the
 * button on closing.
 *
 * The animation is CSS (`.is-open`, only under `html.motion`): the drawer is shown, then
 * opened on the next frame, and on closing hidden once its own transition has ended.
 * Without JavaScript the button is hidden (`hidden` until this runs) and the footer's index
 * is the menu.
 */

export function initHeader(): void {
    const button = document.querySelector<HTMLButtonElement>(".menu-btn");
    const drawer = button ? document.getElementById(button.getAttribute("aria-controls") ?? "") : null;
    if (!button || !drawer) return;
    button.hidden = false;
    const html = document.documentElement;
    const behind = () => [...document.querySelectorAll<HTMLElement>("main, footer, .cue, .hotspots")];
    const isOpen = () => button.getAttribute("aria-expanded") === "true";
    const animated = () => html.classList.contains("motion");
    let closing = 0;

    const set = (open: boolean, focus = true) => {
        window.clearTimeout(closing);
        button.setAttribute("aria-expanded", String(open));
        for (const el of behind()) el.inert = open;
        if (open) {
            // The scrollbar the lock takes away, given back as padding (header.css).
            html.style.setProperty("--scrollbar", `${window.innerWidth - html.clientWidth}px`);
            html.classList.add("drawer-open");
            drawer.hidden = false;
            // One frame shown and closed, so the opening is a transition.
            requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add("is-open")));
            if (focus) drawer.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
        } else {
            drawer.classList.remove("is-open");
            const done = () => {
                if (isOpen()) return;
                drawer.hidden = true;
                html.classList.remove("drawer-open");
            };
            // The closing transition is 220 ms; hidden right after it, or at once without motion.
            if (animated()) closing = window.setTimeout(done, 240);
            else done();
            if (focus) button.focus({ preventScroll: true });
        }
    };

    button.addEventListener("click", () => set(!isOpen()));
    // A link in the drawer goes somewhere on this page or another: the drawer closes first,
    // so the page it scrolls is not inert.
    drawer.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest("a")) set(false, false);
    });
    document.addEventListener("keydown", (e) => {
        if (!isOpen()) return;
        if (e.key === "Escape") {
            set(false);
            return;
        }
        // Tab stays between the button and the drawer.
        if (e.key === "Tab") {
            const stops = [button, ...drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
            const at = stops.indexOf(document.activeElement as HTMLElement);
            const next = e.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : at === stops.length - 1 ? 0 : at + 1;
            e.preventDefault();
            stops[next]?.focus();
        }
    });
    // Back to a desktop width with the drawer open: there is no drawer there.
    matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
        if (e.matches && isOpen()) set(false, false);
    });

    // The drawer's own audio switch follows the header's (#snd-btn, which the scene keeps
    // in step with the turntable) and, clicked, clicks it.
    const main = document.getElementById("snd-btn");
    const mirror = drawer.querySelector<HTMLButtonElement>("[data-sound-mirror]");
    if (main && mirror) {
        const sync = () => mirror.setAttribute("aria-pressed", main.getAttribute("aria-pressed") ?? "false");
        new MutationObserver(sync).observe(main, { attributes: true, attributeFilter: ["aria-pressed"] });
        sync();
        mirror.addEventListener("click", () => main.click());
    }
}
