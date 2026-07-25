import { StrictMode } from "react";
import App from "./App.tsx";

/**
 * The client entry, mounted by Astro as a `client:only` island. The site
 * is a client-rendered SPA (three.js, Lenis, hash routing), so Astro just
 * provides the shell and hands off to React here.
 */
export default function Site() {
    return (
        <StrictMode>
            <App />
        </StrictMode>
    );
}
