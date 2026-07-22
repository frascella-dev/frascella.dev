import { useEffect, useRef } from "react";
import { Terminal, type ITerminalOptions } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { TERMINAL_THEME, TERMINAL_FONT, TERMINAL_FONT_PRIMARY } from "./theme";

// Ensure the web font is loaded before xterm measures its cell grid. A cold
// page load otherwise measures a fallback font (taller cells → stretched
// output) that only corrects on the next reflow — the "works, then breaks on
// refresh" bug. Races a timeout so boot never blocks on a slow/absent font.
async function waitForTerminalFont(): Promise<void> {
    if (typeof document === "undefined" || !document.fonts) return;
    try {
        await Promise.race([
            Promise.all([
                document.fonts.load(`400 14px ${TERMINAL_FONT_PRIMARY}`),
                document.fonts.load(`700 14px ${TERMINAL_FONT_PRIMARY}`),
            ]).then(() => document.fonts.ready),
            new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
    } catch {
        /* fall back to whatever font is available */
    }
}

type ReadyHandler = (term: Terminal, fit: FitAddon) => void | (() => void);

export type UseTerminalOptions = {
    /** Called once the terminal is mounted and fitted to its container. */
    onReady?: ReadyHandler;
    /** Extra xterm options merged over the shared defaults. */
    options?: ITerminalOptions;
};

/**
 * Mounts an xterm.js terminal into a container and keeps it fitted to size.
 * The single source of terminal setup for the site — the guest console uses it
 * today; anything else that needs a shell can reuse the same foundation.
 */
export function useTerminal({ onReady, options }: UseTerminalOptions) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let disposed = false;
        let term: Terminal | null = null;
        let ro: ResizeObserver | null = null;
        let cleanupFromReady: void | (() => void);

        const start = async () => {
            await waitForTerminalFont();
            if (disposed || !containerRef.current) return;

            term = new Terminal({
                convertEol: true,
                cursorBlink: true,
                cursorStyle: "block",
                fontFamily: TERMINAL_FONT,
                fontSize: 14,
                lineHeight: 1.15,
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
                /* container not laid out yet — the resize observer catches up */
            }
            // Re-fit once layout has settled: the first fit can run before the
            // window has its final size, which would leave the last row
            // spilling past the bottom edge.
            requestAnimationFrame(() => {
                if (disposed) return;
                try {
                    fit.fit();
                } catch {
                    /* ignore transient zero-size */
                }
            });

            ro = new ResizeObserver(() => {
                try {
                    fit.fit();
                } catch {
                    /* ignore transient zero-size */
                }
            });
            ro.observe(el);

            cleanupFromReady = onReady?.(term, fit);
        };

        start();

        return () => {
            disposed = true;
            if (typeof cleanupFromReady === "function") cleanupFromReady();
            ro?.disconnect();
            term?.dispose();
        };
        // Mount once; consumers pass stable callbacks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { containerRef };
}
