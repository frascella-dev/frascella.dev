// @ts-check
import { defineConfig } from "astro/config";

// v2 drops the React island entirely. Every moving part of the page —
// the fluid canvas, the splash, the scroll orchestration, the three.js
// corridor — is a plain ES module loaded from an Astro `<script>`, which
// is what the prototype was. Astro owns the shell, the head and the build.

// The site's own monogram, so the panel is recognisable at a glance among
// Astro's built-in apps. (Any of Astro's icon names — `gear`, `lightbulb`,
// `bug`, `dots-circle` … — works here instead, if a generic one is wanted.)
const MARK_ICON = `<svg viewBox="0 0 128 128" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M80.928 22.8718C96.9442 28.9201 107.794 43.4431 109.665 59.8326L98.1755 56.751C96.5179 50.0425 92.8522 43.9552 87.6777 39.3544L81.2455 63.3829L109.595 70.9865L106.805 81.4107L78.455 73.8071L68.1458 112.319L57.7316 109.526L80.928 22.8718Z"/>
    <path d="M96.7848 120L86.3706 117.207L89.161 106.783L99.5752 109.576L96.7848 120Z"/>
    <path d="M63.2076 47.3724L52.7934 44.5792L57.3279 27.6399L40.8388 23.2174L33.5138 50.5809L60.4171 57.7966L57.6266 68.2208L31.0879 61.1029C29.4431 75.5617 37.2165 89.5095 50.2575 95.7492L47.4304 106.31C27.1331 97.6967 15.7579 75.2138 21.6269 53.2894L33.2151 10L70.5326 20.0088L63.2076 47.3724Z"/>
</svg>`;

/**
 * Adds the settings panel to Astro's dev toolbar — see
 * `src/devtools/settings.ts` for what it holds and how the page reads it.
 * Registered only under `astro dev`, so a build never resolves the entrypoint.
 *
 * @returns {import("astro").AstroIntegration}
 */
function devSettings() {
    return {
        name: "portfolio-dev-settings",
        hooks: {
            "astro:config:setup": ({ command, addDevToolbarApp }) => {
                if (command !== "dev") return;
                addDevToolbarApp({
                    id: "portfolio-settings",
                    name: "Portfolio",
                    icon: MARK_ICON,
                    entrypoint: "./src/devtools/settings.ts",
                });
            },
        },
    };
}

export default defineConfig({
    integrations: [devSettings()],
    server: {
        host: "0.0.0.0",
        port: 5173,
    },
    vite: {
        // keep the old VITE_ env contract working alongside Astro's PUBLIC_
        envPrefix: ["PUBLIC_", "VITE_"],
    },
});
