import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import axios from "axios";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";

import AdminLayout from "../../Layouts/AdminLayout.tsx";
import Logo from "@/Components/Public/Logo.tsx";
import ColorSchemeToggle from "@/Components/Admin/ColorSchemeToggle.tsx";
import OtpInput from "@/Components/Admin/OtpInput.tsx";
import { api, fieldErrors } from "@/utils/api.ts";
import type {
    FieldErrors,
    RegisterPageProps,
    RegisterResponse,
} from "@/types.ts";

type FormData = {
    name: string;
    password: string;
    password_confirmation: string;
    code: string;
};

export default function Register() {
    const { token, email, twoFactor, expiresAt, minPasswordLength } =
        usePage<RegisterPageProps>().props;

    const [data, setData] = useState<FormData>({
        name: "",
        password: "",
        password_confirmation: "",
        code: "",
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [processing, setProcessing] = useState(false);

    const setField =
        <K extends keyof FormData>(key: K) =>
        (e: ChangeEvent<HTMLInputElement>) =>
            setData((p) => ({ ...p, [key]: e.target.value }));

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        setErrors({});
        try {
            const { data: result } = await api.post<RegisterResponse>(
                `/api/admin/register/${token}`,
                {
                    name: data.name,
                    password: data.password,
                    password_confirmation: data.password_confirmation,
                    code: data.code,
                },
            );
            router.visit(result.next || "/admin/login");
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
                setErrors({ name: message });
            }
            setProcessing(false);
        }
    };

    const expiresLabel = (() => {
        try {
            return new Date(expiresAt).toLocaleString();
        } catch {
            return expiresAt;
        }
    })();

    return (
        <AdminLayout>
            <Head title="Admin · Set up account" />
            <Box
                sx={(theme) => ({
                    width: "100%",
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
                        <Logo />
                        <ColorSchemeToggle />
                    </Box>
                    <Box
                        component="main"
                        sx={{
                            my: "auto",
                            py: 2,
                            pb: 5,
                            width: 480,
                            maxWidth: "100%",
                            mx: "auto",
                        }}
                    >
                        <Stack spacing={3}>
                            <Stack spacing={1}>
                                <Typography
                                    level="h3"
                                    sx={{ fontFamily: "display" }}
                                >
                                    Set up your admin account
                                </Typography>
                                <Typography level="body-sm" color="neutral">
                                    Choose a password and enroll your
                                    authenticator. Link expires {expiresLabel}.
                                </Typography>
                            </Stack>

                            <Card variant="outlined">
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography level="title-sm">
                                            Step 1 — Scan the QR
                                        </Typography>
                                        <Typography
                                            level="body-xs"
                                            color="neutral"
                                        >
                                            Use Google Authenticator, 1Password,
                                            Authy, etc.
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 220,
                                                bgcolor: "common.white",
                                                p: 1,
                                                borderRadius: "sm",
                                                boxShadow: "sm",
                                            }}
                                        >
                                            <img
                                                src={twoFactor.qr}
                                                alt="2FA QR code"
                                                style={{
                                                    width: "100%",
                                                    height: "auto",
                                                    display: "block",
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                    <Typography
                                        level="body-xs"
                                        sx={{
                                            textAlign: "center",
                                            wordBreak: "break-all",
                                            fontFamily: "code",
                                            color: "text.tertiary",
                                        }}
                                    >
                                        {twoFactor.uri}
                                    </Typography>
                                </Stack>
                            </Card>

                            <Card
                                variant="outlined"
                                component="form"
                                onSubmit={submit}
                            >
                                <Box>
                                    <Typography level="title-sm">
                                        Step 2 — Account details
                                    </Typography>
                                </Box>
                                <Divider />
                                <Stack spacing={2} sx={{ my: 1 }}>
                                    <FormControl>
                                        <FormLabel>Email</FormLabel>
                                        <Input
                                            size="sm"
                                            value={email}
                                            readOnly
                                            disabled
                                        />
                                    </FormControl>
                                    <FormControl error={!!errors.name}>
                                        <FormLabel>Name</FormLabel>
                                        <Input
                                            size="sm"
                                            autoComplete="name"
                                            value={data.name}
                                            onChange={setField("name")}
                                            placeholder="Mario Rossi"
                                            autoFocus
                                        />
                                        {errors.name && (
                                            <FormHelperText>
                                                {errors.name}
                                            </FormHelperText>
                                        )}
                                    </FormControl>
                                    <FormControl error={!!errors.password}>
                                        <FormLabel>Password</FormLabel>
                                        <Input
                                            size="sm"
                                            type="password"
                                            autoComplete="new-password"
                                            value={data.password}
                                            onChange={setField("password")}
                                        />
                                        <FormHelperText>
                                            {errors.password ??
                                                `At least ${minPasswordLength} characters.`}
                                        </FormHelperText>
                                    </FormControl>
                                    <FormControl
                                        error={!!errors.password_confirmation}
                                    >
                                        <FormLabel>Confirm password</FormLabel>
                                        <Input
                                            size="sm"
                                            type="password"
                                            autoComplete="new-password"
                                            value={data.password_confirmation}
                                            onChange={setField(
                                                "password_confirmation",
                                            )}
                                        />
                                        {errors.password_confirmation && (
                                            <FormHelperText>
                                                {errors.password_confirmation}
                                            </FormHelperText>
                                        )}
                                    </FormControl>
                                    <FormControl error={!!errors.code}>
                                        <FormLabel>
                                            Authenticator code
                                        </FormLabel>
                                        <OtpInput
                                            value={data.code}
                                            onChange={(next) =>
                                                setData((p) => ({
                                                    ...p,
                                                    code: next,
                                                }))
                                            }
                                            error={!!errors.code}
                                            disabled={processing}
                                        />
                                        {errors.code && (
                                            <FormHelperText
                                                sx={{
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {errors.code}
                                            </FormHelperText>
                                        )}
                                    </FormControl>
                                    {errors.email && (
                                        <Alert color="danger" variant="soft">
                                            {errors.email}
                                        </Alert>
                                    )}
                                </Stack>
                                <Button
                                    type="submit"
                                    fullWidth
                                    loading={processing}
                                >
                                    Create account
                                </Button>
                            </Card>
                        </Stack>
                    </Box>
                </Box>
            </Box>
        </AdminLayout>
    );
}
