import { useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import Window from "./Window.tsx";
import Pong from "./Pong.tsx";
import { useTerminal } from "../lib/terminal/useTerminal.ts";
import { attachGuestShell, type GameKind } from "../lib/terminal/guestShell.ts";

const GAME_TITLES: Record<GameKind, string> = {
    pong: "pong — guestsh arcade",
};

/**
 * Freezes the page behind the console: Lenis is paused and native scrolling
 * is disabled, so the site can't drift while you're using a window.
 */
function useScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return;
        const lenis = (window as any).__lenis;
        lenis?.stop();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            lenis?.start();
            document.body.style.overflow = prevOverflow;
        };
    }, [active]);
}

// The interactive terminal. Split out so the xterm instance is created only
// while the console window is mounted.
function ConsoleTerminal({
    onClose,
    onLaunch,
}: {
    onClose: () => void;
    onLaunch: (game: GameKind) => void;
}) {
    const termRef = useRef<Terminal | null>(null);
    const { containerRef } = useTerminal({
        options: { fontSize: 13, cursorBlink: true },
        onReady: (term) => {
            termRef.current = term;
            term.focus();
            return attachGuestShell(term, { close: onClose, launch: onLaunch });
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
    const [games, setGames] = useState<GameKind[]>([]);

    const consoleVisible = open && !minimized;
    useScrollLock(consoleVisible || games.length > 0);

    const closeConsole = () => {
        setOpen(false);
        setMinimized(false);
    };

    // One window per game; re-running `play pong` just keeps the existing one.
    const launch = (game: GameKind) =>
        setGames((g) => (g.includes(game) ? g : [...g, game]));
    const closeGame = (game: GameKind) =>
        setGames((g) => g.filter((x) => x !== game));

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
                    <ConsoleTerminal onClose={closeConsole} onLaunch={launch} />
                </Window>
            )}

            {games.map((game, i) => (
                <Window
                    key={game}
                    title={GAME_TITLES[game]}
                    className="ef-game-window"
                    onClose={() => closeGame(game)}
                    initial={{
                        width: 860,
                        height: 580,
                        x: 90 + i * 28,
                        y: 70 + i * 28,
                    }}
                >
                    {game === "pong" && <Pong />}
                </Window>
            ))}
        </>
    );
}
