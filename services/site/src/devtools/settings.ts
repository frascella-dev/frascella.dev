/**
 * The panel behind the gear in Astro's dev toolbar: local overrides that make
 * the page quicker to work on.
 *
 * Nothing here reaches production. Each switch writes a namespaced
 * localStorage flag; the page reads it behind `import.meta.env.DEV`, which
 * Vite folds to `false` at build time and the bundler then eliminates — so a
 * built site contains neither the flags nor the branches that read them.
 *
 * Adding one is a row in `SETTINGS` plus the matching read on the page side.
 */
import { defineToolbarApp } from "astro/toolbar";

/** Namespaced, so nothing collides with storage the site itself owns. */
const PREFIX = "portfolio:dev:";

type Setting = {
    /** Appended to PREFIX. Also named by whatever reads it on the page. */
    key: string;
    title: string;
    hint: string;
};

const SETTINGS: Setting[] = [
    {
        // Read by the inline head script in layouts/Base.astro, which turns it
        // into the `dev-no-splash` class before the first paint.
        key: "skip-splash",
        title: "Skip the splash",
        hint: "Boot straight into the page. The hero still plays its entrance — only the six seconds of monogram go.",
    },
    {
        // Read by lib/fluid.ts at init.
        key: "fluid-log",
        title: "Log the fluid",
        hint: "Print every splat, wipe and rebuild to the console, plus a once-a-second reading of the velocity field — its mean drift, peak speed and NaN count. For chasing the runaway-ink bug.",
    },
];

const isOn = (s: Setting) => localStorage.getItem(PREFIX + s.key) === "1";

export default defineToolbarApp({
    init(canvas, app) {
        const win = document.createElement("astro-dev-toolbar-window");

        win.innerHTML = `
            <style>
                h1 { margin: 0 0 3px; font-size: 15px; font-weight: 600; }
                .lede { margin: 0 0 6px; font-size: 12px; opacity: .6; }
                .row {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 12px 0;
                    border-top: 1px solid rgba(255, 255, 255, .1);
                }
                .row .copy { flex: 1; }
                .row h2 { margin: 0 0 3px; font-size: 13px; font-weight: 600; }
                .row p { margin: 0; font-size: 12px; line-height: 1.5; opacity: .6; }
            </style>
            <h1>Portfolio</h1>
            <p class="lede">Local overrides for working on the page. Dev only — never shipped.</p>
        `;

        for (const setting of SETTINGS) {
            const row = document.createElement("div");
            row.className = "row";

            const copy = document.createElement("div");
            copy.className = "copy";
            const title = document.createElement("h2");
            title.textContent = setting.title;
            const hint = document.createElement("p");
            hint.textContent = setting.hint;
            copy.append(title, hint);

            const toggle = document.createElement("astro-dev-toolbar-toggle") as HTMLElement & {
                input: HTMLInputElement;
            };
            toggle.input.checked = isOn(setting);
            toggle.input.addEventListener("change", (e) => {
                const on = (e.currentTarget as HTMLInputElement).checked;
                if (on) localStorage.setItem(PREFIX + setting.key, "1");
                else localStorage.removeItem(PREFIX + setting.key);
                // Every override here changes how the page *boots*, so the
                // only honest way to apply one is to boot again.
                location.reload();
            });

            row.append(copy, toggle);
            win.appendChild(row);
        }

        canvas.appendChild(win);

        // A dot on the toolbar icon, so a switch left on months ago doesn't
        // quietly explain away a bug that isn't there.
        app.toggleNotification({ state: SETTINGS.some(isOn), level: "warning" });
    },
});
