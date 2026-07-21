import { Suspense, useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import Window from "./Window.tsx";
import { useTerminal } from "../lib/terminal/useTerminal.ts";
import { attachGuestShell } from "../lib/terminal/guestShell.ts";
import { getGame, type GameId } from "../games/registry.ts";
import { GAME_COMPONENTS } from "../games/index.ts";

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
    onLaunch: (game: GameId) => void;
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

const CONSOLE_ID = "console";
const Z_BASE = 6000;

export default function Console() {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [games, setGames] = useState<GameId[]>([]);
    // Stacking order of every window id — last entry sits on top.
    const [order, setOrder] = useState<string[]>([]);

    const consoleVisible = open && !minimized;
    useScrollLock(consoleVisible || games.length > 0);

    // Move a window to the top of the stack (focus). New ids land on top too.
    const focus = (id: string) =>
        setOrder((o) => [...o.filter((x) => x !== id), id]);
    const drop = (id: string) => setOrder((o) => o.filter((x) => x !== id));
    const zOf = (id: string) => Z_BASE + Math.max(0, order.indexOf(id));

    const openConsole = () => {
        setOpen(true);
        setMinimized(false);
        focus(CONSOLE_ID);
    };
    const closeConsole = () => {
        setOpen(false);
        setMinimized(false);
        drop(CONSOLE_ID);
    };

    // One window per game; re-running `play pong` just refocuses the existing one.
    const launch = (game: GameId) => {
        setGames((g) => (g.includes(game) ? g : [...g, game]));
        focus(game);
    };
    const closeGame = (game: GameId) => {
        setGames((g) => g.filter((x) => x !== game));
        drop(game);
    };

    return (
        <>
            {(!open || minimized) && (
                <button
                    type="button"
                    className="ef-console-tab"
                    data-cursor="link"
                    onClick={openConsole}
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
                    zIndex={zOf(CONSOLE_ID)}
                    onFocus={() => focus(CONSOLE_ID)}
                    onMinimize={() => setMinimized(true)}
                    onClose={closeConsole}
                    initial={{ width: 900, height: 560 }}
                >
                    <ConsoleTerminal onClose={closeConsole} onLaunch={launch} />
                </Window>
            )}

            {games.map((game, i) => {
                const meta = getGame(game);
                const GameComponent = GAME_COMPONENTS[game];
                if (!meta || !GameComponent) return null;
                return (
                    <Window
                        key={game}
                        title={`${meta.name} — guestsh arcade`}
                        className="ef-game-window"
                        zIndex={zOf(game)}
                        onFocus={() => focus(game)}
                        onClose={() => closeGame(game)}
                        initial={{
                            width: meta.window.width,
                            height: meta.window.height,
                            x: 90 + i * 28,
                            y: 70 + i * 28,
                        }}
                    >
                        {/* the game chunk is fetched on first launch */}
                        <Suspense
                            fallback={
                                <div className="ef-game-loading">
                                    loading {meta.name}…
                                </div>
                            }
                        >
                            <GameComponent />
                        </Suspense>
                    </Window>
                );
            })}
        </>
    );
}
