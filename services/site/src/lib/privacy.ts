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

const STATE_COPY: Record<string, string> = {
    granted: "Analytics is on. Your visits are counted, under the identifiers described above.",
    denied: "Analytics is off. Nothing is being collected, and the identifiers have been removed.",
    unset: "You have not been asked yet — nothing is being collected until you choose.",
};

export function initPrivacyControls(root: ParentNode = document): void {
    const state = root.querySelector<HTMLElement>("[data-consent-state]");
    const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-consent-choose]")];
    if (!state || buttons.length === 0) return;

    const paint = () => {
        const current = readConsent();
        state.textContent = STATE_COPY[current ?? "unset"];
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
