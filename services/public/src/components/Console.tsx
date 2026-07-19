import { useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import Window from "./Window.tsx";
import { useTerminal } from "../lib/terminal/useTerminal.ts";
import { attachGuestShell } from "../lib/terminal/guestShell.ts";

// The interactive terminal that lives inside the console window. Split out so
// it mounts (and the xterm instance is created) only while the window is open.
function ConsoleTerminal({
    onClose,
    gotoSection,
}: {
    onClose: () => void;
    gotoSection: (id: string) => void;
}) {
    const termRef = useRef<Terminal | null>(null);
    const { containerRef } = useTerminal({
        options: { fontSize: 13, cursorBlink: true },
        onReady: (term) => {
            termRef.current = term;
            term.focus();
            return attachGuestShell(term, { close: onClose, gotoSection });
        },
    });
    return (
        <div
            ref={containerRef}
            className="ef-console-term"
            onMouseDown={() => termRef.current?.focus()}
        />
    );
}

export default function Console() {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);

    const closeConsole = () => {
        setOpen(false);
        setMinimized(false);
    };

    // Scroll the page to a section, then tuck the console away so it's visible.
    const gotoSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const lenis = (window as any).__lenis;
            if (lenis) lenis.scrollTo(el, { offset: -20, duration: 1.2 });
            else el.scrollIntoView({ behavior: "smooth" });
        }
        setMinimized(true);
    };

    return (
        <>
            {(!open || minimized) && (
                <button
                    type="button"
                    className="ef-console-tab"
                    data-cursor="link"
                    onClick={() => {
                        setOpen(true);
                        setMinimized(false);
                    }}
                >
                    <span className="ef-console-tab-dot" aria-hidden />
                    <span className="ef-console-tab-label">open console</span>
                </button>
            )}

            {open && (
                <Window
                    title="guest@frascella.dev — console"
                    className="ef-console-window"
                    minimized={minimized}
                    onMinimize={() => setMinimized(true)}
                    onClose={closeConsole}
                    initial={{ width: 780, height: 460 }}
                >
                    <ConsoleTerminal
                        onClose={closeConsole}
                        gotoSection={gotoSection}
                    />
                </Window>
            )}
        </>
    );
}
