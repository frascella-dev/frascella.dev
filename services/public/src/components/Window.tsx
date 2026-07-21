import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    IconMinus,
    IconSquare,
    IconMinimize,
    IconX,
} from "@tabler/icons-react";

const ICON = { size: 13, stroke: 1.6 } as const;

export type WindowProps = {
    title: ReactNode;
    /** Called when the close (×) button is pressed. */
    onClose: () => void;
    /** Called when the minimize (–) button is pressed. Omit to hide the button. */
    onMinimize?: () => void;
    /** Controlled: when true the window is kept mounted but hidden. */
    minimized?: boolean;
    /** Stacking order — higher sits on top. Managed by the window host. */
    zIndex?: number;
    /** Raise this window to the top (on open and on any pointer-down). */
    onFocus?: () => void;
    initial?: { width: number; height: number; x?: number; y?: number };
    className?: string;
    children: ReactNode;
};

const MIN_W = 360;
const MIN_H = 220;

/**
 * A draggable, minimizable, maximizable floating window with a site-styled
 * title bar. Deliberately generic — it knows nothing about its contents — so
 * it can host a terminal today and anything else later.
 */
export default function Window({
    title,
    onClose,
    onMinimize,
    minimized = false,
    zIndex,
    onFocus,
    initial,
    className = "",
    children,
}: WindowProps) {
    const width = initial?.width ?? 760;
    const height = initial?.height ?? 460;

    const [pos, setPos] = useState(() => ({
        x:
            initial?.x ??
            Math.max(24, Math.round((window.innerWidth - width) / 2)),
        y:
            initial?.y ??
            Math.max(24, Math.round((window.innerHeight - height) / 3)),
    }));
    const [maximized, setMaximized] = useState(false);

    // Pointer-drag on the title bar. Kept in a ref so the move handler is stable.
    const drag = useRef<{ dx: number; dy: number } | null>(null);

    const onTitlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (maximized) return;
            // don't start a drag from the control buttons
            if ((e.target as HTMLElement).closest("[data-window-control]")) return;
            drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        },
        [maximized, pos.x, pos.y],
    );

    const onTitlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!drag.current) return;
        const x = e.clientX - drag.current.dx;
        const y = e.clientY - drag.current.dy;
        // keep the title bar reachable within the viewport
        const clampedX = Math.min(
            window.innerWidth - 80,
            Math.max(-width + 120, x),
        );
        const clampedY = Math.min(window.innerHeight - 44, Math.max(8, y));
        setPos({ x: clampedX, y: clampedY });
    }, [width]);

    const endDrag = useCallback((e: React.PointerEvent) => {
        drag.current = null;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            /* pointer already released */
        }
    }, []);

    // Esc closes the window.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !minimized) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [minimized, onClose]);

    const style: React.CSSProperties = maximized
        ? { zIndex }
        : {
              left: pos.x,
              top: pos.y,
              width,
              height,
              minWidth: MIN_W,
              minHeight: MIN_H,
              zIndex,
          };

    return (
        <div
            className={`ef-window ${maximized ? "is-max" : ""} ${
                minimized ? "is-min" : ""
            } ${className}`}
            style={style}
            role="dialog"
            aria-label={typeof title === "string" ? title : "Window"}
            // raise to the top when clicked anywhere (bubbles after inner
            // handlers, so it never blocks dragging or terminal input)
            onPointerDown={onFocus}
        >
            <header
                className="ef-window-bar"
                onPointerDown={onTitlePointerDown}
                onPointerMove={onTitlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onDoubleClick={() => setMaximized((m) => !m)}
            >
                <span className="ef-window-title ef-mono">{title}</span>
                <div className="ef-window-controls">
                    {onMinimize && (
                        <button
                            type="button"
                            data-window-control
                            className="ef-window-btn is-min"
                            aria-label="Minimize"
                            onClick={onMinimize}
                        >
                            <IconMinus {...ICON} aria-hidden />
                        </button>
                    )}
                    <button
                        type="button"
                        data-window-control
                        className="ef-window-btn is-max"
                        aria-label={maximized ? "Restore" : "Maximize"}
                        onClick={() => setMaximized((m) => !m)}
                    >
                        {maximized ? (
                            <IconMinimize {...ICON} aria-hidden />
                        ) : (
                            <IconSquare {...ICON} aria-hidden />
                        )}
                    </button>
                    <button
                        type="button"
                        data-window-control
                        className="ef-window-btn is-close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <IconX {...ICON} aria-hidden />
                    </button>
                </div>
            </header>
            {/* dark scheme flips the custom cursor to paper over the terminal,
                the way it inverts in the footer */}
            <div className="ef-window-body" data-cursor-scheme="dark">
                {children}
            </div>
        </div>
    );
}
