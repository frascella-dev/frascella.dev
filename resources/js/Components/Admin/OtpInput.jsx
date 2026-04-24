import { forwardRef, useImperativeHandle, useRef } from "react";
import Box from "@mui/joy/Box";
import Input from "@mui/joy/Input";

const OtpInput = forwardRef(function OtpInput(
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
    const inputs = useRef([]);
    const digits = value.replace(/\D/g, "").slice(0, length);

    const focusAt = (idx) => {
        const clamped = Math.max(0, Math.min(idx, length - 1));
        inputs.current[clamped]?.focus();
    };

    useImperativeHandle(ref, () => ({
        focus: () => focusAt(0),
    }));

    const emit = (next) => onChange?.(next.replace(/\D/g, "").slice(0, length));

    const handleKeyDown = (i, e) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            if (digits[i]) {
                // Cancella la cifra nella posizione corrente
                const next = digits.slice(0, i) + digits.slice(i + 1);
                emit(next);
            } else if (i > 0) {
                // Slot vuoto: torna indietro e cancella il precedente
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
            let next;
            if (i < digits.length) {
                // Sostituisci la cifra esistente allo slot i
                next = digits.slice(0, i) + e.key + digits.slice(i + 1);
            } else if (digits.length < length) {
                // Appendi (siamo alla fine)
                next = digits + e.key;
            } else {
                return; // Tutti gli slot pieni
            }
            emit(next);
            if (i < length - 1) focusAt(i + 1);
        }
    };

    const handleChange = (_i, e) => {
        // Gestisce solo autofill (iOS SMS, password manager)
        // che iniettano il codice completo in un singolo slot
        const raw = e.target.value.replace(/\D/g, "");
        if (raw.length > 1) {
            emit(raw.slice(0, length));
            focusAt(Math.min(raw.length, length - 1));
        }
        // Le cifre singole sono già gestite da handleKeyDown
    };

    const handlePaste = (e) => {
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
                            ref: (el) => (inputs.current[i] = el),
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
