import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
    IconAlertTriangle,
    IconCheck,
    IconX,
} from "@tabler/icons-react";

export type ToastState = {
    kind: "success" | "error";
    message: string;
} | null;

export function Toast({
    toast,
    onClose,
    duration = 4500,
}: {
    toast: ToastState;
    onClose: () => void;
    duration?: number;
}) {
    useEffect(() => {
        if (!toast) return;
        const id = window.setTimeout(onClose, duration);
        return () => window.clearTimeout(id);
    }, [toast, onClose, duration]);

    if (!toast) return null;

    return createPortal(
        <div
            className={`ef-toast ef-toast--${toast.kind}`}
            role="status"
            aria-live="polite"
        >
            <span className="ef-toast-glyph" aria-hidden>
                {toast.kind === "success" ? (
                    <IconCheck size={14} stroke={2.4} />
                ) : (
                    <IconAlertTriangle size={14} stroke={2.4} />
                )}
            </span>
            <span className="ef-toast-msg">{toast.message}</span>
            <button
                type="button"
                className="ef-toast-close"
                onClick={onClose}
                aria-label="Dismiss"
            >
                <IconX size={18} stroke={1.6} />
            </button>
        </div>,
        document.body,
    );
}
