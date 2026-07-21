import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

const root = createRoot(document.getElementById("root")!);

// Dev-only experimentation lab. The whole branch — LabApp, every experiment and
// all of three.js — is gated behind `import.meta.env.DEV`, so a production build
// dead-code-eliminates it and it never ships. In prod, /lab falls back to the
// portfolio.
async function boot() {
    if (import.meta.env.DEV && location.pathname.startsWith("/lab")) {
        const { default: LabApp } = await import("./lab/LabApp.tsx");
        root.render(
            <StrictMode>
                <LabApp />
            </StrictMode>,
        );
        return;
    }
    root.render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}

boot();
