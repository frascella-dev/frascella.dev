const BLOCK_VB = "0 0 32 32";

export function QuestionBlock({
    color = "var(--ink)",
    size = 64,
}: {
    color?: string;
    size?: number;
}) {
    return (
        <span className="ef-block-svg-wrap" aria-hidden>
            <svg
                viewBox={BLOCK_VB}
                width={size}
                height={size}
                shapeRendering="crispEdges"
            >
                <g fill={color}>
                    <path d="M29.75,2.25v27.5H.25V2.25h29.5M30,2H0v28h30V2h0Z" />
                    <path d="M29.75.25v29.5H2.25V.25h27.5M30,0H2v30h28V0h0Z" />
                    <g>
                        <rect x="4.12" y="4.12" width="1.75" height="1.75" />
                        <path d="M5.75,4.25v1.5h-1.5v-1.5h1.5M6,4h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="26.12" y="4.12" width="1.75" height="1.75" />
                        <path d="M27.75,4.25v1.5h-1.5v-1.5h1.5M28,4h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="4.12" y="26.12" width="1.75" height="1.75" />
                        <path d="M5.75,26.25v1.5h-1.5v-1.5h1.5M6,26h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="26.12" y="26.12" width="1.75" height="1.75" />
                        <path d="M27.75,26.25v1.5h-1.5v-1.5h1.5M28,26h-2v2h2v-2h0Z" />
                    </g>
                    <path d="M18.75,6.25v2h2v8.5h-4v2h-1.5v-3.5h2v-7.5h-5.5v7h-3.5v-6.5h2v-2h8.5M19,6h-9v2h-2v7h4v-7h5v7h-2v4h2v-2h4v-9h-2v-2h0Z" />
                    <g>
                        <polygon points="10.12 16.88 10.12 15.12 12.12 15.12 12.12 8.12 16.88 8.12 16.88 9.88 13.88 9.88 13.88 16.88 10.12 16.88" />
                        <path d="M16.75,8.25v1.5h-3v7h-3.5v-1.5h2v-7h4.5M17,8h-5v7h-2v2h4v-7h3v-2h0Z" />
                    </g>
                    <g>
                        <polygon points="17.12 20.88 17.12 17.12 21.12 17.12 21.12 10.12 22.88 10.12 22.88 18.88 18.88 18.88 18.88 20.88 17.12 20.88" />
                        <path d="M22.75,10.25v8.5h-4v2h-1.5v-3.5h4v-7h1.5M23,10h-2v7h-4v4h2v-2h4v-9h0Z" />
                    </g>
                    <g>
                        <polygon points="17.12 26.88 17.12 25.12 19.12 25.12 19.12 23.12 20.88 23.12 20.88 26.88 17.12 26.88" />
                        <path d="M20.75,23.25v3.5h-3.5v-1.5h2v-2h1.5M21,23h-2v2h-2v2h4v-4h0Z" />
                    </g>
                    <path d="M18.75,21.25v3.5h-3.5v-3.5h3.5M19,21h-4v4h4v-4h0Z" />
                    <g>
                        <polygon points="2.12 31.88 2.12 30.12 30.12 30.12 30.12 2.12 31.88 2.12 31.88 31.88 2.12 31.88" />
                        <path d="M31.75,2.25v29.5H2.25v-1.5h28V2.25h1.5M32,2h-2v28H2v2h30V2h0Z" />
                    </g>
                </g>
            </svg>
        </span>
    );
}

export function GithubBlock({
    color = "currentColor",
    size = 64,
}: {
    color?: string;
    size?: number;
}) {
    return (
        <span className="ef-block-svg-wrap" aria-hidden>
            <svg
                viewBox={BLOCK_VB}
                width={size}
                height={size}
                shapeRendering="crispEdges"
            >
                <g fill={color}>
                    <path d="M29.75,2.25v27.5H.25V2.25h29.5M30,2H0v28h30V2h0Z" />
                    <path d="M29.75.25v29.5H2.25V.25h27.5M30,0H2v30h28V0h0Z" />
                    <g>
                        <rect x="4.12" y="4.12" width="1.75" height="1.75" />
                        <path d="M5.75,4.25v1.5h-1.5v-1.5h1.5M6,4h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="26.12" y="4.12" width="1.75" height="1.75" />
                        <path d="M27.75,4.25v1.5h-1.5v-1.5h1.5M28,4h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="4.12" y="26.12" width="1.75" height="1.75" />
                        <path d="M5.75,26.25v1.5h-1.5v-1.5h1.5M6,26h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="26.12" y="26.12" width="1.75" height="1.75" />
                        <path d="M27.75,26.25v1.5h-1.5v-1.5h1.5M28,26h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <polygon points="2.12 31.88 2.12 30.12 30.12 30.12 30.12 2.12 31.88 2.12 31.88 31.88 2.12 31.88" />
                        <path d="M31.75,2.25v29.5H2.25v-1.5h28V2.25h1.5M32,2h-2v28H2v2h30V2h0Z" />
                    </g>
                    <g>
                        <rect x="13.12" y="18.12" width=".75" height=".75" />
                        <path d="M13.75,18.25v.5h-.5v-.5h.5M14,18h-1v1h1v-1h0Z" />
                    </g>
                    <g>
                        <polygon points="12.12 22.88 12.12 21.88 11.12 21.88 11.12 21.12 12.88 21.12 12.88 22.12 13.88 22.12 13.88 22.88 12.12 22.88" />
                        <path d="M12.75,21.25v1h1v.5h-1.5v-1h-1v-.5h1.5M13,21h-2v1h1v1h2v-1h-1v-1h0Z" />
                    </g>
                    <g>
                        <polygon points="16.12 24.88 16.12 23.88 15.12 23.88 15.12 23.12 19.12 23.12 19.12 18.88 18.12 18.88 18.12 18.12 20.12 18.12 20.12 17.12 21.12 17.12 21.12 16.12 22.12 16.12 22.12 10.12 22.88 10.12 22.88 13.12 23.88 13.12 23.88 17.88 22.88 17.88 22.88 18.88 21.88 18.88 21.88 19.88 19.88 19.88 19.88 21.12 20.88 21.12 20.88 24.88 16.12 24.88" />
                        <path d="M22.75,10.25v3h1v4.5h-1v1h-1v1h-2v1.5h1v3.5h-4.5v-1h-1v-.5h4v-4.5h-1v-.5h2v-1h1v-1h1v-6h.5M23,10h-1v6h-1v1h-1v1h-2v1h1v4h-4v1h1v1h5v-4h-1v-1h2v-1h1v-1h1v-5h-1v-3h0Z" />
                    </g>
                    <path d="M20.75,8.25v3h1v4.5h-1v1h-1v1h-2v1.5h1v3.5h-4.5v-1h-1v-1h-3v-1h-1v-1.5h.5v1h1v1h3.5v-2.5h-2v-1h-1v-1h-1v-4.5h1v-3h.5v1h8.5v-1h.5M21,8h-1v1h-8v-1h-1v3h-1v5h1v1h1v1h2v2h-3v-1h-1v-1h-1v2h1v1h3v1h1v1h5v-4h-1v-1h2v-1h1v-1h1v-5h-1v-3h0Z" />
                </g>
            </svg>
        </span>
    );
}

export function LinkedinBlock({
    color = "currentColor",
    size = 64,
}: {
    color?: string;
    size?: number;
}) {
    return (
        <span className="ef-block-svg-wrap" aria-hidden>
            <svg
                viewBox={BLOCK_VB}
                width={size}
                height={size}
                shapeRendering="crispEdges"
            >
                <g fill={color}>
                    <path d="M29.75,2.25v27.5H.25V2.25h29.5M30,2H0v28h30V2h0Z" />
                    <path d="M29.75.25v29.5H2.25V.25h27.5M30,0H2v30h28V0h0Z" />
                    <g>
                        <rect x="4.12" y="4.12" width="1.75" height="1.75" />
                        <path d="M5.75,4.25v1.5h-1.5v-1.5h1.5M6,4h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="26.12" y="4.12" width="1.75" height="1.75" />
                        <path d="M27.75,4.25v1.5h-1.5v-1.5h1.5M28,4h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="4.12" y="26.12" width="1.75" height="1.75" />
                        <path d="M5.75,26.25v1.5h-1.5v-1.5h1.5M6,26h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <rect x="26.12" y="26.12" width="1.75" height="1.75" />
                        <path d="M27.75,26.25v1.5h-1.5v-1.5h1.5M28,26h-2v2h2v-2h0Z" />
                    </g>
                    <g>
                        <polygon points="2.12 31.88 2.12 30.12 30.12 30.12 30.12 2.12 31.88 2.12 31.88 31.88 2.12 31.88" />
                        <path d="M31.75,2.25v29.5H2.25v-1.5h28V2.25h1.5M32,2h-2v28H2v2h30V2h0Z" />
                    </g>
                    <path d="M10.75,8.25v2.5h-2.5v-2.5h2.5M11,8h-3v3h3v-3h0Z" />
                    <path d="M10.75,13.25v9.5h-2.5v-9.5h2.5M11,13h-3v10h3v-10h0Z" />
                    <path d="M21.75,13.25v1h1v8.5h-2.5v-7h-3.5v7h-2.5v-9.5h2.5v1h1.5v-1h3.5M22,13h-4v1h-1v-1h-3v10h3v-7h3v7h3v-9h-1v-1h0Z" />
                    <g>
                        <polygon points="10.12 12.88 10.12 11.12 11.12 11.12 11.12 10.12 12.88 10.12 12.88 12.88 10.12 12.88" />
                        <path d="M12.75,10.25v2.5h-2.5v-1.5h1v-1h1.5M13,10h-2v1h-1v2h3v-3h0Z" />
                    </g>
                    <g>
                        <polygon points="10.12 24.88 10.12 23.12 11.12 23.12 11.12 15.12 12.88 15.12 12.88 24.88 10.12 24.88" />
                        <path d="M12.75,15.25v9.5h-2.5v-1.5h1v-8h1.5M13,15h-2v8h-1v2h3v-10h0Z" />
                    </g>
                    <g>
                        <polygon points="16.12 24.88 16.12 23.12 17.12 23.12 17.12 16.12 19.88 16.12 19.88 17.88 18.88 17.88 18.88 24.88 16.12 24.88" />
                        <path d="M19.75,16.25v1.5h-1v7h-2.5v-1.5h1v-7h2.5M20,16h-3v7h-1v2h3v-7h1v-2h0Z" />
                    </g>
                    <g>
                        <polygon points="22.12 24.88 22.12 23.12 23.12 23.12 23.12 15.12 23.88 15.12 23.88 16.12 24.88 16.12 24.88 24.88 22.12 24.88" />
                        <path d="M23.75,15.25v1h1v8.5h-2.5v-1.5h1v-8h.5M24,15h-1v8h-1v2h3v-9h-1v-1h0Z" />
                    </g>
                </g>
            </svg>
        </span>
    );
}
