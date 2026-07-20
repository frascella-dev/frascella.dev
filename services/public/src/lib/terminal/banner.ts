import type { Terminal } from "@xterm/xterm";
import { PALETTE, fg, bold, bgBlock } from "./theme";

// The shared boot identity — welcome block, neofetch (logo + sysinfo) and the
// last-login line. Used by both the splash boot sequence and the guest console
// so the two read as the same machine.

const ASCII_LOGO = [
    "          ------:                                    ",
    "          -------------                              ",
    "          -------------------                        ",
    "         :-------------------     -:                 ",
    "        -------    ---------:    ------              ",
    "        ------        ------:    --------:           ",
    "       :------       ------:    -----------          ",
    "       -------       ------:   --------------        ",
    "      :------       :-----:    :-----:--------       ",
    "      -------        :----:   -------  :-------      ",
    "     =------                  -------   =------:     ",
    "     :----------:-:           ------     :------     ",
    "     --------------------    -------      ------     ",
    "     -------------------     ------                  ",
    "    -------    :-------:    --------:---             ",
    "     ------          ::     ------------------       ",
    "     ------                :--------------------     ",
    "     -------               -----:   :----------:     ",
    "     :------:             -------         -----:     ",
    "      :-------            -------                    ",
    "       -------:          :-----:                     ",
    "        :--------        ------                      ",
    "          :---------    :-----:                      ",
    "           ::------     :-----                       ",
    "              ----:    -------                       ",
    "                 -     ------         -:             ",
    "                       ------        ------          ",
    "                                    -------          ",
    "                                    ------:          ",
];

const SYSINFO: [string, string][] = [
    ["user", "emanuele@frascella.dev"],
    ["os", "frascella.dev 2026.04 LTS x86_64"],
    ["kernel", "6.8.0-portfolio"],
    ["shell", "zsh 5.9"],
    ["term", "xterm.js"],
    ["role", "backend engineer"],
    ["based", "taranto, italy"],
    ["stack", "php · node · python · aws"],
    ["uptime", "5 years, 2 months"],
    ["theme", "paper / ink / acid-lime"],
];

const PALETTE_SWATCHES = [
    "#0A0B0A",
    "#7A7566",
    "#E9E6DC",
    "#C7F651",
    "#FF8AD8",
    "#8FD4FF",
    "#FFB86B",
    "#EEEAE0",
];

const LOGO_W = 54;

/**
 * Squash the artwork vertically by mapping source rows onto fewer output
 * rows, keeping the original dash characters (ink wins over blank). Terminal
 * cells are much taller than wide, so the raw art reads stretched; folding a
 * handful of rows brings it back towards square without the detail loss of
 * dropping rows outright.
 */
function compactLogo(lines: string[], targetRows: number): string[] {
    const src = lines.length;
    if (targetRows >= src) return lines;
    const width = Math.max(...lines.map((l) => l.length));
    const buf: string[][] = Array.from({ length: targetRows }, () =>
        Array(width).fill(" "),
    );
    for (let r = 0; r < src; r++) {
        const out = Math.min(targetRows - 1, Math.floor((r * targetRows) / src));
        const line = lines[r];
        for (let c = 0; c < width; c++) {
            const ch = line[c];
            if (ch && ch !== " " && buf[out][c] === " ") buf[out][c] = ch;
        }
    }
    return buf.map((row) => row.join("").replace(/\s+$/, ""));
}

// Tuned against lineHeight 1.15 — see compactLogo above.
const LOGO = compactLogo(ASCII_LOGO, 20);

function buildInfoLines(): string[] {
    const lines: string[] = [];
    lines.push(
        bold(fg(PALETTE.lime, "emanuele")) +
            fg(PALETTE.dim, "@") +
            bold(fg(PALETTE.blue, "frascella.dev")),
    );
    lines.push(fg(PALETTE.dim, "─".repeat(34)));
    for (const [k, v] of SYSINFO) {
        lines.push(bold(fg(PALETTE.lime, k.padEnd(8))) + " " + v);
    }
    lines.push("");
    lines.push(PALETTE_SWATCHES.map((c) => bgBlock(c, 3)).join(""));
    return lines;
}

export function writeWelcome(term: Terminal) {
    term.writeln(
        "Welcome to frascella.dev 2026.04 LTS (GNU/Linux 6.8.0-portfolio x86_64)",
    );
    term.writeln(fg(PALETTE.dim, " * Documentation:  https://github.com/manuto276"));
    term.writeln(
        fg(PALETTE.dim, " * Support:        https://linkedin.com/in/efrascella256"),
    );
    term.writeln("");
}

export function writeNeofetch(term: Terminal, cols: number) {
    const info = buildInfoLines();
    // Narrow terminals can't hold logo + info side by side — stack them.
    // Side-by-side rows run ~96 cols wide.
    if (cols < 100) {
        for (const line of LOGO) term.writeln(fg(PALETTE.lime, line));
        term.writeln("");
        for (const line of info) term.writeln(line);
        return;
    }
    const offset = 1; // nudge info down so it reads centred against the logo
    const rows = Math.max(LOGO.length, info.length + offset);
    for (let i = 0; i < rows; i++) {
        const logo = (LOGO[i] ?? "").padEnd(LOGO_W);
        const line = info[i - offset] ?? "";
        term.writeln(fg(PALETTE.lime, logo) + "  " + line);
    }
}

export function writeLastLogin(term: Terminal) {
    term.writeln("");
    term.writeln(fg(PALETTE.dim, "Last login: Thu Apr 16 09:42:18 2026 on tty1"));
    term.writeln("");
}
