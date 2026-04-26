import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Head, router } from "@inertiajs/react";
import axios from "axios";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import AdminLayout from "../../Layouts/AdminLayout.tsx";
import Logo from "@/Components/Public/Logo.tsx";
import OtpInput, {
    type OtpInputHandle,
} from "@/Components/Admin/OtpInput.tsx";
import ColorSchemeToggle from "@/Components/Admin/ColorSchemeToggle.tsx";
import { api, fieldErrors } from "@/utils/api.ts";
import type { FieldErrors, TwoFactorResponse } from "@/types.ts";

export default function TwoFactor() {
    const [code, setCode] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [processing, setProcessing] = useState(false);
    const inputRef = useRef<OtpInputHandle | null>(null);

    const submit = async () => {
        if (processing) return;
        setProcessing(true);
        setErrors({});
        try {
            const { data: result } = await api.post<TwoFactorResponse>(
                "/api/admin/2fa",
                { code },
            );
            router.visit(result.next || "/admin/dashboard");
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 410) {
                const next =
                    (err.response.data?.next as string | undefined) ??
                    "/admin/login";
                router.visit(next);
                return;
            }
            if (axios.isAxiosError(err) && err.response?.status === 422) {
                setErrors(fieldErrors(err));
            } else {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Something went wrong. Try again.";
                setErrors({ code: message });
            }
            setCode("");
            setProcessing(false);
            inputRef.current?.focus();
        }
    };

    // Auto-submit the moment we have 6 digits — the OTP flow should feel
    // instantaneous and users shouldn't need to press Enter.
    useEffect(() => {
        if (code.length === 6 && /^\d{6}$/.test(code) && !processing) {
            submit();
        }
    }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        submit();
    };

    return (
        <AdminLayout>
            <Head title="Admin · 2FA" />
            <Box
                sx={(theme) => ({
                    width: "100%",
                    transition: "width var(--Transition-duration)",
                    transitionDelay: "calc(var(--Transition-duration) + 0.1s)",
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    justifyContent: "flex-end",
                    backdropFilter: "blur(12px)",
                    backgroundColor: "rgba(255 255 255 / 0.2)",
                    [theme.getColorSchemeSelector("dark")]: {
                        backgroundColor: "rgba(19 19 24 / 0.4)",
                    },
                })}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "100dvh",
                        width: "100%",
                        px: 2,
                    }}
                >
                    <Box
                        component="header"
                        sx={{
                            py: 3,
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <Box
                            sx={{
                                gap: 2,
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Logo />
                        </Box>
                        <ColorSchemeToggle />
                    </Box>
                    <Box
                        component="main"
                        sx={{
                            my: "auto",
                            py: 2,
                            pb: 5,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            width: 400,
                            maxWidth: "100%",
                            mx: "auto",
                            borderRadius: "sm",
                            "& form": {
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                            },
                            [`& .MuiFormLabel-asterisk`]: {
                                visibility: "hidden",
                            },
                        }}
                    >
                        <Stack sx={{ gap: 1 }}>
                            <Typography
                                level="h3"
                                sx={{ fontFamily: "display" }}
                            >
                                Verification code
                            </Typography>
                            <Typography level="body-sm" color="neutral">
                                Enter the 6-digit code shown in your
                                authenticator app.
                            </Typography>
                        </Stack>
                        <Stack sx={{ gap: 4, mt: 2 }}>
                            <form onSubmit={onSubmit} noValidate>
                                <FormControl required error={!!errors.code}>
                                    <OtpInput
                                        ref={inputRef}
                                        value={code}
                                        onChange={setCode}
                                        error={!!errors.code}
                                        disabled={processing}
                                        autoFocus
                                    />
                                    {errors.code && (
                                        <FormHelperText>
                                            {errors.code}
                                        </FormHelperText>
                                    )}
                                </FormControl>
                                <Stack sx={{ gap: 4, mt: 2 }}>
                                    <Button
                                        type="submit"
                                        fullWidth
                                        loading={processing}
                                    >
                                        Verify
                                    </Button>
                                </Stack>
                            </form>
                        </Stack>
                    </Box>
                    <Box component="footer" sx={{ py: 3 }}>
                        <Typography
                            level="body-xs"
                            sx={{ textAlign: "center" }}
                        >
                            © Emanuele Frascella {new Date().getFullYear()}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </AdminLayout>
    );
}
