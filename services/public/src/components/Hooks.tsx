import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import {
    CONSOLE_UNLOCK_EVENT,
    isConsoleUnlocked,
} from "../lib/consoleUnlock.ts";

// Intersection-based reveal
export function useReveal<T extends HTMLElement = HTMLElement>(
    options: IntersectionObserverInit = {},
): [RefObject<T | null>, boolean] {
    const ref = useRef<T | null>(null);
    const [shown, setShown] = useState(false);
    useEffect(() => {
        if (!ref.current) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    io.disconnect();
                }
            },
            { threshold: 0.18, ...options },
        );
        io.observe(ref.current);
        return () => io.disconnect();
    }, []);
    return [ref, shown];
}

// Magnetic pull toward element center
export function useMagnetic<T extends HTMLElement = HTMLElement>(
    strength = 0.35,
): RefObject<T | null> {
    const ref = useRef<T | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onMove = (e: MouseEvent) => {
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dx = (e.clientX - cx) * strength;
            const dy = (e.clientY - cy) * strength;
            el.style.transform = `translate(${dx}px, ${dy}px)`;
        };
        const onLeave = () => {
            el.style.transform = "translate(0,0)";
        };
        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
        return () => {
            el.removeEventListener("mousemove", onMove);
            el.removeEventListener("mouseleave", onLeave);
        };
    }, [strength]);
    return ref;
}

// Scramble / shuffle text
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*<>/\\[]{}=+-";
export function useScramble(
    target: string,
    { duration = 1200, delay = 0 }: { duration?: number; delay?: number } = {},
): string {
    const [out, setOut] = useState("");
    useEffect(() => {
        let raf: number;
        let start: number | undefined;
        const t0 = performance.now() + delay;
        const step = (now: number) => {
            if (now < t0) {
                raf = requestAnimationFrame(step);
                return;
            }
            if (!start) start = now;
            const p = Math.min(1, (now - start) / duration);
            let s = "";
            for (let i = 0; i < target.length; i++) {
                const reveal = p * target.length;
                if (i < reveal - 2) s += target[i];
                else if (target[i] === " ") s += " ";
                else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
            setOut(s);
            if (p < 1) raf = requestAnimationFrame(step);
            else setOut(target);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration, delay]);
    return out;
}

// Scroll position
export function useScrollY(): number {
    const [y, setY] = useState(0);
    useEffect(() => {
        const onScroll = () => setY(window.scrollY);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return y;
}

/**
 * True only on a real desktop: a wide viewport AND a precise primary pointer.
 *
 * Gates the console and everything downstream of it (the xterm terminal, the
 * shell, the games). Width alone isn't enough — a landscape tablet clears
 * 1024px but has no keyboard, and a terminal you can't type into is worse
 * than no terminal. `pointer: fine` is the honest test for "there is a mouse
 * and, in practice, a keyboard"; laptops with touchscreens still report fine
 * for their primary pointer, so they're correctly included.
 *
 * Re-evaluated on change, so rotating a tablet or resizing a window takes
 * effect immediately rather than being frozen at first paint.
 */
const DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine)";

export function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia(DESKTOP_QUERY).matches,
    );
    useEffect(() => {
        const mq = window.matchMedia(DESKTOP_QUERY);
        const on = () => setIsDesktop(mq.matches);
        mq.addEventListener("change", on);
        on();
        return () => mq.removeEventListener("change", on);
    }, []);
    return isDesktop;
}

/**
 * True once the console easter egg has been unlocked (see lib/consoleUnlock).
 *
 * Reads localStorage once, then follows the in-page unlock event, so catching
 * the ship reveals the console immediately instead of on the next reload. The
 * cross-tab `storage` event is honoured too — cheap, and it keeps a second tab
 * of the site honest.
 */
export function useConsoleUnlocked(): boolean {
    const [unlocked, setUnlocked] = useState(isConsoleUnlocked);
    useEffect(() => {
        if (unlocked) return;
        // The in-page event latches unconditionally: the catch happened here,
        // so it counts even if localStorage refused the write.
        const onUnlock = () => setUnlocked(true);
        const onStorage = () => setUnlocked(isConsoleUnlocked());
        window.addEventListener(CONSOLE_UNLOCK_EVENT, onUnlock);
        window.addEventListener("storage", onStorage);
        onStorage();
        return () => {
            window.removeEventListener(CONSOLE_UNLOCK_EVENT, onUnlock);
            window.removeEventListener("storage", onStorage);
        };
    }, [unlocked]);
    return unlocked;
}

// Clock (for live time)
export function useClock(tz = "Europe/Rome"): string {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const fmt = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: tz,
    });
    return fmt.format(now);
}
