import { useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { useTerminal } from "../lib/terminal/useTerminal.ts";
import { PALETTE, fg, bold, bgBlock } from "../lib/terminal/theme.ts";

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

function promptPrefix(user: string, host: string, path: string): string {
    return (
        bold(fg(PALETTE.lime, user)) +
        fg(PALETTE.dim, "@") +
        bold(fg(PALETTE.blue, host)) +
        fg(PALETTE.dim, ":") +
        bold(fg(PALETTE.orange, path)) +
        fg(PALETTE.dim, "$ ")
    );
}

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

function writeNeofetch(term: Terminal, cols: number) {
    const info = buildInfoLines();
    // Narrow terminals can't hold logo + info side by side — stack them,
    // mirroring the old mobile layout. Side-by-side rows run ~96 cols wide.
    if (cols < 100) {
        for (const line of ASCII_LOGO) term.writeln(fg(PALETTE.lime, line));
        term.writeln("");
        for (const line of info) term.writeln(line);
        return;
    }
    const offset = 4; // nudge info down so it reads centered against the logo
    const rows = Math.max(ASCII_LOGO.length, info.length + offset);
    for (let i = 0; i < rows; i++) {
        const logo = (ASCII_LOGO[i] ?? "").padEnd(LOGO_W);
        const line = info[i - offset] ?? "";
        term.writeln(fg(PALETTE.lime, logo) + "  " + line);
    }
}

export default function Splash({ onDone }: { onDone?: () => void }) {
    const [closing, setClosing] = useState(false);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    // On phones the ASCII logo (~54 cols) only fits without wrapping at a
    // smaller cell size; desktop stays at a comfortable 14px.
    const fontSize =
        typeof window !== "undefined" && window.innerWidth < 720 ? 10 : 14;

    const { containerRef } = useTerminal({
        options: { fontSize, disableStdin: true },
        onReady: (term: Terminal, fit: FitAddon) => {
            let cancelled = false;
            const timeouts: ReturnType<typeof setTimeout>[] = [];
            const wait = (ms: number) =>
                new Promise<void>((r) => timeouts.push(setTimeout(r, ms)));

            const type = async (
                user: string,
                host: string,
                path: string,
                cmd: string,
            ) => {
                term.write(promptPrefix(user, host, path));
                for (const ch of cmd) {
                    if (cancelled) return;
                    term.write(ch);
                    await wait(40 + Math.random() * 32);
                }
                await wait(120);
                term.write("\n");
                await wait(160);
            };

            const run = async () => {
                const cols = fit.proposeDimensions()?.cols ?? term.cols;

                term.writeln(
                    fg(PALETTE.dim, "[    0.000000] Booting frascella.dev 2026.04 (tty1)"),
                );
                await wait(120);
                term.writeln(
                    fg(PALETTE.dim, "[    0.214881] Loaded modules: node/22, php/8.3, aws-cli, docker"),
                );
                await wait(140);
                term.writeln(
                    fg(PALETTE.dim, "[    0.482110] Systemd services ready. Welcome."),
                );
                await wait(240);
                term.writeln("");

                term.writeln(
                    "Welcome to frascella.dev 2026.04 LTS (GNU/Linux 6.8.0-portfolio x86_64)",
                );
                term.writeln(
                    fg(PALETTE.dim, " * Documentation:  https://github.com/manuto276"),
                );
                term.writeln(
                    fg(PALETTE.dim, " * Support:        https://linkedin.com/in/efrascella256"),
                );
                term.writeln("");
                await wait(240);

                writeNeofetch(term, cols);
                await wait(900);

                term.writeln("");
                term.writeln(fg(PALETTE.dim, "Last login: Thu Apr 16 09:42:18 2026 on tty1"));
                term.writeln("");
                if (cancelled) return;

                await type("emanuele", "frascella.dev", "~", "cd portfolio && ls");
                const ls = ["public/", "src/", "package.json", "tsconfig.json", "README.md", ".env"];
                term.writeln(
                    ls
                        .map((it) =>
                            it.endsWith("/")
                                ? bold(fg(PALETTE.blue, it))
                                : it.startsWith(".")
                                  ? fg(PALETTE.dim, it)
                                  : it,
                        )
                        .join("   "),
                );
                await wait(280);
                term.writeln("");

                await type("emanuele", "frascella.dev", "~/portfolio", "npm run dev");

                const out: [string, string][] = [
                    ["", ""],
                    ["fg", "> portfolio@2026.4.0 dev"],
                    ["fg", "> vite"],
                    ["", ""],
                    ["dim", "  VITE v5.4  ready in 312 ms"],
                    ["dim", "  ➜  Local:    http://localhost:2026/"],
                    ["dim", "  ➜  Network:  http://10.0.0.42:2026/"],
                    ["", ""],
                    ["ok", " ✓ Starting…"],
                    ["ok", " ✓ Ready in 842ms"],
                    ["", ""],
                    ["launch", "→ Opening http://localhost:2026 …"],
                ];
                for (const [kind, text] of out) {
                    if (cancelled) return;
                    const color =
                        kind === "ok"
                            ? PALETTE.lime
                            : kind === "launch"
                              ? PALETTE.orange
                              : kind === "dim"
                                ? PALETTE.dim
                                : null;
                    term.writeln(color ? fg(color, text) : text);
                    await wait(kind === "ok" ? 160 : kind === "launch" ? 240 : 70);
                }

                await wait(320);
                if (cancelled) return;
                setClosing(true);
                await wait(700);
                try {
                    sessionStorage.setItem("ef-splash-seen", "1");
                } catch {
                    /* private mode — the splash simply replays next visit */
                }
                onDoneRef.current?.();
            };

            run();

            return () => {
                cancelled = true;
                timeouts.forEach(clearTimeout);
            };
        },
    });

    return (
        <div className={`ef-splash ${closing ? "is-closing" : ""}`}>
            <div className="ef-splash-body">
                <div className="ef-term" ref={containerRef} />
            </div>
        </div>
    );
}
