import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * The payoff card for the console unlock — shown once, at the moment it's
 * earned. Its trigger is the asteroids field in § 03.1 (Interests.tsx):
 * 10 000 points calls `unlockConsole()` from lib/consoleUnlock and renders
 * this alongside it, on the crossing itself and never off the persisted flag
 * — the flag outlives the moment, the acknowledgement shouldn't. A visitor
 * who already has the console plays on and is not congratulated twice.
 *
 * Portalled to <body> like the Toast, so a trigger living inside a
 * `position: sticky` / `overflow: hidden` stage (the About vortex, say) can't
 * clip or mis-anchor it.
 */
export default function ConsoleUnlockDialog({ onClose }: { onClose: () => void }) {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const closeRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        // The catch was a click on a WebGL canvas, so focus is still on the
        // page body — move it into the dialog and keep Tab inside the card, so
        // a keyboard visitor can't wander off into the page behind it.
        const previous = document.activeElement as HTMLElement | null;
        closeRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key !== "Tab") return;
            const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
                "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
            );
            if (!focusables || focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKey);

        // The page keeps scrolling under a dialog otherwise — Lenis has its own
        // rAF loop and doesn't care about overlays. Same treatment the console
        // gives itself while a window is open.
        const lenis = (window as any).__lenis;
        lenis?.stop();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            lenis?.start();
            document.body.style.overflow = prevOverflow;
            previous?.focus?.();
        };
    }, [onClose]);

    return createPortal(
        <div className="ef-unlock" role="presentation" onClick={onClose}>
            <div
                className="ef-unlock-card"
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ef-unlock-title"
                aria-describedby="ef-unlock-body"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ef-unlock-head">
                    <span className="ef-label">§ 03.1 — score</span>
                    <span className="ef-mono ef-unlock-status">
                        <span className="ef-unlock-dot" aria-hidden />
                        10,000
                    </span>
                </div>

                <h2 className="ef-unlock-title" id="ef-unlock-title">
                    <span>ten thousand.</span>
                    <em>the console is yours.</em>
                </h2>

                <p className="ef-unlock-body" id="ef-unlock-body">
                    That was the whole point of the counter. There's a terminal
                    behind this site — a real shell, with a couple of games in
                    it — and it stays shut until someone bothers to play for
                    it. You did, so it's open now, and it stays open.
                </p>

                <div className="ef-unlock-meta">
                    <div>
                        <span className="ef-label">earned</span>
                        <span className="ef-mono">score ≥ 10,000</span>
                    </div>
                    <div>
                        <span className="ef-label">where</span>
                        <span className="ef-mono">
                            console tab — right edge
                        </span>
                    </div>
                    <div>
                        <span className="ef-label">then</span>
                        <span className="ef-mono">type help</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="ef-unlock-close"
                    ref={closeRef}
                    onClick={onClose}
                    data-cursor="link"
                >
                    <span className="ef-label">esc</span>
                    <span className="ef-unlock-close-label">got it</span>
                    <span className="ef-unlock-close-arrow" aria-hidden>
                        →
                    </span>
                </button>
            </div>
        </div>,
        document.body,
    );
}
