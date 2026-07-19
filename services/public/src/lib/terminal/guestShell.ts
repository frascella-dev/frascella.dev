import type { Terminal } from "@xterm/xterm";
import { PALETTE, fg, bold } from "./theme";

// Context the shell can call back into (close the window, scroll the site…).
export type ShellContext = {
    close: () => void;
    gotoSection: (id: string) => void;
};

const PROMPT =
    bold(fg(PALETTE.lime, "guest")) +
    fg(PALETTE.dim, "@") +
    bold(fg(PALETTE.blue, "frascella.dev")) +
    fg(PALETTE.dim, ":") +
    bold(fg(PALETTE.orange, "~")) +
    fg(PALETTE.dim, "$ ");

const SOCIALS: [string, string][] = [
    ["GitHub", "https://github.com/manuto276"],
    ["LinkedIn", "https://linkedin.com/in/efrascella256"],
    ["Email", "hello@frascella.dev"],
];

const SECTIONS = ["about", "work", "contact"];

/**
 * Attaches an interactive "guest" shell to an xterm terminal: a small readline
 * (history, cursor movement, line editing) plus a registry of simulated
 * commands. Deliberately sandboxed — the visitor is a guest, there is no real
 * filesystem or process, just enough to feel like a shell.
 *
 * Returns a disposer.
 */
export function attachGuestShell(term: Terminal, ctx: ShellContext): () => void {
    let line = "";
    let cursor = 0;
    const history: string[] = [];
    let histIdx = 0;

    const write = (s: string) => term.write(s);
    const println = (s = "") => term.write(s + "\r\n");

    const redraw = () => {
        write("\r\x1b[K" + PROMPT + line);
        const back = line.length - cursor;
        if (back > 0) write(`\x1b[${back}D`);
    };

    const prompt = () => {
        line = "";
        cursor = 0;
        write(PROMPT);
    };

    const banner = () => {
        println(bold(fg(PALETTE.fg, "guest console")) + fg(PALETTE.dim, " — frascella.dev"));
        println(
            fg(PALETTE.dim, "Type ") +
                fg(PALETTE.lime, "help") +
                fg(PALETTE.dim, " to see what you can do. You are logged in as ") +
                fg(PALETTE.orange, "guest") +
                fg(PALETTE.dim, "."),
        );
        println();
    };

    // ── commands ────────────────────────────────────────────────────────
    const commands: Record<string, (args: string[]) => void> = {
        help: () => {
            println(bold(fg(PALETTE.fg, "Available commands")));
            const rows: [string, string][] = [
                ["help", "show this help"],
                ["about", "who is Emanuele"],
                ["whoami", "the current user"],
                ["ls", "list the site sections"],
                ["work", "recent projects"],
                ["contact", "how to reach me"],
                ["social", "social links"],
                ["open <section>", "jump to a section on the page"],
                ["neofetch", "system summary"],
                ["date", "current date/time"],
                ["echo <text>", "print text"],
                ["clear", "clear the screen"],
                ["exit", "close the console"],
            ];
            for (const [cmd, desc] of rows) {
                println("  " + fg(PALETTE.lime, cmd.padEnd(16)) + fg(PALETTE.dim, desc));
            }
        },
        about: () => {
            println(bold(fg(PALETTE.fg, "Emanuele Frascella")));
            println(fg(PALETTE.dim, "Backend engineer — Taranto, Italy."));
            println("I build APIs, services and the occasional over-engineered");
            println("portfolio. Stack: php · node · python · aws.");
        },
        whoami: () => println("guest"),
        pwd: () => println("/home/guest"),
        ls: () => println(SECTIONS.map((s) => fg(PALETTE.blue, s + "/")).join("   ")),
        work: () => {
            println(bold(fg(PALETTE.fg, "Recent work")));
            println("  " + fg(PALETTE.lime, "vitrine") + fg(PALETTE.dim, "   a cool system monitor for your desktop"));
            println("  " + fg(PALETTE.dim, "…and more on the ") + fg(PALETTE.blue, "work") + fg(PALETTE.dim, " section — try ") + fg(PALETTE.lime, "open work") + fg(PALETTE.dim, "."));
        },
        contact: () => {
            println(bold(fg(PALETTE.fg, "Get in touch")));
            for (const [label, value] of SOCIALS) {
                println("  " + fg(PALETTE.lime, label.padEnd(10)) + value);
            }
            println(fg(PALETTE.dim, "Or run ") + fg(PALETTE.lime, "open contact") + fg(PALETTE.dim, " to use the form."));
        },
        social: () => {
            for (const [label, value] of SOCIALS) {
                println("  " + fg(PALETTE.lime, label.padEnd(10)) + value);
            }
        },
        open: (args) => {
            const target = (args[0] || "").toLowerCase();
            if (!target) return println(fg(PALETTE.red, "usage: open <about|work|contact>"));
            const id = target === "home" || target === "top" ? "top" : target;
            if (!SECTIONS.includes(id) && id !== "top") {
                return println(fg(PALETTE.red, `open: unknown section "${target}"`));
            }
            println(fg(PALETTE.dim, `Jumping to ${id}…`));
            ctx.gotoSection(id);
        },
        neofetch: () => {
            const rows: [string, string][] = [
                ["user", "guest@frascella.dev"],
                ["shell", "guestsh 1.0"],
                ["term", "xterm.js"],
                ["host", "frascella.dev 2026.04"],
                ["theme", "paper / ink / acid-lime"],
            ];
            for (const [k, v] of rows) {
                println(bold(fg(PALETTE.lime, k.padEnd(7))) + " " + v);
            }
        },
        date: () => println(new Date().toString()),
        echo: (args) => println(args.join(" ")),
        history: () => history.forEach((h, i) => println("  " + fg(PALETTE.dim, String(i + 1).padStart(3)) + "  " + h)),
        sudo: () => println(fg(PALETTE.orange, "guest is not in the sudoers file. This incident will be reported. 🙂")),
        clear: () => write("\x1b[2J\x1b[3J\x1b[H"),
        exit: () => ctx.close(),
    };
    // aliases
    commands.projects = commands.work;
    commands.socials = commands.social;
    commands.cls = commands.clear;

    const execute = (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return;
        const [name, ...args] = trimmed.split(/\s+/);
        const cmd = commands[name.toLowerCase()];
        if (cmd) cmd(args);
        else
            println(
                fg(PALETTE.red, `${name}: command not found`) +
                    fg(PALETTE.dim, " — try ") +
                    fg(PALETTE.lime, "help"),
            );
    };

    // ── readline ────────────────────────────────────────────────────────
    const onData = term.onData((data) => {
        switch (data) {
            case "\r": {
                write("\r\n");
                const input = line;
                if (input.trim()) {
                    history.push(input);
                    histIdx = history.length;
                }
                line = "";
                cursor = 0;
                execute(input);
                prompt();
                return;
            }
            case "\x7f": // backspace
                if (cursor > 0) {
                    line = line.slice(0, cursor - 1) + line.slice(cursor);
                    cursor--;
                    redraw();
                }
                return;
            case "\x1b[D": // left
                if (cursor > 0) {
                    cursor--;
                    write("\x1b[D");
                }
                return;
            case "\x1b[C": // right
                if (cursor < line.length) {
                    cursor++;
                    write("\x1b[C");
                }
                return;
            case "\x1b[A": // up — history back
                if (history.length && histIdx > 0) {
                    histIdx--;
                    line = history[histIdx];
                    cursor = line.length;
                    redraw();
                }
                return;
            case "\x1b[B": // down — history forward
                if (histIdx < history.length) {
                    histIdx++;
                    line = history[histIdx] ?? "";
                    cursor = line.length;
                    redraw();
                }
                return;
            case "\x01": // ctrl-a / home
            case "\x1b[H":
                cursor = 0;
                redraw();
                return;
            case "\x05": // ctrl-e / end
            case "\x1b[F":
                cursor = line.length;
                redraw();
                return;
            case "\x03": // ctrl-c
                write("^C\r\n");
                prompt();
                return;
            case "\x0c": // ctrl-l
                write("\x1b[2J\x1b[3J\x1b[H");
                prompt();
                return;
            default: {
                // printable text (incl. paste); ignore other control chars
                const printable = Array.from(data)
                    .filter((c) => c >= " " && c !== "\x7f")
                    .join("");
                if (!printable) return;
                line = line.slice(0, cursor) + printable + line.slice(cursor);
                cursor += printable.length;
                redraw();
            }
        }
    });

    banner();
    prompt();

    return () => onData.dispose();
}
