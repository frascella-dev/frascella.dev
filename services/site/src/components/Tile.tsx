import { useRef } from "react";

export function Tile({
    p,
    i,
    idx,
    layout,
    rel,
    mouse,
    focused,
    onFocus,
    onBlur,
    showArrow = true,
    onClose = null,
}) {
    const tileRef = useRef(null);

    const depth = 1 + (i % 3) * 0.4;
    const mouseTx = (mouse.x - 0.5) * 14 * depth;
    const mouseTy = (mouse.y - 0.5) * 10 * depth;
    const scrollTy = (rel - 0.5) * -90 * depth;
    const idle = Math.sin((Date.now() / 2400 + i) % (Math.PI * 2)) * 3;

    const isFocused = focused === p.slug;
    const isDimmed = focused && !isFocused;

    return (
        <div
            ref={tileRef}
            className={`ef-tile ef-tile--${p.tone} ${isFocused ? "is-focused" : ""} ${isDimmed ? "is-dimmed" : ""}`}
            style={{
                gridColumn: `${layout.x} / span ${layout.w}`,
                gridRow: `${layout.y} / span ${layout.h}`,
                transform: `translate3d(${mouseTx}px, ${scrollTy + mouseTy + idle}px, 0) rotate(${layout.tilt}deg)`,
            }}
            onMouseEnter={() => onFocus(p.slug)}
            onMouseLeave={() => onBlur()}
            data-cursor="view"
            data-cursor-label={"View"}
        >
            <span className="ef-tile-pattern" aria-hidden />

            {onClose && (
                <button
                    type="button"
                    className="ef-tile-close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    aria-label="Close"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path
                            d="M6 6l12 12M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="square"
                            fill="none"
                        />
                    </svg>
                </button>
            )}

            <header className="ef-tile-head">
                <span className="ef-mono ef-tile-idx">№ {idx}</span>
                {!onClose && (
                    <span className="ef-mono ef-tile-year">{p.year}</span>
                )}
            </header>

            <div className="ef-tile-body">
                <h3 className="ef-tile-title">{p.title}</h3>
                <p className="ef-tile-tag">{p.tagline}</p>
            </div>

            <footer className="ef-tile-foot">
                {p.metric && (
                    <div className="ef-tile-metric">
                        <strong>{p.metric.n}</strong>
                        <em>{p.metric.l}</em>
                    </div>
                )}
                {showArrow && (
                    <span className="ef-tile-arrow" aria-hidden>
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path
                                d="M5 12h14M13 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                fill="none"
                                strokeLinecap="square"
                            />
                        </svg>
                    </span>
                )}
            </footer>

            <ul className="ef-tile-stack" aria-hidden>
                {(p.stack || []).map((s) => (
                    <li key={s}>{s}</li>
                ))}
            </ul>
        </div>
    );
}
