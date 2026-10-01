/**
 * The phone's menu: "menu" opens a drawer over the page, "chiudi" (or Esc, or a link)
 * closes it.
 *
 * A disclosure, not a modal dialog: the header stays where it is, with the same button now
 * saying "chiudi", and the page under the drawer is made `inert` so Tab stays in the header
 * and the drawer. Focus goes to the drawer's first link on opening and back to the button
 * on closing. Without JavaScript the button is hidden (`hidden` until this runs) and the
 * footer's index is the menu.
 */

export function initHeader(): void {
    const button = document.querySelector<HTMLButtonElement>(".menu-btn");
    const drawer = button ? document.getElementById(button.getAttribute("aria-controls") ?? "") : null;
    if (!button || !drawer) return;
    button.hidden = false;
    const html = document.documentElement;
    const behind = () => [...document.querySelectorAll<HTMLElement>("main, footer, .cue, .hotspots")];

    const set = (open: boolean, focus = true) => {
        button.setAttribute("aria-expanded", String(open));
        drawer.hidden = !open;
        html.classList.toggle("drawer-open", open);
        for (const el of behind()) el.inert = open;
        if (focus) (open ? drawer.querySelector<HTMLElement>("a, button") : button)?.focus();
    };

    button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
    // A link in the drawer goes somewhere on this page or another: the drawer closes first,
    // so the page it scrolls is not inert.
    drawer.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest("a")) set(false, false);
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && button.getAttribute("aria-expanded") === "true") set(false);
    });
    // Back to a desktop width with the drawer open: there is no drawer there.
    matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
        if (e.matches && button.getAttribute("aria-expanded") === "true") set(false, false);
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
