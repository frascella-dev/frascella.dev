import "./Key.css";

// Keycap art converted from public/images/key_{small,medium,large}.svg — the
// same geometry at three widths: an outer skirt, an inner top face with
// front-fold bevels, and a text label set inside the top face. Reusable line
// art; strokes are themed light so it reads on dark surfaces.
const KEY_WIDTH = { small: 128, medium: 256, large: 384 } as const;
export type KeySize = keyof typeof KEY_WIDTH;

export default function Key({
    label,
    size = "small",
    active = false,
}: {
    label: string;
    size?: KeySize;
    active?: boolean;
}) {
    const w = KEY_WIDTH[size];
    const dh = 46; // rendered height in px; width scales with the viewBox
    const dw = (w / 128) * dh;
    return (
        <svg
            className={`ef-key ${active ? "is-active" : ""}`}
            width={dw}
            height={dh}
            viewBox={`0 0 ${w} 128`}
            fill="none"
            aria-hidden
        >
            {/* skirt */}
            <rect className="ef-key-skirt" x="5" y="5" width={w - 10} height="118" rx="23" />
            {/* top face — the label lives inside this rectangle */}
            <rect className="ef-key-face" x="21" y="5" width={w - 42} height="86" rx="15" />
            {/* front-fold bevels */}
            <line className="ef-key-bevel" x1="25.9" y1="86.43" x2="11.9" y2="115.43" />
            <line
                className="ef-key-bevel"
                x1={w - 25.9}
                y1="86.43"
                x2={w - 11.9}
                y2="115.43"
            />
            <text
                className="ef-key-label"
                x={w / 2}
                y="48"
                textAnchor="middle"
                dominantBaseline="central"
            >
                {label}
            </text>
        </svg>
    );
}
