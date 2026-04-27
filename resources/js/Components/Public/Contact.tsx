import { useEffect, useRef, useState } from "react";
import { useForm } from "@inertiajs/react";
import { useReveal } from "./Hooks.tsx";
import { GithubBlock, LinkedinBlock } from "./Blocks.tsx";

type FieldKey = "name" | "email" | "message";

const SOCIALS = [
    {
        href: "https://github.com/manuto276",
        label: "GitHub",
        Block: GithubBlock,
        top: "12%",
        left: "10%",
        tilt: -7,
        mouse: { x: -34, y: -22 },
        scroll: -90,
        amp: { x: 16, y: 12, r: 4 },
        speed: 2400,
        phase: 0,
    },
    {
        href: "https://linkedin.com/in/efrascella256",
        label: "LinkedIn",
        Block: LinkedinBlock,
        top: "72%",
        left: "48%",
        tilt: 9,
        mouse: { x: 38, y: 28 },
        scroll: -150,
        amp: { x: 18, y: 14, r: 5 },
        speed: 3100,
        phase: 1.6,
    },
];

type SocialCfg = (typeof SOCIALS)[number];

function SocialBlock({
    cfg,
    mouse,
    rel,
}: {
    cfg: SocialCfg;
    mouse: { x: number; y: number };
    rel: number;
}) {
    const [, force] = useState(0);
    useEffect(() => {
        let raf: number;
        const loop = () => {
            force((n) => (n + 1) % 1000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);
    const p = Date.now() / cfg.speed + cfg.phase;
    const driftX = Math.sin(p) * cfg.amp.x;
    const driftY = Math.cos(p * 0.85) * cfg.amp.y;
    const driftR = Math.sin(p * 0.6) * cfg.amp.r;
    const mx = (mouse.x - 0.5) * cfg.mouse.x;
    const my = (mouse.y - 0.5) * cfg.mouse.y + (rel - 0.5) * cfg.scroll;
    const Block = cfg.Block;
    return (
        <a
            href={cfg.href}
            target="_blank"
            rel="noreferrer"
            className="ef-contact-block"
            aria-label={cfg.label}
            data-cursor="link"
            style={{
                top: cfg.top,
                left: cfg.left,
                transform: `translate3d(${mx + driftX}px, ${my + driftY}px, 0) rotate(${cfg.tilt + driftR}deg)`,
            }}
        >
            <Block size={144} color="var(--paper-2)" />
        </a>
    );
}

const TAPE_WORDS = [
    "TRANSMISSION",
    "DRAFT",
    "HANDSHAKE",
    "SECURE LINE",
    "NEW MESSAGE",
    "AWAITING RESPONSE",
    "INK ON PAPER",
    "READY TO RECEIVE",
    "BUFFER OPEN",
    "LET’S TALK",
    "SIGNAL ACQUIRED",
];

function Marquee({ words, speed = 40 }: { words: string[]; speed?: number }) {
    const trackRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let raf: number;
        let offset = 0;
        let last = performance.now();
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            offset -= speed * dt;
            const track = trackRef.current;
            if (track) {
                const half = track.scrollWidth / 2;
                if (half > 0 && offset <= -half) offset += half;
                track.style.transform = `translate3d(${offset}px, 0, 0)`;
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [speed]);

    const row = (
        <div className="ef-cform-tape-row" aria-hidden>
            {words.map((w, i) => (
                <span key={i} className="ef-cform-tape-word">
                    <span className="ef-cform-tape-glyph">※</span>
                    {w}
                </span>
            ))}
        </div>
    );

    return (
        <div className="ef-cform-tape" aria-hidden>
            <div className="ef-cform-tape-track" ref={trackRef}>
                {row}
                {row}
            </div>
        </div>
    );
}

export default function Contact() {
    const [revealRef, shown] = useReveal();
    const sectionRef = useRef<HTMLElement | null>(null);
    const [rel, setRel] = useState(0);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

    const setRefs = (node: HTMLElement | null) => {
        sectionRef.current = node;
        if (revealRef) revealRef.current = node;
    };

    useEffect(() => {
        const onScroll = () => {
            const el = sectionRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = vh + r.height;
            const travelled = vh - r.top;
            setRel(Math.max(0, Math.min(1, travelled / total)));
        };
        const onMove = (e: MouseEvent) => {
            const el = sectionRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setMouse({
                x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("mousemove", onMove, { passive: true });
        onScroll();
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("mousemove", onMove);
        };
    }, []);

    const { data, setData, reset } = useForm({
        name: "",
        email: "",
        message: "",
    });

    const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
    const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
        name: false,
        email: false,
        message: false,
    });

    const update =
        (key: FieldKey) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setData(key, e.target.value);
    const blur = (key: FieldKey) => () =>
        setTouched((t) => ({ ...t, [key]: true }));

    const errors = {
        name:
            data.name.trim().length === 0
                ? null
                : data.name.trim().length < 2
                  ? "Please enter your name"
                  : null,
        email:
            data.email.trim().length === 0
                ? null
                : !/^\S+@\S+\.\S+$/.test(data.email.trim())
                  ? "Please enter a valid email"
                  : null,
        message:
            data.message.trim().length === 0
                ? null
                : data.message.trim().length < 10
                  ? "At least 10 characters"
                  : null,
    };
    const allFilled =
        data.name.trim().length > 0 &&
        data.email.trim().length > 0 &&
        data.message.trim().length > 0;
    const isValid =
        allFilled && !errors.name && !errors.email && !errors.message;

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isValid || status !== "idle") {
            setTouched({ name: true, email: true, message: true });
            return;
        }
        setStatus("sending");
        setTimeout(() => {
            setStatus("sent");
            setTimeout(() => {
                setStatus("idle");
                reset();
                setTouched({ name: false, email: false, message: false });
            }, 3200);
        }, 1100);
    };

    const filled = [data.name, data.email, data.message].filter(
        (v) => v.trim().length > 0,
    ).length;
    const progress = filled / 3;

    return (
        <section
            className={`ef-contact ${shown ? "is-in" : ""}`}
            id="contact"
            ref={setRefs}
            data-screen-label="05 Contact"
            data-cursor-scheme="dark"
        >
            <div className="ef-colophon">
                <span className="ef-label">§ 04 — Colophon</span>
                <div className="ef-colophon-lines ef-mono">
                    <span>Set in Outfit &amp; DM Sans.</span>
                    <span>No trackers, no cookies, no regrets.</span>
                    <span>Built by hand, April 2026.</span>
                </div>
            </div>

            <h2 className="ef-contact-h">
                <span>Let&rsquo;s build</span>
                <span className="ef-contact-h-italic">
                    <em>something</em>
                </span>
                <span className="ef-contact-h-underline">that works.</span>
            </h2>

            <Marquee words={TAPE_WORDS} />

            <div className="ef-contact-row">
                <form className="ef-cform" onSubmit={submit} noValidate>
                    <div className="ef-cform-fields">
                        {/* NAME */}
                        <label
                            className={`ef-cfield ef-cfield--name ${
                                data.name ? "is-filled" : ""
                            } ${touched.name && errors.name ? "is-error" : ""}`}
                        >
                            <span className="ef-cfield-tag ef-mono">
                                <span className="ef-cfield-num">01</span>
                                <span className="ef-label">Name</span>
                            </span>
                            <input
                                type="text"
                                value={data.name}
                                onChange={update("name")}
                                onBlur={blur("name")}
                                placeholder="Your name"
                                autoComplete="name"
                                data-cursor="text"
                            />
                            <span className="ef-cfield-bar" aria-hidden />
                            {touched.name && errors.name && (
                                <span className="ef-mono ef-cfield-err">
                                    ↳ {errors.name}
                                </span>
                            )}
                        </label>

                        {/* EMAIL */}
                        <label
                            className={`ef-cfield ef-cfield--email ${
                                data.email ? "is-filled" : ""
                            } ${touched.email && errors.email ? "is-error" : ""}`}
                        >
                            <span className="ef-cfield-tag ef-mono">
                                <span className="ef-cfield-num">02</span>
                                <span className="ef-label">Email</span>
                            </span>
                            <input
                                type="email"
                                value={data.email}
                                onChange={update("email")}
                                onBlur={blur("email")}
                                placeholder="you@domain.com"
                                autoComplete="email"
                                data-cursor="text"
                            />
                            <span className="ef-cfield-bar" aria-hidden />
                            {touched.email && errors.email && (
                                <span className="ef-mono ef-cfield-err">
                                    ↳ {errors.email}
                                </span>
                            )}
                        </label>

                        {/* MESSAGE */}
                        <label
                            className={`ef-cfield ef-cfield--msg ${
                                data.message ? "is-filled" : ""
                            } ${touched.message && errors.message ? "is-error" : ""}`}
                        >
                            <span className="ef-cfield-tag ef-mono">
                                <span className="ef-cfield-num">03</span>
                                <span className="ef-label">Message</span>
                                <span className="ef-cfield-meta ef-mono">
                                    {String(data.message.length).padStart(
                                        3,
                                        "0",
                                    )}{" "}
                                    ch.
                                </span>
                            </span>
                            <textarea
                                rows={5}
                                value={data.message}
                                onChange={update("message")}
                                onBlur={blur("message")}
                                placeholder="Tell me what you have in mind. Goals, timeline, anything that helps me understand what would be useful…"
                                data-cursor="text"
                            />
                            <span className="ef-cfield-bar" aria-hidden />
                            {touched.message && errors.message && (
                                <span className="ef-mono ef-cfield-err">
                                    ↳ {errors.message}
                                </span>
                            )}
                        </label>
                    </div>

                    {/* footer with progress + send */}
                    <div className="ef-cform-foot">
                        <div className="ef-cform-progress" aria-hidden>
                            <span className="ef-mono ef-label">Signal</span>
                            <span className="ef-cform-bars">
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className={`ef-cform-bar ${
                                            progress > i / 3 ? "is-on" : ""
                                        }`}
                                        style={{
                                            height: `${(i + 1) * 6 + 6}px`,
                                        }}
                                    />
                                ))}
                            </span>
                            <span className="ef-mono ef-cform-progress-num">
                                {Math.round(progress * 100)}%
                            </span>
                        </div>

                        <button
                            type="submit"
                            className={`ef-cform-submit ${
                                status === "sending" ? "is-sending" : ""
                            } ${status === "sent" ? "is-sent" : ""}`}
                            disabled={status !== "idle"}
                            data-cursor="link"
                            data-cursor-label={
                                status === "sent"
                                    ? "Sent"
                                    : status === "sending"
                                      ? "Sending"
                                      : "Send"
                            }
                        >
                            <span className="ef-mono ef-label">↳</span>
                            <span className="ef-cform-submit-label">
                                {status === "sent"
                                    ? "Message sent"
                                    : status === "sending"
                                      ? "Transmitting…"
                                      : "Send message"}
                            </span>
                            <span className="ef-cform-submit-arrow" aria-hidden>
                                {status === "sent" ? "✓" : "→"}
                            </span>
                        </button>
                    </div>
                </form>

                <aside className="ef-contact-aside">
                    {SOCIALS.map((s) => (
                        <SocialBlock
                            key={s.label}
                            cfg={s}
                            mouse={mouse}
                            rel={rel}
                        />
                    ))}
                </aside>
            </div>

            <footer className="ef-foot">
                <div className="ef-mono ef-foot-row">
                    <span>© 2026 Emanuele Frascella</span>
                    <span>
                        All projects remain property of their respective
                        clients.
                    </span>
                    <span>v. 2026.04</span>
                </div>
                <div className="ef-foot-mono" aria-hidden></div>
            </footer>
        </section>
    );
}
