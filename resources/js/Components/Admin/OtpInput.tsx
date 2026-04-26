import {
    forwardRef,
    useImperativeHandle,
    useRef,
    type ChangeEvent,
    type ClipboardEvent,
    type KeyboardEvent,
} from "react";
import Box from "@mui/joy/Box";
import Input from "@mui/joy/Input";

export type OtpInputHandle = {
    focus: () => void;
};

export type OtpInputProps = {
    length?: number;
    value?: string;
    onChange?: (next: string) => void;
    autoFocus?: boolean;
    disabled?: boolean;
    error?: boolean;
    name?: string;
};

const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
    {
        length = 6,
        value = "",
        onChange,
        autoFocus = false,
        disabled = false,
        error = false,
        name = "otp",
    },
    ref,
) {
    const inputs = useRef<Array<HTMLInputElement | null>>([]);
    const digits = value.replace(/\D/g, "").slice(0, length);

    const focusAt = (idx: number) => {
        const clamped = Math.max(0, Math.min(idx, length - 1));
        inputs.current[clamped]?.focus();
    };

    useImperativeHandle(ref, () => ({
        focus: () => focusAt(0),
    }));

    const emit = (next: string) =>
        onChange?.(next.replace(/\D/g, "").slice(0, length));

    const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            if (digits[i]) {
                const next = digits.slice(0, i) + digits.slice(i + 1);
                emit(next);
            } else if (i > 0) {
                const next = digits.slice(0, i - 1) + digits.slice(i);
                emit(next);
                focusAt(i - 1);
            }
            return;
        }

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            if (i > 0) focusAt(i - 1);
            return;
        }

        if (e.key === "ArrowRight") {
            e.preventDefault();
            if (i < length - 1) focusAt(i + 1);
            return;
        }

        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            let next: string;
            if (i < digits.length) {
                next = digits.slice(0, i) + e.key + digits.slice(i + 1);
            } else if (digits.length < length) {
                next = digits + e.key;
            } else {
                return;
            }
            emit(next);
            if (i < length - 1) focusAt(i + 1);
        }
    };

    const handleChange = (
        _i: number,
        e: ChangeEvent<HTMLInputElement>,
    ) => {
        // Handles autofill (iOS SMS, password manager) injecting the full
        // code into a single slot — single keystrokes go through keydown.
        const raw = e.target.value.replace(/\D/g, "");
        if (raw.length > 1) {
            emit(raw.slice(0, length));
            focusAt(Math.min(raw.length, length - 1));
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        const text = (e.clipboardData?.getData("text") ?? "")
            .replace(/\D/g, "")
            .slice(0, length);
        if (!text) return;
        e.preventDefault();
        emit(text);
        focusAt(Math.min(text.length, length - 1));
    };

    return (
        <Box
            sx={{
                display: "flex",
                gap: 0.75,
                justifyContent: "center",
            }}
        >
            {Array.from({ length }, (_, i) => (
                <Input
                    key={i}
                    color={error ? "danger" : "neutral"}
                    disabled={disabled}
                    value={digits[i] ?? ""}
                    onChange={(e) => handleChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select?.()}
                    autoFocus={autoFocus && i === 0}
                    slotProps={{
                        input: {
                            ref: (el: HTMLInputElement | null) => {
                                inputs.current[i] = el;
                            },
                            inputMode: "numeric",
                            pattern: "[0-9]*",
                            autoComplete: i === 0 ? "one-time-code" : "off",
                            "aria-label": `Digit ${i + 1} of ${length}`,
                            name: `${name}-${i}`,
                        },
                    }}
                    sx={{
                        width: "4ch",
                        "& input": {
                            textAlign: "center",
                        },
                    }}
                />
            ))}
        </Box>
    );
});

export default OtpInput;
