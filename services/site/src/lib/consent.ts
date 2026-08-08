/**
 * The consent gate.
 *
 * One cookie records the visitor's own answer, and it is the only cookie
 * this site writes before an answer exists — recording a refusal is what
 * makes the refusal stick, so it needs no consent of its own.
 *
 * Everything downstream reads `readConsent()`: analytics loads on "granted"
 * and on nothing else. The answer can be changed at any time — from the
 * footer, which reopens this bar, or from `/privacy` — and withdrawing
 * disconnects the tracker and deletes the identifiers on the spot, without
 * waiting for the next page load.
 */

import { disconnect } from "./track.ts";

export const CONSENT_COOKIE = "pf_consent";

export type Consent = "granted" | "denied" | null;

/**
 * The scope the visitor agreed to — **not** the version of the prose.
 *
 * Consent is given to purposes and data, not to a document, so rewriting
 * /privacy does not invalidate it and must not bump this. What bumps it is a
 * change to what is being asked for: a new cookie that needs consent, a third
 * party appearing anywhere on the page, a new purpose, a new kind of thing in
 * `Analytics::VOCABULARY`, or a materially longer retention. Anything else —
 * clarifications, corrections, a shorter banner — is a transparency duty and
 * belongs in the revision list at the foot of /privacy instead.
 *
 * Bumping it makes every stored answer read as "not asked yet", which is the
 * whole point: it re-opens the question rather than assuming the old yes
 * covers the new thing. So bump it deliberately, and never to be safe.
 */
export const CONSENT_VERSION = 1;

/**
 * Six months, both ways. It is the ceiling the Garante puts on re-asking
 * someone who said no, and there is no good reason for a yes to outlive it
 * either — consent that nobody has confirmed in half a year is a guess.
 */
const CONSENT_DAYS = 180;

/** Set by the API; deleted here when consent is withdrawn. */
const IDENTITY_COOKIES = ["pf_vid", "pf_sid"];

function readCookie(name: string): string | null {
    const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        "path=/",
        `max-age=${Math.round(days * 86400)}`,
        "samesite=lax",
    ];
    // Localhost counts as a secure context but is not https; adding Secure
    // there would make the cookie unsettable in some browsers.
    if (location.protocol === "https:") parts.push("secure");
    document.cookie = parts.join("; ");
}

function deleteCookie(name: string): void {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/**
 * The stored answer, but only if it answers the question being asked now.
 *
 * The cookie is `answer.scope` — `granted.1`. A dot rather than a colon
 * because `encodeURIComponent` leaves it alone, so the value stays legible in
 * devtools and identical on both sides of the wire.
 *
 * A cookie from an older scope, or one written before scopes existed, is not
 * an answer: it returns `null`, the banner comes back, and nothing is
 * measured until it is answered again. A *newer* scope counts as valid —
 * that is a tab loaded before a deploy, and treating it as unanswered would
 * overwrite a fresher answer with a staler one.
 */
export function readConsent(): Consent {
    const raw = readCookie(CONSENT_COOKIE);
    if (!raw) return null;

    const [answer, scope] = raw.split(".", 2);
    if (!(Number(scope) >= CONSENT_VERSION)) return null;

    return answer === "granted" || answer === "denied" ? answer : null;
}

export function grantConsent(): void {
    writeCookie(CONSENT_COOKIE, `granted.${CONSENT_VERSION}`, CONSENT_DAYS);
}

export function denyConsent(): void {
    writeCookie(CONSENT_COOKIE, `denied.${CONSENT_VERSION}`, CONSENT_DAYS);
    revokeIdentity();
}

/**
 * Stops the tracker and removes the identifiers. The rows already written
 * stay — they are anonymous by then, and there is nothing in them that
 * points back at a person — but nothing further is attributed to this
 * browser, and the next visit starts as a stranger.
 */
export function revokeIdentity(): void {
    disconnect();
    for (const name of IDENTITY_COOKIES) deleteCookie(name);
}

/** Loads and starts the tracker. Never called without a granted consent. */
export async function startAnalytics(): Promise<void> {
    const { initAnalytics } = await import("./analytics.ts");
    initAnalytics();
}

/**
 * The whole consent flow for the public page: start the tracker if the
 * answer is already yes, otherwise put the question up once the splash is
 * out of the way and act on it.
 */
export function initConsent(root: ParentNode = document): void {
    const decided = readConsent();
    if (decided === "granted") void startAnalytics();

    const bar = root.querySelector<HTMLElement>("[data-consent]");
    if (!bar) return;

    let open = false;

    const show = (takeFocus: boolean) => {
        open = true;
        bar.hidden = false;
        // One frame, so the transition has a "from" to start at.
        requestAnimationFrame(() => {
            bar.classList.add("is-in");
            if (takeFocus) bar.querySelector("button")?.focus();
        });
    };

    const hide = () => {
        open = false;
        bar.classList.remove("is-in");
        // Long enough for the transition above; with reduced motion there
        // is none, and hiding a beat later costs nothing. The guard is for
        // the visitor who reopens it inside that window.
        setTimeout(() => {
            if (!open) bar.hidden = true;
        }, 400);
    };

    const answer = (granted: boolean) => {
        if (granted) {
            grantConsent();
            void startAnalytics();
        } else {
            denyConsent();
        }
        hide();
    };

    bar.querySelector("[data-consent-accept]")?.addEventListener("click", () => answer(true));
    bar.querySelector("[data-consent-deny]")?.addEventListener("click", () => answer(false));

    // The way back in, from the footer. Withdrawing has to be as easy as
    // consenting, and the least arguable reading of that is the same bar and
    // the same two buttons, one click, without leaving the page. Where there
    // is no bar to reopen — /privacy, /admin — the control stays the link it
    // is in the markup and lands on the controls instead.
    for (const opener of root.querySelectorAll<HTMLElement>("[data-consent-reopen]")) {
        opener.addEventListener("click", (event) => {
            event.preventDefault();
            show(true);
        });
    }

    if (decided !== null) return;
    whenSplashIsGone(() => show(false));
}

/**
 * The splash covers the page and locks scrolling; asking for a decision
 * underneath it would be asking nobody. `splash-open` is stamped on <html>
 * before first paint and dropped by lib/splash.ts when the panel lifts — if
 * it was never set (reduced motion, no JS timeline), there is nothing to
 * wait for.
 */
function whenSplashIsGone(then: () => void): void {
    const root = document.documentElement;
    if (!root.classList.contains("splash-open")) {
        then();
        return;
    }

    const observer = new MutationObserver(() => {
        if (root.classList.contains("splash-open")) return;
        observer.disconnect();
        then();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
}
