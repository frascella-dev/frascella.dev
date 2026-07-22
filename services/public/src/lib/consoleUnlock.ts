/**
 * The console is an easter egg, and it stays locked until it's earned. Until
 * something calls `unlockConsole()` below, App.tsx never mounts Console.tsx at
 * all — not hidden with CSS, absent — so the launcher tab, the terminal and
 * the games are all unreachable *and* undownloaded.
 *
 * This module is the whole contract, deliberately trigger-agnostic: whatever
 * the egg turns out to be, it calls `unlockConsole()` and nothing else here
 * changes.
 *
 * Persisted in localStorage rather than sessionStorage on purpose: nobody
 * should have to catch the ship twice just because they closed the tab.
 */
export const CONSOLE_UNLOCK_KEY = "ef-console-unlocked";

// Storage access is wrapped everywhere below: Safari private mode and a few
// hardened browser profiles throw on both read and write.
export function isConsoleUnlocked(): boolean {
    try {
        return localStorage.getItem(CONSOLE_UNLOCK_KEY) === "1";
    } catch {
        return false;
    }
}

/** Same-document `storage` events don't fire, so the unlock is broadcast by
 *  hand — that's what lets the console appear on catch without a reload. */
export const CONSOLE_UNLOCK_EVENT = "ef:console-unlocked";

export function unlockConsole() {
    try {
        localStorage.setItem(CONSOLE_UNLOCK_KEY, "1");
    } catch {
        // Storage refused; the unlock still holds for this page view via the
        // event below, it just won't survive a reload.
    }
    window.dispatchEvent(new Event(CONSOLE_UNLOCK_EVENT));
}
