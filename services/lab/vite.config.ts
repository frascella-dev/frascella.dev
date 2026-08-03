import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone three.js lab. Separate from the portfolio (services/site-v2) so it
// can stay a plain React + Vite playground. Different port to run alongside it.
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 5174,
        hmr: { host: "localhost" },
    },
});
