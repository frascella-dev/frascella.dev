import { useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { useTerminal } from "../lib/terminal/useTerminal.ts";
import { PALETTE, fg, bold } from "../lib/terminal/theme.ts";
import {
    writeWelcome,
    writeNeofetch,
    writeLastLogin,
} from "../lib/terminal/banner.ts";

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
                    fg(PALETTE.dim, "[    0.482110] Systemd services ready."),
                );
                await wait(240);
                term.writeln("");

                writeWelcome(term);
                await wait(240);

                writeNeofetch(term, cols);
                await wait(900);

                writeLastLogin(term);
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
