/**
 * The dashboard's behaviour: sign in, ask for one window of stats, draw it.
 *
 * Everything is drawn from a single `GET /api/admin/stats` response, so no
 * two panels can be describing different windows. The charts are hand-built
 * SVG measured against the real container width — a charting library would
 * be several times the weight of the entire site, which ships no framework
 * at all.
 *
 * There is no client-side auth: the page is a static file anyone can fetch,
 * and it is empty. The session cookie is httpOnly and lives on the API, so
 * "signed in" here only ever means "the last request was not a 401".
 */

import axios from "axios";
import { api } from "./api.ts";

type Totals = {
    sessions: number;
    visitors: number;
    newVisitors: number;
    pageviews: number;
    events: number;
    contacts: number;
    avgDurationSec: number;
    avgScroll: number;
    bounceRate: number;
    contactRate: number;
};

type Point = { day: string; sessions: number; visitors: number; pageviews: number; contacts: number };
type Row = { label: string; sessions: number; contacts: number };

type Stats = {
    range: { from: string; to: string; days: number };
    totals: Totals;
    previous: Totals;
    series: Point[];
    hours: { hour: number; sessions: number }[];
    referrers: Row[];
    devices: Row[];
    browsers: Row[];
    systems: Row[];
    countries: Row[];
    languages: Row[];
    scroll: { depth: number; sessions: number }[];
    sections: { label: string; sessions: number; avgSeconds: number }[];
    interactions: { name: string; label: string; count: number; sessions: number }[];
    funnel: { step: string; label: string; sessions: number; share: number }[];
    recent: {
        id: string; startedAt: number; device: string; browser: string; os: string;
        country: string; referrer: string; durationSec: number; maxScroll: number;
        events: number; contacted: boolean;
    }[];
};

const RANGE_KEY = "portfolio:admin:range";

/** Metrics where a rise is bad news — the arrow colours have to follow. */
const LOWER_IS_BETTER = new Set(["bounceRate"]);

const num = new Intl.NumberFormat("en-US");
const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

let current: Stats | null = null;
let days = 30;

// --- boot --------------------------------------------------------------------

export async function initAdmin(root: ParentNode = document): Promise<void> {
    const login = root.querySelector<HTMLElement>("[data-admin-login]");
    const dash = root.querySelector<HTMLElement>("[data-admin-dash]");
    if (!login || !dash) return;

    days = Number(localStorage.getItem(RANGE_KEY)) || 30;

    wireLogin(login, dash);
    wireControls(dash, login);

    // Redrawing on resize is what lets the charts be measured in real pixels
    // rather than stretched out of a viewBox.
    let resizeTimer: number | null = null;
    addEventListener("resize", () => {
        if (resizeTimer !== null) clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => current && paintCharts(dash, current), 150);
    });

    let state: { authenticated: boolean; mfaPending: boolean } = {
        authenticated: false,
        mfaPending: false,
    };
    try {
        const { data } = await api.get("/api/admin/me");
        state = { authenticated: Boolean(data?.authenticated), mfaPending: Boolean(data?.mfaPending) };
    } catch {
        // Treated as signed out.
    }

    if (state.authenticated) {
        await show(dash, login);
        return;
    }

    login.hidden = false;
    // A reload between the two steps comes back to the second one rather
    // than making you type the password again — the pending session is still
    // there, and it is still short-lived.
    setStep(login, state.mfaPending ? "code" : "password");
}

type Step = "password" | "code";

/** Swaps the form between its two steps and points everything at the new one. */
function setStep(login: HTMLElement, step: Step): void {
    for (const panel of login.querySelectorAll<HTMLElement>("[data-step]")) {
        panel.hidden = panel.dataset.step !== step;
    }

    const submit = login.querySelector<HTMLButtonElement>("[data-admin-submit]");
    if (submit) submit.textContent = step === "password" ? "continue" : "sign in";

    const restart = login.querySelector<HTMLButtonElement>("[data-admin-restart]");
    if (restart) restart.hidden = step === "password";

    login.dataset.step = step;
    login
        .querySelector<HTMLInputElement>(
            step === "password" ? "[data-admin-email]" : "[data-admin-code]",
        )
        ?.focus();
}

function wireLogin(login: HTMLElement, dash: HTMLElement): void {
    const form = login.querySelector<HTMLFormElement>("[data-admin-login-form]");
    const error = login.querySelector<HTMLElement>("[data-admin-login-error]");
    const submit = login.querySelector<HTMLButtonElement>("[data-admin-submit]");
    const email = login.querySelector<HTMLInputElement>("[data-admin-email]");
    const password = login.querySelector<HTMLInputElement>("[data-admin-password]");
    const code = login.querySelector<HTMLInputElement>("[data-admin-code]");
    if (!form || !error || !submit || !email || !password || !code) return;

    const say = (message: string) => {
        error.textContent = message;
    };

    const complain = (err: unknown, fallback: string) => {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        // 503 covers more than one server-side gap — no schema, no account —
        // so let the API say which it is rather than guessing here.
        const said = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
        say(
            status === 429
                ? "too many attempts — wait a quarter of an hour."
                : status === 503
                  ? String(said ?? "the dashboard is not set up on this server.").toLowerCase()
                  : status === 401
                    ? fallback
                    : "could not reach the API.",
        );
    };

    login.querySelector("[data-admin-restart]")?.addEventListener("click", async () => {
        try {
            await api.post("/api/admin/logout");
        } catch {
            // The pending session expires in five minutes regardless.
        }
        password.value = "";
        code.value = "";
        say("");
        setStep(login, "password");
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (submit.disabled) return;

        submit.disabled = true;
        say("");

        try {
            if (login.dataset.step !== "code") {
                await api.post("/api/admin/login", {
                    email: email.value,
                    password: password.value,
                });
                // The password is spent — the session it opened is pending,
                // and there is no reason to keep it in a DOM node.
                password.value = "";
                setStep(login, "code");
                return;
            }

            const { data } = await api.post("/api/admin/mfa", { code: code.value });
            code.value = "";
            login.hidden = true;
            await show(dash, login);

            if (data?.usedRecovery) {
                const left = Number(data.recoveryLeft ?? 0);
                const problem = dash.querySelector<HTMLElement>("[data-admin-error]");
                if (problem) {
                    problem.hidden = false;
                    problem.textContent =
                        `signed in with a recovery code — ${left} left. ` +
                        "run bin/admin-user.php reset-mfa to enrol again.";
                }
            }
        } catch (err) {
            complain(
                err,
                login.dataset.step === "code"
                    ? "that code is not right, or it has expired."
                    : "wrong email or password.",
            );
        } finally {
            submit.disabled = false;
        }
    });
}

function wireControls(dash: HTMLElement, login: HTMLElement): void {
    for (const button of dash.querySelectorAll<HTMLButtonElement>("[data-range]")) {
        button.addEventListener("click", () => {
            days = Number(button.dataset.range);
            localStorage.setItem(RANGE_KEY, String(days));
            void show(dash, login);
        });
    }

    dash.querySelector("[data-admin-refresh]")?.addEventListener("click", () => {
        void show(dash, login);
    });

    dash.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
        try {
            await api.post("/api/admin/logout");
        } catch {
            // Signing out locally is the part that matters.
        }
        current = null;
        dash.hidden = true;
        login.hidden = false;
    });
}

/** Fetches the window and paints it. A 401 sends the page back to sign-in. */
async function show(dash: HTMLElement, login: HTMLElement): Promise<void> {
    const to = isoDay(new Date());
    const from = isoDay(new Date(Date.now() - (days - 1) * 86400000));
    const problem = dash.querySelector<HTMLElement>("[data-admin-error]")!;

    for (const button of dash.querySelectorAll<HTMLButtonElement>("[data-range]")) {
        button.setAttribute("aria-pressed", String(Number(button.dataset.range) === days));
    }

    try {
        const { data } = await api.get<Stats>("/api/admin/stats", { params: { from, to } });
        current = data;
        problem.hidden = true;
        dash.hidden = false;
        login.hidden = true;
        paint(dash, data);
    } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401) {
            current = null;
            dash.hidden = true;
            login.hidden = false;
            return;
        }
        dash.hidden = false;
        problem.hidden = false;
        problem.textContent =
            status === 503
                ? "the database has not been migrated yet — run php bin/migrate.php."
                : "could not load the numbers.";
    }
}

// --- painting ----------------------------------------------------------------

function paint(dash: HTMLElement, stats: Stats): void {
    const label = dash.querySelector<HTMLElement>("[data-admin-range-label]");
    if (label) label.textContent = `${stats.range.from} → ${stats.range.to}`;

    paintTiles(dash, stats);
    paintCharts(dash, stats);
    paintBars(dash, "[data-chart-scroll]", stats.scroll.map((s) => ({
        label: `${s.depth}% of the page`,
        value: s.sessions,
        note: share(s.sessions, stats.totals.sessions),
    })));
    paintBars(dash, "[data-chart-funnel]", stats.funnel.map((s) => ({
        label: s.label,
        value: s.sessions,
        note: `${s.share}%`,
    })));

    paintTable(
        dash.querySelector("[data-table-sections]"),
        ["section", "visits", "avg. time"],
        stats.sections.map((s) => [s.label, num.format(s.sessions), `${s.avgSeconds}s`]),
        stats.sections.map((s) => s.sessions),
    );

    for (const key of ["referrers", "devices", "browsers", "systems", "countries", "languages"] as const) {
        const host = dash.querySelector<HTMLElement>(`[data-table-breakdown="${key}"]`);
        const rows = stats[key];
        paintTable(
            host,
            [host?.dataset.head ?? "label", "visits", "wrote"],
            rows.map((r) => [r.label, num.format(r.sessions), r.contacts > 0 ? num.format(r.contacts) : "—"]),
            rows.map((r) => r.sessions),
        );
    }

    paintTable(
        dash.querySelector("[data-table-interactions]"),
        ["what", "detail", "times", "visits"],
        stats.interactions.map((i) => [
            i.name.replace(/_/g, " "),
            i.label || "—",
            num.format(i.count),
            num.format(i.sessions),
        ]),
        stats.interactions.map((i) => i.count),
    );

    paintTable(
        dash.querySelector("[data-table-recent]"),
        ["when", "device", "browser", "from", "depth", "time", "events", "wrote"],
        stats.recent.map((s) => [
            ago(s.startedAt),
            `${s.device}${s.country ? ` · ${s.country}` : ""}`,
            `${s.browser} / ${s.os}`,
            s.referrer,
            `${s.maxScroll}%`,
            `${s.durationSec}s`,
            num.format(s.events),
            s.contacted ? "yes" : "—",
        ]),
        null,
    );
}

function paintTiles(dash: HTMLElement, stats: Stats): void {
    for (const node of dash.querySelectorAll<HTMLElement>("[data-tile]")) {
        const key = node.dataset.tile as keyof Totals;
        const value = stats.totals[key] ?? 0;
        node.textContent = `${num.format(value)}${node.dataset.unit ?? ""}`;

        const deltaNode = dash.querySelector<HTMLElement>(`[data-tile-delta="${key}"]`);
        if (!deltaNode) continue;

        const before = stats.previous[key] ?? 0;
        if (before === 0) {
            deltaNode.textContent = value === 0 ? "—" : "new";
            deltaNode.removeAttribute("data-dir");
            continue;
        }

        const change = ((value - before) / before) * 100;
        const rounded = Math.round(change);
        deltaNode.textContent = `${rounded > 0 ? "+" : ""}${rounded}%`;
        // "Up" means "the number went up"; whether that is good depends on
        // the number, which is what LOWER_IS_BETTER settles.
        const better = LOWER_IS_BETTER.has(key) ? change < 0 : change > 0;
        deltaNode.dataset.dir = rounded === 0 ? "flat" : better ? "up" : "down";
    }
}

function paintCharts(dash: HTMLElement, stats: Stats): void {
    const series = dash.querySelector<HTMLElement>("[data-chart-series]");
    if (series) drawSeries(series, stats.series);

    const hours = dash.querySelector<HTMLElement>("[data-chart-hours]");
    if (hours) drawHours(hours, stats.hours);
}

/** Two lines and a fill, measured in real pixels so nothing is stretched. */
function drawSeries(host: HTMLElement, points: Point[]): void {
    const width = Math.max(320, host.clientWidth);
    const height = 260;
    const pad = { top: 12, right: 8, bottom: 26, left: 34 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    if (points.length === 0) {
        host.innerHTML = '<p class="adm-empty">Nothing here yet.</p>';
        return;
    }

    const peak = Math.max(1, ...points.map((p) => Math.max(p.sessions, p.visitors)));
    const x = (i: number) =>
        pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => pad.top + innerH - (v / peak) * innerH;

    const path = (pick: (p: Point) => number) =>
        points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(" ");

    const area =
        `${path((p) => p.sessions)} L${x(points.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)}` +
        ` L${x(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

    // Four gridlines, and only as many date labels as will fit legibly.
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const every = Math.max(1, Math.ceil(points.length / Math.floor(innerW / 74)));

    host.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Visits over time">
            ${ticks
                .map((t) => {
                    const yy = (pad.top + innerH - t * innerH).toFixed(1);
                    return `<line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" />
                            <text class="axis" x="0" y="${Number(yy) + 3}">${Math.round(t * peak)}</text>`;
                })
                .join("")}
            <path class="area" d="${area}" />
            <path class="line-visitors" d="${path((p) => p.visitors)}" />
            <path class="line-sessions" d="${path((p) => p.sessions)}" />
            ${points
                .map((p, i) =>
                    i % every === 0 || i === points.length - 1
                        ? `<text class="axis" x="${x(i).toFixed(1)}" y="${height - 8}" text-anchor="middle">${p.day.slice(5)}</text>`
                        : "",
                )
                .join("")}
        </svg>`;
}

function drawHours(host: HTMLElement, hours: { hour: number; sessions: number }[]): void {
    const width = Math.max(320, host.clientWidth);
    const height = 150;
    const pad = { top: 10, right: 4, bottom: 22, left: 4 };
    const innerH = height - pad.top - pad.bottom;
    const peak = Math.max(1, ...hours.map((h) => h.sessions));
    const slot = (width - pad.left - pad.right) / 24;

    host.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Visits by hour">
            ${hours
                .map((h) => {
                    const barH = (h.sessions / peak) * innerH;
                    const x = pad.left + h.hour * slot;
                    return `<rect class="bar" x="${(x + slot * 0.15).toFixed(1)}" y="${(pad.top + innerH - barH).toFixed(1)}"
                                  width="${(slot * 0.7).toFixed(1)}" height="${Math.max(0, barH).toFixed(1)}" />`;
                })
                .join("")}
            ${hours
                .map((h) =>
                    h.hour % 3 === 0
                        ? `<text class="axis" x="${(pad.left + h.hour * slot + slot / 2).toFixed(1)}" y="${height - 6}" text-anchor="middle">${String(h.hour).padStart(2, "0")}</text>`
                        : "",
                )
                .join("")}
        </svg>`;
}

function paintBars(
    dash: HTMLElement,
    selector: string,
    rows: { label: string; value: number; note: string }[],
): void {
    const host = dash.querySelector<HTMLElement>(selector);
    if (!host) return;

    const peak = Math.max(1, ...rows.map((r) => r.value));
    host.innerHTML =
        rows.length === 0
            ? '<p class="adm-empty">Nothing here yet.</p>'
            : rows
                  .map(
                      (r) => `
        <div class="adm-bar-row">
            <span class="adm-bar-label">${escape(r.label)}</span>
            <span class="adm-bar-value">${num.format(r.value)} · ${escape(r.note)}</span>
            <span class="adm-bar-track"><span class="adm-bar-fill" style="width:${((r.value / peak) * 100).toFixed(1)}%"></span></span>
        </div>`,
                  )
                  .join("");
}

/**
 * A table where the first column carries its own proportion as a bar behind
 * the text — one fewer column to read, and the shape of the list is legible
 * before any of the numbers are.
 */
function paintTable(
    host: HTMLElement | null,
    head: string[],
    rows: string[][],
    weights: number[] | null,
): void {
    if (!host) return;

    if (rows.length === 0) {
        host.innerHTML = '<p class="adm-empty">Nothing here yet.</p>';
        return;
    }

    const peak = weights ? Math.max(1, ...weights) : 0;

    host.innerHTML = `
        <table>
            <thead><tr>${head
                .map((h, i) => `<th${i > 0 ? ' class="num"' : ""}>${escape(h)}</th>`)
                .join("")}</tr></thead>
            <tbody>${rows
                .map((row, r) => {
                    const share = weights ? `--share:${((weights[r] / peak) * 100).toFixed(1)}%` : "";
                    return `<tr>${row
                        .map((cell, i) =>
                            i === 0
                                ? `<td class="lead" style="${share}">${escape(cell)}</td>`
                                : `<td class="num">${escape(cell)}</td>`,
                        )
                        .join("")}</tr>`;
                })
                .join("")}</tbody>
        </table>`;
}

// --- odds and ends -----------------------------------------------------------

function share(part: number, whole: number): string {
    return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function isoDay(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function ago(epochSeconds: number): string {
    const seconds = Math.round(epochSeconds - Date.now() / 1000);
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ["second", 60],
        ["minute", 60],
        ["hour", 24],
        ["day", 7],
        ["week", 4.35],
        ["month", 12],
    ];

    let value = seconds;
    for (const [unit, size] of steps) {
        if (Math.abs(value) < size) return rel.format(Math.round(value), unit);
        value /= size;
    }
    return rel.format(Math.round(value), "year");
}

/** Every cell above is server data going into innerHTML. It gets escaped. */
function escape(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
