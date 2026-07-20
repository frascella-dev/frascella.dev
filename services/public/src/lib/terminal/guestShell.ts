import type { Terminal } from "@xterm/xterm";
import { PALETTE, fg, bold } from "./theme";
import { Vfs, FsError } from "./vfs";
import { startNano, type NanoSession } from "./nano";
import { writeWelcome, writeNeofetch, writeLastLogin } from "./banner";
import { GAMES, getGame, type GameId } from "../../games/registry";

// What the shell can ask the host app to do.
export type ShellContext = {
    close: () => void;
    launch: (game: GameId) => void;
};

/**
 * An interactive guest shell: a small POSIX-flavoured command set over a
 * virtual filesystem persisted in localStorage, plus a `play` launcher for
 * the built-in games. Sandboxed — nothing here touches the real machine.
 */
export function attachGuestShell(term: Terminal, ctx: ShellContext): () => void {
    const vfs = new Vfs();

    let line = "";
    let cursor = 0;
    const history: string[] = [];
    let histIdx = 0;
    let nano: NanoSession | null = null;

    const write = (s: string) => term.write(s);
    const println = (s = "") => term.write(s + "\r\n");

    const promptStr = () =>
        bold(fg(PALETTE.lime, "guest")) +
        fg(PALETTE.dim, "@") +
        bold(fg(PALETTE.blue, "frascella.dev")) +
        fg(PALETTE.dim, ":") +
        bold(fg(PALETTE.orange, vfs.prettyCwd())) +
        fg(PALETTE.dim, "$ ");

    const redraw = () => {
        write("\r\x1b[K" + promptStr() + line);
        const back = line.length - cursor;
        if (back > 0) write(`\x1b[${back}D`);
    };

    const prompt = () => {
        line = "";
        cursor = 0;
        write(promptStr());
    };

    const err = (msg: string) => println(fg(PALETTE.red, msg));

    // ── commands ────────────────────────────────────────────────────────
    type Cmd = (args: string[]) => void;

    const commands: Record<string, Cmd> = {
        help: () => {
            println(bold(fg(PALETTE.fg, "guestsh — available commands")));
            const rows: [string, string][] = [
                ["ls [-a] [dir]", "list directory contents"],
                ["cd [dir]", "change directory"],
                ["pwd", "print working directory"],
                ["mkdir [-p] <dir>", "create a directory"],
                ["touch <file>", "create an empty file"],
                ["cat <file>", "print a file"],
                ["nano <file>", "edit a file"],
                ["rm [-r] <path>", "remove a file or directory"],
                ["mv <src> <dst>", "move / rename"],
                ["cp <src> <dst>", "copy"],
                ["tree [dir]", "show the tree"],
                ["echo <text> [> file]", "print text, optionally to a file"],
                ["play <game>", "launch a game (try: play list)"],
                ["whoami / uname / date", "system info"],
                ["neofetch", "system summary"],
                ["history", "command history"],
                ["reset", "wipe the filesystem back to defaults"],
                ["clear", "clear the screen"],
                ["exit", "close the console"],
            ];
            for (const [cmd, desc] of rows) {
                println("  " + fg(PALETTE.lime, cmd.padEnd(22)) + fg(PALETTE.dim, desc));
            }
            println();
            println(fg(PALETTE.dim, "Files live in your browser's localStorage."));
        },

        ls: (args) => {
            const paths = args.filter((a) => !a.startsWith("-"));
            const target = paths[0] ?? ".";
            const entries = vfs.list(target);
            if (!entries.length) return;
            println(
                entries
                    .map((e) =>
                        e.isDir ? bold(fg(PALETTE.blue, e.name + "/")) : e.name,
                    )
                    .join("   "),
            );
        },

        cd: (args) => vfs.changeDir(args[0] ?? "~"),
        pwd: () => println(vfs.cwd),

        mkdir: (args) => {
            const parents = args.includes("-p");
            const targets = args.filter((a) => !a.startsWith("-"));
            if (!targets.length) return err("mkdir: missing operand");
            for (const t of targets) vfs.makeDir(t, parents);
        },

        touch: (args) => {
            if (!args.length) return err("touch: missing operand");
            for (const t of args) vfs.touch(t);
        },

        cat: (args) => {
            if (!args.length) return err("cat: missing operand");
            for (const t of args) {
                const content = vfs.readFile(t);
                if (content) content.split("\n").forEach((l) => println(l));
            }
        },

        rm: (args) => {
            const recursive = args.some((a) => /^-[rf]*r[rf]*$/.test(a));
            const targets = args.filter((a) => !a.startsWith("-"));
            if (!targets.length) return err("rm: missing operand");
            for (const t of targets) vfs.remove(t, recursive);
        },

        mv: (args) => {
            if (args.length < 2) return err("mv: usage: mv <src> <dst>");
            vfs.move(args[0], args[1]);
        },

        cp: (args) => {
            if (args.length < 2) return err("cp: usage: cp <src> <dst>");
            vfs.copy(args[0], args[1]);
        },

        tree: (args) => {
            const root = args[0] ?? ".";
            const walk = (path: string, prefix: string) => {
                const entries = vfs.list(path);
                entries.forEach((e, i) => {
                    const last = i === entries.length - 1;
                    const branch = last ? "└── " : "├── ";
                    println(
                        fg(PALETTE.dim, prefix + branch) +
                            (e.isDir ? bold(fg(PALETTE.blue, e.name + "/")) : e.name),
                    );
                    if (e.isDir)
                        walk(`${path}/${e.name}`, prefix + (last ? "    " : "│   "));
                });
            };
            println(bold(fg(PALETTE.blue, vfs.resolve(root))));
            walk(root, "");
        },

        echo: (args) => {
            const redirIdx = args.findIndex((a) => a === ">" || a === ">>");
            if (redirIdx === -1) return println(args.join(" "));
            const target = args[redirIdx + 1];
            if (!target) return err("echo: missing redirection target");
            const text = args.slice(0, redirIdx).join(" ");
            const append = args[redirIdx] === ">>";
            const prev = append ? safeRead(target) : "";
            vfs.writeFile(target, append && prev ? `${prev}\n${text}` : text);
        },

        nano: (args) => {
            const path = args[0];
            if (!path) return err("nano: missing filename");
            const initial = safeRead(path);
            nano = startNano(term, {
                path,
                initial,
                onSave: (content) => vfs.writeFile(path, content),
                onExit: () => {
                    nano = null;
                    prompt();
                },
            });
        },

        play: (args) => {
            const sub = (args[0] ?? "").toLowerCase();
            if (!sub || sub === "help") {
                println(bold(fg(PALETTE.fg, "play — the arcade")));
                println("  " + fg(PALETTE.lime, "play list".padEnd(16)) + fg(PALETTE.dim, "show available games"));
                println("  " + fg(PALETTE.lime, "play <game>".padEnd(16)) + fg(PALETTE.dim, "launch a game in a new window"));
                println("  " + fg(PALETTE.lime, "play help".padEnd(16)) + fg(PALETTE.dim, "this message"));
                return;
            }
            if (sub === "list") {
                println(bold(fg(PALETTE.fg, "Available games")));
                for (const g of GAMES)
                    println("  " + fg(PALETTE.lime, g.name.padEnd(10)) + fg(PALETTE.dim, g.desc));
                return;
            }
            const game = getGame(sub);
            if (!game) {
                err(`play: unknown game "${sub}"`);
                return println(fg(PALETTE.dim, "Try ") + fg(PALETTE.lime, "play list"));
            }
            println(fg(PALETTE.dim, `Launching ${game.name}…`));
            ctx.launch(game.id);
        },

        whoami: () => println("guest"),
        uname: () => println("guestsh 1.0 (browser sandbox) x86_64"),
        date: () => println(new Date().toString()),

        neofetch: () => {
            const rows: [string, string][] = [
                ["user", "guest@frascella.dev"],
                ["shell", "guestsh 1.0"],
                ["term", "xterm.js"],
                ["fs", "localStorage (persistent)"],
                ["games", GAMES.map((g) => g.name).join(", ")],
            ];
            for (const [k, v] of rows)
                println(bold(fg(PALETTE.lime, k.padEnd(7))) + " " + v);
        },

        history: () =>
            history.forEach((h, i) =>
                println("  " + fg(PALETTE.dim, String(i + 1).padStart(3)) + "  " + h),
            ),

        reset: () => {
            vfs.reset();
            println(fg(PALETTE.orange, "Filesystem reset to defaults."));
        },

        clear: () => write("\x1b[2J\x1b[3J\x1b[H"),
        exit: () => ctx.close(),
    };
    commands.cls = commands.clear;
    commands.ll = commands.ls;

    const safeRead = (path: string): string => {
        try {
            return vfs.readFile(path);
        } catch {
            return "";
        }
    };

    const execute = (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return;
        const [name, ...args] = trimmed.split(/\s+/);
        const cmd = commands[name.toLowerCase()];
        if (!cmd) {
            err(`${name}: command not found`);
            return println(fg(PALETTE.dim, "Try ") + fg(PALETTE.lime, "help"));
        }
        try {
            cmd(args);
        } catch (e) {
            err(e instanceof FsError ? `${name}: ${e.message}` : `${name}: unexpected error`);
        }
    };

    // ── readline ────────────────────────────────────────────────────────
    const onData = term.onData((data) => {
        if (nano) return nano.handle(data);

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
                if (!nano) prompt(); // nano paints its own screen
                return;
            }
            case "\x7f":
                if (cursor > 0) {
                    line = line.slice(0, cursor - 1) + line.slice(cursor);
                    cursor--;
                    redraw();
                }
                return;
            case "\x1b[D":
                if (cursor > 0) {
                    cursor--;
                    write("\x1b[D");
                }
                return;
            case "\x1b[C":
                if (cursor < line.length) {
                    cursor++;
                    write("\x1b[C");
                }
                return;
            case "\x1b[A":
                if (history.length && histIdx > 0) {
                    histIdx--;
                    line = history[histIdx];
                    cursor = line.length;
                    redraw();
                }
                return;
            case "\x1b[B":
                if (histIdx < history.length) {
                    histIdx++;
                    line = history[histIdx] ?? "";
                    cursor = line.length;
                    redraw();
                }
                return;
            case "\x01":
            case "\x1b[H":
                cursor = 0;
                redraw();
                return;
            case "\x05":
            case "\x1b[F":
                cursor = line.length;
                redraw();
                return;
            case "\x03":
                write("^C\r\n");
                prompt();
                return;
            case "\x0c":
                write("\x1b[2J\x1b[3J\x1b[H");
                prompt();
                return;
            default: {
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

    // Same boot identity as the splash: welcome, neofetch, last login.
    writeWelcome(term);
    writeNeofetch(term, term.cols);
    writeLastLogin(term);
    println(
        fg(PALETTE.dim, "Type ") +
            fg(PALETTE.lime, "help") +
            fg(PALETTE.dim, " for commands"),
    );
    println();
    prompt();

    return () => onData.dispose();
}
