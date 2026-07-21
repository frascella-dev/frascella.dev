import type { Terminal } from "@xterm/xterm";
import { PALETTE, fg } from "./theme";

export type NanoOptions = {
    path: string;
    initial: string;
    onSave: (content: string) => void;
    onExit: () => void;
};

export type NanoSession = {
    /** Feed a raw keystroke chunk. */
    handle: (data: string) => void;
    /** Re-render (e.g. after the window was resized). */
    render: () => void;
};

const HEADER_ROWS = 1;
const FOOTER_ROWS = 2;

/**
 * A deliberately small nano-alike: full-screen editing inside the terminal
 * with cursor movement, insert/delete, ^O save and ^X exit. Enough to edit a
 * file in the guest filesystem without pretending to be the real thing.
 */
export function startNano(term: Terminal, opts: NanoOptions): NanoSession {
    let lines: string[] = opts.initial.split("\n");
    if (lines.length === 0) lines = [""];
    let cy = 0; // cursor line
    let cx = 0; // cursor column
    let top = 0; // first visible line
    let dirty = false;
    let prompt: null | "save-on-exit" = null;
    let status = "";
    let exited = false;
    let statusTimer: ReturnType<typeof setTimeout> | null = null;

    const bodyRows = () => Math.max(1, term.rows - HEADER_ROWS - FOOTER_ROWS);

    const clampScroll = () => {
        const h = bodyRows();
        if (cy < top) top = cy;
        if (cy >= top + h) top = cy - h + 1;
        if (top < 0) top = 0;
    };

    const render = () => {
        if (exited) return; // never repaint over the shell after ^X
        clampScroll();
        const cols = term.cols;
        const h = bodyRows();
        let out = "\x1b[2J\x1b[H";

        // header
        const title = ` guestsh nano — ${opts.path}${dirty ? " *" : ""}`;
        out += "\x1b[7m" + title.padEnd(cols).slice(0, cols) + "\x1b[0m\r\n";

        // body
        for (let i = 0; i < h; i++) {
            const line = lines[top + i];
            out += (line === undefined ? "" : line.slice(0, cols)) + "\r\n";
        }

        // footer
        const help = prompt
            ? "Save modified buffer?  Y Yes   N No   ^C Cancel"
            : "^O Save   ^X Exit   ↑↓←→ Move";
        out += "\x1b[7m" + (status || help).padEnd(cols).slice(0, cols) + "\x1b[0m";

        term.write(out);

        // place the cursor (1-indexed, offset by the header)
        const row = HEADER_ROWS + (cy - top) + 1;
        const col = Math.min(cx, term.cols - 1) + 1;
        term.write(`\x1b[${row};${col}H`);
    };

    const save = () => {
        opts.onSave(lines.join("\n"));
        dirty = false;
        status = `Wrote ${lines.length} line${lines.length === 1 ? "" : "s"}`;
        render();
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = setTimeout(() => {
            statusTimer = null;
            status = "";
            render();
        }, 900);
    };

    const exit = () => {
        exited = true;
        if (statusTimer) {
            clearTimeout(statusTimer);
            statusTimer = null;
        }
        term.write("\x1b[2J\x1b[H");
        opts.onExit();
    };

    const handle = (data: string) => {
        // exit confirmation takes precedence
        if (prompt === "save-on-exit") {
            if (data === "y" || data === "Y") {
                opts.onSave(lines.join("\n"));
                return exit();
            }
            if (data === "n" || data === "N") return exit();
            if (data === "\x03" || data === "\x1b") {
                prompt = null;
                return render();
            }
            return;
        }

        switch (data) {
            case "\x18": // ^X
                if (dirty) {
                    prompt = "save-on-exit";
                    return render();
                }
                return exit();
            case "\x0f": // ^O
                return save();
            case "\r":
                lines.splice(cy + 1, 0, lines[cy].slice(cx));
                lines[cy] = lines[cy].slice(0, cx);
                cy++;
                cx = 0;
                dirty = true;
                return render();
            case "\x7f": // backspace
                if (cx > 0) {
                    lines[cy] = lines[cy].slice(0, cx - 1) + lines[cy].slice(cx);
                    cx--;
                    dirty = true;
                } else if (cy > 0) {
                    const prev = lines[cy - 1];
                    cx = prev.length;
                    lines[cy - 1] = prev + lines[cy];
                    lines.splice(cy, 1);
                    cy--;
                    dirty = true;
                }
                return render();
            case "\x1b[A": // up
                if (cy > 0) {
                    cy--;
                    cx = Math.min(cx, lines[cy].length);
                }
                return render();
            case "\x1b[B": // down
                if (cy < lines.length - 1) {
                    cy++;
                    cx = Math.min(cx, lines[cy].length);
                }
                return render();
            case "\x1b[C": // right
                if (cx < lines[cy].length) cx++;
                else if (cy < lines.length - 1) {
                    cy++;
                    cx = 0;
                }
                return render();
            case "\x1b[D": // left
                if (cx > 0) cx--;
                else if (cy > 0) {
                    cy--;
                    cx = lines[cy].length;
                }
                return render();
            case "\x1b[H":
            case "\x01":
                cx = 0;
                return render();
            case "\x1b[F":
            case "\x05":
                cx = lines[cy].length;
                return render();
            default: {
                const printable = Array.from(data)
                    .filter((c) => c >= " " && c !== "\x7f")
                    .join("");
                if (!printable) return;
                lines[cy] =
                    lines[cy].slice(0, cx) + printable + lines[cy].slice(cx);
                cx += printable.length;
                dirty = true;
                return render();
            }
        }
    };

    render();
    return { handle, render };
}

/** Colored hint printed by the shell when nano launches. */
export const nanoHint = fg(PALETTE.dim, "(^O save, ^X exit)");
