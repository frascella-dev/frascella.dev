import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone SPA — no Laravel plugin. In the devcontainer the server binds
// 0.0.0.0 so the host can reach it; HMR is pinned to localhost.
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 5173,
        hmr: {
            host: "localhost",
        },
    },
});
