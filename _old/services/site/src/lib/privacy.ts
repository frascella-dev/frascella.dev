/**
 * The two buttons at the bottom of /privacy.
 *
 * Withdrawing has to be as easy as consenting — that is the requirement, and
 * it is also the only honest way to ask in the first place. So both choices
 * are one click from the same place, the current state is stated plainly,
 * and turning analytics off deletes the identifiers immediately rather than
 * at some later page load.
 */

import { denyConsent, grantConsent, readConsent, startAnalytics } from "./consent.ts";
import { readJson } from "./copy.ts";

/**
 * The three sentences describing the current state. They are written onto the
 * block by the page, in the page's language — see lib/copy.ts. The fallbacks
 * are English and only cover a missing attribute; nothing renders them.
 */
const FALLBACK: Record<string, string> = {
    granted: "Analytics is enabled. Visits are counted under the identifiers described above.",
    denied: "Analytics is disabled. Nothing is being collected, and the identifiers have been removed.",
    unset: "No answer has been given yet. Nothing is collected until a choice is made.",
};

export function initPrivacyControls(root: ParentNode = document): void {
    const state = root.querySelector<HTMLElement>("[data-consent-state]");
    const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-consent-choose]")];
    if (!state || buttons.length === 0) return;

    const copy = { ...FALLBACK, ...readJson<Record<string, string>>(state, "data-copy", {}) };

    const paint = () => {
        const current = readConsent();
        state.textContent = copy[current ?? "unset"];
        for (const button of buttons) {
            button.setAttribute(
                "aria-pressed",
                String(button.dataset.consentChoose === current),
            );
        }
    };

    for (const button of buttons) {
        button.addEventListener("click", () => {
            if (button.dataset.consentChoose === "granted") {
                grantConsent();
                void startAnalytics();
            } else {
                denyConsent();
            }
            paint();
        });
    }

    paint();
}
