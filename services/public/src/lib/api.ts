import axios from "axios";

// The portfolio is a standalone SPA that talks to the NestJS API over CORS.
// The base URL is injected at build time; it defaults to the local API port
// so `npm run dev` works with no extra configuration.
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
    baseURL,
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
