/**
 * The theme's client layer.
 *
 * One entry per kind of page (inc/assets.php picks one per request), each importing its
 * own stylesheet. The base is the built directory under this theme's own folder name, so
 * renaming the theme (bin/init) needs no change here. There is no unhashed fallback: the
 * PHP side reads the manifest or shows an error.
 *
 * tokens.json becomes assets/src/css/tokens.generated.css before every build: the palette
 * and the type as custom properties, from the same file the plugin writes into Elementor's
 * Kit and the email look is read from.
 */
import { defineConfig } from "vite";
import { basename, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const here = (p) => resolve(import.meta.dirname, p);
const theme = basename(import.meta.dirname);

/** `accentText` → `accent-text`. */
const kebab = (name) => name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

function tokens() {
    const write = () => {
        const t = JSON.parse(readFileSync(here("tokens.json"), "utf8"));
        const lines = [
            ...Object.entries(t.colors ?? {}).map(([name, c]) => `    --${kebab(name)}: ${c.value};`),
            ...Object.entries(t.fonts ?? {}).map(([name, f]) => `    --font-${kebab(name)}: ${f.stack};`),
            `    --radius: ${t.radius ?? "0px"};`,
        ];
        const css = `/* Generated from tokens.json by vite.config.mjs. Do not edit: change tokens.json. */\n:root {\n${lines.join("\n")}\n}\n`;
        writeFileSync(here("assets/src/css/tokens.generated.css"), css);
    };
    return {
        name: "frascella-tokens",
        buildStart() {
            write();
            this.addWatchFile(here("tokens.json"));
        },
    };
}

export default defineConfig({
    base: `/wp-content/themes/${theme}/assets/dist/`,
    plugins: [tokens()],
    build: {
        outDir: here("assets/dist"),
        emptyOutDir: true,
        manifest: true,
        assetsDir: "",
        rollupOptions: {
            input: {
                site: here("assets/src/entries/site.ts"),
                doc: here("assets/src/entries/doc.ts"),
            },
        },
    },
});
