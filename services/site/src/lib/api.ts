import axios from "axios";

// The portfolio is a static site that talks to the PHP API. The base URL is
// injected at build time; it defaults to the local API port so `npm run dev`
// works with no extra configuration, and the deploy build sets it to "" so
// requests go same-origin to /api. Under Astro the var is `PUBLIC_API_URL`;
// the old `VITE_API_URL` is still honored as a fallback.
const env = import.meta.env as Record<string, string | undefined>;
const baseURL = env["PUBLIC_API_URL"] ?? env["VITE_API_URL"] ?? "http://localhost:3000";

/** The same base, for the two callers that can't go through axios: the
    analytics beacon (`fetch(keepalive)` / `sendBeacon`) and the dashboard. */
export const apiBase = baseURL;

export const api = axios.create({
    baseURL,
    // The admin dashboard is a session cookie, and the tracker needs the
    // visitor cookies to come back; in the deployed layout this is all
    // same-origin anyway, and in dev the API grants credentials only to the
    // origins named in CORS_ORIGINS.
    withCredentials: true,
    headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

// The API mirrors Laravel's 422 body — `{ errors: { field: [msg] } }` — so
// this flattener stays identical to the old admin helper.
export function fieldErrors(err: unknown): Record<string, string> {
    if (!axios.isAxiosError(err)) return {};
    const raw = err.response?.data?.errors as
        | Record<string, unknown>
        | undefined;
    if (!raw) return {};
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
        flat[k] = Array.isArray(v) ? String(v[0] ?? "") : String(v);
    }
    return flat;
}

export default api;
