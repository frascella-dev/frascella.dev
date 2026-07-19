import { useEffect, useRef } from "react";
import { Terminal, type ITerminalOptions } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { TERMINAL_THEME, TERMINAL_FONT } from "./theme";

type ReadyHandler = (term: Terminal, fit: FitAddon) => void | (() => void);

export type UseTerminalOptions = {
    /** Called once the terminal is mounted and fitted to its container. */
    onReady?: ReadyHandler;
    /** Extra xterm options merged over the shared defaults. */
    options?: ITerminalOptions;
};

/**
 * Mounts an xterm.js terminal into a container and keeps it fitted to size.
 * The single source of terminal setup for the site — the splash animation
 * uses it today; a future interactive shell can reuse the same foundation.
 */
export function useTerminal({ onReady, options }: UseTerminalOptions) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const term = new Terminal({
            convertEol: true,
            cursorBlink: true,
            cursorStyle: "block",
            fontFamily: TERMINAL_FONT,
            fontSize: 14,
            lineHeight: 1.0,
            letterSpacing: 0,
            theme: TERMINAL_THEME,
            allowProposedApi: true,
            scrollback: 2000,
            ...options,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(el);
        try {
            fit.fit();
        } catch {
            /* container not laid out yet — the resize observer will catch up */
        }

        const ro = new ResizeObserver(() => {
            try {
                fit.fit();
            } catch {
                /* ignore transient zero-size */
            }
        });
        ro.observe(el);

        const cleanupFromReady = onReady?.(term, fit);

        return () => {
            if (typeof cleanupFromReady === "function") cleanupFromReady();
            ro.disconnect();
            term.dispose();
        };
        // Mount once; consumers pass stable callbacks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { containerRef };
}
