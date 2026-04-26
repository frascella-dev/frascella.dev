import { Head, router } from "@inertiajs/react";
import * as React from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import AdminLayout from "../../Layouts/AdminLayout.tsx";
import Logo from "@/Components/Public/Logo.tsx";
import ColorSchemeToggle from "@/Components/Admin/ColorSchemeToggle.tsx";
import { api, fieldErrors } from "@/utils/api.ts";
import type { FieldErrors, LoginResponse } from "@/types.ts";

type LoginData = {
    email: string;
    password: string;
    remember: boolean;
};

export default function Login() {
    const [data, setData] = React.useState<LoginData>({
        email: "",
        password: "",
        remember: false,
    });
    const [errors, setErrors] = React.useState<FieldErrors>({});
    const [processing, setProcessing] = React.useState(false);

    const setField =
        <K extends keyof LoginData>(key: K) =>
        (e: ChangeEvent<HTMLInputElement>) => {
            const value =
                key === "remember" ? e.target.checked : e.target.value;
            setData((prev) => ({ ...prev, [key]: value }) as LoginData);
        };

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        setErrors({});
        try {
            const { data: result } = await api.post<LoginResponse>(
                "/api/admin/login",
                data,
            );
            router.visit(result.next || "/admin/2fa");
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 422) {
                setErrors(fieldErrors(err));
            } else {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Something went wrong. Try again.";
                setErrors({ email: message });
            }
            setProcessing(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Admin · Login" />
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
                        <Stack sx={{ gap: 4, mt: 2 }}>
                            <Stack sx={{ gap: 1 }}>
                                <Typography component="h1" level="h3">
                                    Sign in
                                </Typography>
                                <Typography level="body-sm">
                                    Enter your email and password to access the
                                    admin dashboard.
                                </Typography>
                            </Stack>
                            <form onSubmit={submit} noValidate>
                                <FormControl required error={!!errors.email}>
                                    <FormLabel>Email</FormLabel>
                                    <Input
                                        type="email"
                                        name="email"
                                        autoComplete="username"
                                        autoFocus
                                        value={data.email}
                                        onChange={setField("email")}
                                    />
                                    {errors.email && (
                                        <FormHelperText>
                                            {errors.email}
                                        </FormHelperText>
                                    )}
                                </FormControl>
                                <FormControl required error={!!errors.password}>
                                    <FormLabel>Password</FormLabel>
                                    <Input
                                        type="password"
                                        name="password"
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={setField("password")}
                                    />
                                    {errors.password && (
                                        <FormHelperText>
                                            {errors.password}
                                        </FormHelperText>
                                    )}
                                </FormControl>
                                <Stack sx={{ gap: 4, mt: 2 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Checkbox
                                            size="sm"
                                            label="Remember me"
                                            name="remember"
                                            checked={data.remember}
                                            onChange={setField("remember")}
                                        />
                                    </Box>
                                    <Button
                                        type="submit"
                                        fullWidth
                                        loading={processing}
                                    >
                                        Sign in
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
