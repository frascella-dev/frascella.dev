// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// The portfolio is a client-rendered SPA (three.js, Lenis, scroll-driven
// everything). Astro owns the HTML shell, the head, the build and the
// routes; the React app mounts as a `client:only` island. No SSR — the
// components use `window`/WebGL freely, exactly as before.
export default defineConfig({
    integrations: [react()],
    server: {
        host: "0.0.0.0",
        port: 5173,
    },
    vite: {
        // keep the old VITE_ env contract working alongside Astro's PUBLIC_
        envPrefix: ["PUBLIC_", "VITE_"],
    },
});
