import axios from "axios";

// Same-origin admin SPA: piggyback on Laravel's session cookie + reflect
// the XSRF-TOKEN cookie back as the X-XSRF-TOKEN header (axios does this
// automatically once `withCredentials` and the *-Name options are set).
export const api = axios.create({
    withCredentials: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

// Flatten Laravel's 422 `{ errors: { field: [msg] } }` into
// `{ field: "first msg" }` — the shape the form components consume.
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
