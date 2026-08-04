// @ts-check
import { defineConfig } from "astro/config";

// v2 drops the React island entirely. Every moving part of the page —
// the fluid canvas, the splash, the scroll orchestration, the three.js
// corridor — is a plain ES module loaded from an Astro `<script>`, which
// is what the prototype was. Astro owns the shell, the head and the build.
export default defineConfig({
    server: {
        host: "0.0.0.0",
        port: 5173,
    },
    vite: {
        // keep the old VITE_ env contract working alongside Astro's PUBLIC_
        envPrefix: ["PUBLIC_", "VITE_"],
    },
});
