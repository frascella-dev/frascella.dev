import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

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
