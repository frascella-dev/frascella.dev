import { useState } from "react";
import { useReveal, useMagnetic } from "./Hooks.tsx";

export default function Contact() {
    const [revealRef, shown] = useReveal();
    const [copied, setCopied] = useState(false);
    const email = "emanuele@frascella.dev";

    const magRef1 = useMagnetic<HTMLAnchorElement>(0.25);
    const magRef2 = useMagnetic<HTMLAnchorElement>(0.25);
    const magRef3 = useMagnetic<HTMLAnchorElement>(0.25);

    const copy = () => {
        navigator.clipboard?.writeText(email);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    return (
        <section
            className={`ef-contact ${shown ? "is-in" : ""}`}
            id="contact"
            ref={revealRef}
            data-screen-label="05 Contact"
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

            <div className="ef-contact-row">
                <button
                    className="ef-contact-email"
                    onClick={copy}
                    data-cursor="link"
                    data-cursor-label={copied ? "Copied" : "Click to copy"}
                >
                    <span className="ef-mono ef-label">Write</span>
                    <span className="ef-contact-email-main">{email}</span>
                    <span
                        className={`ef-copied ef-mono ${copied ? "is-in" : ""}`}
                    >
                        {copied ? "✓ copied" : "↳ copy"}
                    </span>
                </button>

                <div className="ef-contact-links">
                    <a
                        ref={magRef1}
                        href="https://github.com/manuto276"
                        target="_blank"
                        rel="noreferrer"
                        data-cursor="link"
                    >
                        <span className="ef-mono ef-label">01</span>
                        <span>GitHub</span>
                        <span aria-hidden>↗</span>
                    </a>
                    <a
                        ref={magRef2}
                        href="https://www.linkedin.com/in/efrascella256/"
                        target="_blank"
                        rel="noreferrer"
                        data-cursor="link"
                    >
                        <span className="ef-mono ef-label">02</span>
                        <span>LinkedIn</span>
                        <span aria-hidden>↗</span>
                    </a>
                    <a
                        ref={magRef3}
                        href={`mailto:${email}`}
                        data-cursor="link"
                    >
                        <span className="ef-mono ef-label">03</span>
                        <span>Email</span>
                        <span aria-hidden>↗</span>
                    </a>
                </div>
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
