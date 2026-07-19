import type { ITheme } from "@xterm/xterm";

// The portfolio palette, reused by the terminal. Kept as hex so both the
// xterm theme and the truecolor ANSI helpers below draw from one source.
export const PALETTE = {
    bg: "#050605",
    fg: "#E9E6DC",
    dim: "#7A7566",
    lime: "#C7F651", // acid-lime — accent / user / keys
    blue: "#8FD4FF", // host / directories
    orange: "#FFB86B", // path / launch
    pink: "#FF8AD8",
    red: "#ff5f57",
    yellow: "#febc2e",
    green: "#28c840",
} as const;

// xterm theme — dark, matches the splash background so the CRT overlay
// (scanlines + vignette) sits cleanly on top.
export const TERMINAL_THEME: ITheme = {
    background: PALETTE.bg,
    foreground: PALETTE.fg,
    cursor: PALETTE.lime,
    cursorAccent: PALETTE.bg,
    selectionBackground: "rgba(199,246,81,0.28)",
    black: PALETTE.bg,
    red: PALETTE.red,
    green: PALETTE.lime,
    yellow: PALETTE.orange,
    blue: PALETTE.blue,
    magenta: PALETTE.pink,
    cyan: PALETTE.blue,
    white: PALETTE.fg,
    brightBlack: PALETTE.dim,
    brightRed: PALETTE.red,
    brightGreen: PALETTE.lime,
    brightYellow: PALETTE.yellow,
    brightBlue: PALETTE.blue,
    brightMagenta: PALETTE.pink,
    brightCyan: PALETTE.blue,
    brightWhite: "#ffffff",
};

// The monospace stack used across the site's "terminal" typography.
export const TERMINAL_FONT =
    '"Courier Prime", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

// ── Truecolor ANSI helpers ─────────────────────────────────────────────
// 24-bit escapes so the terminal renders the exact palette hexes rather
// than an approximated 16-color mapping.
const RESET = "\x1b[0m";

function toRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function fg(hex: string, text: string): string {
    const [r, g, b] = toRgb(hex);
    return `\x1b[38;2;${r};${g};${b}m${text}${RESET}`;
}

export function bgBlock(hex: string, width = 2): string {
    const [r, g, b] = toRgb(hex);
    return `\x1b[48;2;${r};${g};${b}m${" ".repeat(width)}${RESET}`;
}

export const bold = (text: string) => `\x1b[1m${text}${RESET}`;
