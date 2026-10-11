/**
 * frascella.dev: a static site, published on GitHub Pages.
 *
 * `BASE_PATH` is where Pages serves it: `/` on the custom domain, `/frascella.dev/` on
 * github.io before the domain points there. The workflow takes it from the Pages
 * configuration (.github/workflows/pages.yml), so no address is written twice.
 *
 * tokens.json becomes src/styles/tokens.generated.css before every build: the palette and
 * the type as custom properties, the one place a colour is named.
 */
import { defineConfig } from "astro/config";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

/** `accentText` → `accent-text`. */
const kebab = (name) => name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

function tokens() {
    const write = () => {
        const t = JSON.parse(readFileSync(here("./tokens.json"), "utf8"));
        const lines = [
            ...Object.entries(t.colors ?? {}).map(([name, c]) => `    --${kebab(name)}: ${c.value};`),
            ...Object.entries(t.fonts ?? {}).map(([name, f]) => `    --font-${kebab(name)}: ${f.stack};`),
            `    --radius: ${t.radius ?? "0px"};`,
        ];
        const css = `/* Generated from tokens.json by astro.config.mjs. Do not edit: change tokens.json. */\n:root {\n${lines.join("\n")}\n}\n`;
        writeFileSync(here("./src/styles/tokens.generated.css"), css);
    };
    write();
    return {
        name: "frascella-tokens",
        buildStart() {
            write();
            this.addWatchFile(here("./tokens.json"));
        },
    };
}

export default defineConfig({
    site: "https://www.frascella.dev",
    base: process.env.BASE_PATH || "/",
    trailingSlash: "always",
    build: { format: "directory", assets: "assets" },
    vite: {
        plugins: [tokens()],
        build: {
            rollupOptions: {
                output: {
                    // the desk's three.js on its own chunk: it changes far less often than the
                    // scene, so it stays cached across releases (src/desk/CONTRACT.md)
                    manualChunks: (id) => (id.includes("/node_modules/three/") ? "three" : undefined),
                },
            },
        },
        // the desk's texture workers are module workers (`new Worker(url, { type: "module" })`)
        worker: { format: "es" },
    },
});
