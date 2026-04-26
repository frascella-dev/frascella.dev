import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import Alert from "@mui/joy/Alert";
import Avatar from "@mui/joy/Avatar";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardActions from "@mui/joy/CardActions";
import CardOverflow from "@mui/joy/CardOverflow";
import Chip from "@mui/joy/Chip";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import IconButton from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import JoyLink from "@mui/joy/Link";
import Stack from "@mui/joy/Stack";
import Tab, { tabClasses } from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";
import {
    IconChevronRight,
    IconHome,
    IconMail,
    IconPencil,
    IconRefresh,
    IconShieldCheck,
    IconShieldLock,
    IconTrash,
    IconX,
} from "@tabler/icons-react";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.tsx";
import OtpInput, {
    type OtpInputHandle,
} from "@/Components/Admin/OtpInput.tsx";
import axios from "axios";
import { api, fieldErrors } from "@/utils/api.ts";
import type {
    FieldErrors,
    PageProps,
    ProfilePayload,
} from "@/types.ts";

type CardProps = {
    profile: ProfilePayload;
    onProfile: (next: ProfilePayload) => void;
};

function initialsFrom(name: string | undefined = ""): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return iso;
    }
}

function PersonalInfoCard({ profile, onProfile }: CardProps) {
    const user = profile?.user;
    const avatarUploadLimitKb = profile?.avatarUploadLimitKb;
    const [data, setData] = useState<{ name: string; email: string }>({
        name: user?.name ?? "",
        email: user?.email ?? "",
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const uploadLimitMb = avatarUploadLimitKb
        ? (avatarUploadLimitKb / 1024).toFixed(1)
        : null;

    useEffect(() => {
        setData({ name: user?.name ?? "", email: user?.email ?? "" });
    }, [user?.name, user?.email]);

    const isDirty =
        data.name !== (user?.name ?? "") ||
        data.email !== (user?.email ?? "");

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        setErrors({});
        try {
            const { data: next } = await api.patch<ProfilePayload>(
                "/api/admin/profile",
                data,
            );
            onProfile(next);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 422) {
                setErrors(fieldErrors(err));
            } else {
                const message =
                    err instanceof Error ? err.message : "Could not save changes.";
                setErrors({ name: message });
            }
        } finally {
            setProcessing(false);
        }
    };

    const reset = () => {
        setData({ name: user?.name ?? "", email: user?.email ?? "" });
        setErrors({});
    };

    const onAvatarPick = () => fileInputRef.current?.click();

    const onAvatarChosen = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setErrors((prev) => {
            const { avatar: _omit, ...rest } = prev;
            return rest;
        });
        const form = new FormData();
        form.append("avatar", file);
        try {
            const { data: next } = await api.post<ProfilePayload>(
                "/api/admin/profile/avatar",
                form,
            );
            onProfile(next);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 422) {
                setErrors((prev) => ({
                    ...prev,
                    ...fieldErrors(err),
                }));
            } else {
                const message =
                    err instanceof Error ? err.message : "Upload failed.";
                setErrors((prev) => ({ ...prev, avatar: message }));
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const onAvatarDelete = async () => {
        try {
            const { data: next } = await api.delete<ProfilePayload>(
                "/api/admin/profile/avatar",
            );
            onProfile(next);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not remove the avatar.";
            setErrors((prev) => ({ ...prev, avatar: message }));
        }
    };

    return (
        <Card component="form" onSubmit={submit}>
            <Box sx={{ mb: 1 }}>
                <Typography level="title-md">Personal info</Typography>
                <Typography level="body-sm">
                    Customize how your profile information will appear on the
                    admin surface.
                </Typography>
            </Box>
            <Divider />
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 2, sm: 3 }}
                sx={{ my: 1, alignItems: { xs: "center", sm: "flex-start" } }}
            >
                <Stack
                    direction="column"
                    spacing={1.5}
                    sx={{
                        alignItems: "center",
                        minWidth: { xs: "auto", sm: 140 },
                    }}
                >
                    <Box
                        sx={{
                            position: "relative",
                            width: 128,
                            height: 128,
                            flexShrink: 0,
                        }}
                    >
                        <Avatar
                            src={user?.avatar_url ?? undefined}
                            sx={{
                                width: "100%",
                                height: "100%",
                                fontSize: "2.25rem",
                                fontWeight: 600,
                                border: "3px solid",
                                borderColor: "background.surface",
                                boxShadow: "sm",
                            }}
                        >
                            {initialsFrom(user?.name)}
                        </Avatar>
                        <IconButton
                            aria-label="Change photo"
                            size="sm"
                            variant="solid"
                            color="primary"
                            onClick={onAvatarPick}
                            loading={uploading}
                            sx={{
                                position: "absolute",
                                right: 0,
                                bottom: 0,
                                borderRadius: "50%",
                                boxShadow: "md",
                                "--IconButton-size": "34px",
                            }}
                        >
                            <IconPencil size={16} stroke={2} />
                        </IconButton>
                        {user?.avatar_url && !uploading && (
                            <IconButton
                                aria-label="Remove photo"
                                size="sm"
                                variant="outlined"
                                color="danger"
                                onClick={onAvatarDelete}
                                sx={{
                                    position: "absolute",
                                    left: 0,
                                    bottom: 0,
                                    borderRadius: "50%",
                                    bgcolor: "background.body",
                                    boxShadow: "sm",
                                    "--IconButton-size": "30px",
                                }}
                            >
                                <IconTrash size={14} stroke={1.75} />
                            </IconButton>
                        )}
                    </Box>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                        onChange={onAvatarChosen}
                        style={{ display: "none" }}
                    />
                    {errors.avatar ? (
                        <Typography
                            level="body-xs"
                            color="danger"
                            sx={{ textAlign: "center" }}
                        >
                            {errors.avatar}
                        </Typography>
                    ) : (
                        uploadLimitMb && (
                            <Typography
                                level="body-xs"
                                sx={{
                                    textAlign: "center",
                                    color: "text.tertiary",
                                }}
                            >
                                Max {uploadLimitMb} MB · PNG, JPEG, WEBP, AVIF
                            </Typography>
                        )
                    )}
                </Stack>
                <Stack spacing={2} sx={{ flexGrow: 1, width: "100%" }}>
                    <FormControl error={!!errors.name}>
                        <FormLabel>Name</FormLabel>
                        <Input
                            size="sm"
                            value={data.name}
                            onChange={(e) =>
                                setData((p) => ({ ...p, name: e.target.value }))
                            }
                            placeholder="Full name"
                        />
                        {errors.name && (
                            <FormHelperText>{errors.name}</FormHelperText>
                        )}
                    </FormControl>
                    <FormControl error={!!errors.email}>
                        <FormLabel>Email</FormLabel>
                        <Input
                            size="sm"
                            type="email"
                            startDecorator={
                                <IconMail size={16} stroke={1.75} />
                            }
                            value={data.email}
                            onChange={(e) =>
                                setData((p) => ({
                                    ...p,
                                    email: e.target.value,
                                }))
                            }
                            placeholder="you@example.com"
                        />
                        {errors.email && (
                            <FormHelperText>{errors.email}</FormHelperText>
                        )}
                    </FormControl>
                </Stack>
            </Stack>
            <CardOverflow
                sx={{ borderTop: "1px solid", borderColor: "divider" }}
            >
                <CardActions
                    sx={{
                        alignSelf: "flex-end",
                        pt: 2,
                        flexWrap: "wrap",
                        gap: 1,
                    }}
                >
                    <Button
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        type="button"
                        onClick={reset}
                        disabled={!isDirty || processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        type="submit"
                        loading={processing}
                        disabled={!isDirty}
                    >
                        Save
                    </Button>
                </CardActions>
            </CardOverflow>
        </Card>
    );
}

type PasswordData = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

function SecurityCard() {
    const empty: PasswordData = {
        current_password: "",
        password: "",
        password_confirmation: "",
    };
    const [data, setData] = useState<PasswordData>(empty);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [processing, setProcessing] = useState(false);

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        setErrors({});
        try {
            await api.put("/api/admin/profile/password", data);
            setData(empty);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 422) {
                setErrors(fieldErrors(err));
            } else {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Could not change the password.";
                setErrors({ current_password: message });
            }
        } finally {
            setProcessing(false);
        }
    };

    const setField =
        <K extends keyof PasswordData>(key: K) =>
        (e: ChangeEvent<HTMLInputElement>) =>
            setData((p) => ({ ...p, [key]: e.target.value }));

    return (
        <Card component="form" onSubmit={submit}>
            <Box sx={{ mb: 1 }}>
                <Typography level="title-md">Password</Typography>
                <Typography level="body-sm">
                    Change the password you use to sign in to the admin panel.
                </Typography>
            </Box>
            <Divider />
            <Stack spacing={2} sx={{ my: 1 }}>
                <FormControl error={!!errors.current_password}>
                    <FormLabel>Current password</FormLabel>
                    <Input
                        size="sm"
                        type="password"
                        autoComplete="current-password"
                        value={data.current_password}
                        onChange={setField("current_password")}
                    />
                    {errors.current_password && (
                        <FormHelperText>
                            {errors.current_password}
                        </FormHelperText>
                    )}
                </FormControl>
                <FormControl error={!!errors.password}>
                    <FormLabel>New password</FormLabel>
                    <Input
                        size="sm"
                        type="password"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={setField("password")}
                    />
                    {errors.password && (
                        <FormHelperText>{errors.password}</FormHelperText>
                    )}
                </FormControl>
                <FormControl>
                    <FormLabel>Confirm new password</FormLabel>
                    <Input
                        size="sm"
                        type="password"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={setField("password_confirmation")}
                    />
                </FormControl>
            </Stack>
            <CardOverflow
                sx={{ borderTop: "1px solid", borderColor: "divider" }}
            >
                <CardActions
                    sx={{
                        alignSelf: "flex-end",
                        pt: 2,
                        flexWrap: "wrap",
                        gap: 1,
                    }}
                >
                    <Button
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        type="button"
                        onClick={() => {
                            setData(empty);
                            setErrors({});
                        }}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        type="submit"
                        loading={processing}
                    >
                        Save
                    </Button>
                </CardActions>
            </CardOverflow>
        </Card>
    );
}

function TwoFactorCard({ profile, onProfile }: CardProps) {
    const twoFactor = profile?.twoFactor;
    const pending = twoFactor?.pending ?? null;
    const confirmed = Boolean(twoFactor?.confirmed_at);

    const [code, setCode] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [processing, setProcessing] = useState(false);
    const otpRef = useRef<OtpInputHandle | null>(null);

    const confirm = async () => {
        if (processing) return;
        setProcessing(true);
        setErrors({});
        try {
            const { data: next } = await api.post<ProfilePayload>(
                "/api/admin/profile/2fa/confirm",
                { code },
            );
            setCode("");
            onProfile(next);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 422) {
                setErrors(fieldErrors(err));
            } else {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Could not verify the code.";
                setErrors({ code: message });
            }
            setCode("");
            otpRef.current?.focus();
        } finally {
            setProcessing(false);
        }
    };

    // Auto-submit once six digits are entered — mirrors the login 2FA flow.
    useEffect(() => {
        if (!pending) return;
        if (code.length === 6 && /^\d{6}$/.test(code) && !processing) {
            confirm();
        }
    }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

    const startRotation = async () => {
        try {
            const { data: next } = await api.post<ProfilePayload>(
                "/api/admin/profile/2fa/reset",
            );
            onProfile(next);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not start the rotation.";
            setErrors({ code: message });
        }
    };

    const cancelRotation = async () => {
        try {
            const { data: next } = await api.delete<ProfilePayload>(
                "/api/admin/profile/2fa",
            );
            setCode("");
            setErrors({});
            onProfile(next);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not cancel the rotation.";
            setErrors({ code: message });
        }
    };

    return (
        <Card>
            <Box sx={{ mb: 1 }}>
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", flexWrap: "wrap" }}
                >
                    <Typography level="title-md">
                        Two-factor authentication
                    </Typography>
                    {confirmed && !pending && (
                        <Chip
                            size="sm"
                            color="success"
                            variant="soft"
                            startDecorator={
                                <IconShieldCheck size={14} stroke={1.75} />
                            }
                        >
                            Enabled
                        </Chip>
                    )}
                    {pending && (
                        <Chip
                            size="sm"
                            color="warning"
                            variant="soft"
                            startDecorator={
                                <IconRefresh size={14} stroke={1.75} />
                            }
                        >
                            Rotation pending
                        </Chip>
                    )}
                </Stack>
                <Typography level="body-sm">
                    {pending
                        ? "Scan the QR with your authenticator and enter the new 6-digit code to finish the rotation."
                        : "Rotate the secret if you've lost your authenticator or want to re-enroll a new device."}
                </Typography>
            </Box>
            <Divider />

            {pending ? (
                <Stack
                    spacing={3}
                    sx={{
                        my: 1,
                        alignItems: "center",
                    }}
                >
                    <Box
                        sx={{
                            width: { xs: 200, sm: 220 },
                            bgcolor: "common.white",
                            p: 1,
                            borderRadius: "sm",
                            boxShadow: "sm",
                        }}
                    >
                        <img
                            src={pending.qr}
                            alt="2FA QR code"
                            style={{
                                width: "100%",
                                height: "auto",
                                display: "block",
                            }}
                        />
                    </Box>
                    <Typography
                        level="body-xs"
                        sx={{
                            textAlign: "center",
                            wordBreak: "break-all",
                            maxWidth: "100%",
                            fontFamily: "code",
                            color: "text.tertiary",
                        }}
                    >
                        {pending.uri}
                    </Typography>
                    {errors.code && (
                        <Alert
                            color="danger"
                            variant="soft"
                            size="sm"
                            sx={{ alignSelf: "stretch" }}
                        >
                            {errors.code}
                        </Alert>
                    )}
                    <FormControl error={!!errors.code} sx={{ width: "100%" }}>
                        <FormLabel sx={{ justifyContent: "center" }}>
                            Verification code
                        </FormLabel>
                        <OtpInput
                            ref={otpRef}
                            value={code}
                            onChange={setCode}
                            error={!!errors.code}
                            disabled={processing}
                            autoFocus
                        />
                    </FormControl>
                </Stack>
            ) : (
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                        my: 1,
                        alignItems: { xs: "flex-start", sm: "center" },
                    }}
                >
                    <IconShieldLock
                        size={28}
                        stroke={1.5}
                        style={{ flexShrink: 0 }}
                    />
                    <Box sx={{ flex: 1 }}>
                        <Typography level="body-sm">
                            {confirmed
                                ? `Enrolled ${formatDate(twoFactor?.confirmed_at)}.`
                                : "No authenticator enrolled yet."}
                        </Typography>
                        <Typography level="body-xs" color="neutral">
                            Your current authenticator stays active until you
                            confirm a new code during rotation.
                        </Typography>
                    </Box>
                </Stack>
            )}

            <CardOverflow
                sx={{ borderTop: "1px solid", borderColor: "divider" }}
            >
                <CardActions
                    sx={{
                        alignSelf: "flex-end",
                        pt: 2,
                        flexWrap: "wrap",
                        gap: 1,
                    }}
                >
                    {pending ? (
                        <Button
                            size="sm"
                            variant="outlined"
                            color="neutral"
                            type="button"
                            onClick={cancelRotation}
                            startDecorator={<IconX size={14} stroke={1.75} />}
                        >
                            Cancel rotation
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="solid"
                            color="warning"
                            type="button"
                            onClick={startRotation}
                            startDecorator={
                                <IconRefresh size={14} stroke={1.75} />
                            }
                        >
                            Reset 2FA
                        </Button>
                    )}
                </CardActions>
            </CardOverflow>
        </Card>
    );
}

export default function Profile() {
    const page = usePage<PageProps>();
    const fallbackUser = page.props.auth?.user;
    const [profile, setProfile] = useState<ProfilePayload | null>(() =>
        fallbackUser
            ? {
                  user: {
                      id: fallbackUser.id,
                      name: fallbackUser.name,
                      email: fallbackUser.email,
                      avatar_url: fallbackUser.avatar_url ?? null,
                  },
                  twoFactor: { confirmed_at: null, pending: null },
                  avatarUploadLimitKb: null,
              }
            : null,
    );
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.get<ProfilePayload>("/api/admin/profile")
            .then(({ data }) => {
                if (!cancelled) setProfile(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Could not load profile.";
                    setLoadError(message);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <AuthenticatedLayout>
            <Head title="Admin · Profile" />
            <Box sx={{ flex: 1, width: "100%" }}>
                <Box
                    sx={{
                        top: { xs: -100, md: -110 },
                        bgcolor: "background.body",
                        zIndex: 995,
                    }}
                >
                    <Box sx={{ px: { xs: 2, md: 6 }, pt: { xs: 2, md: 0 } }}>
                        <Breadcrumbs
                            size="sm"
                            aria-label="breadcrumbs"
                            separator={
                                <IconChevronRight size={14} stroke={1.75} />
                            }
                            sx={{ pl: 0 }}
                        >
                            <JoyLink
                                component={Link}
                                underline="none"
                                color="neutral"
                                href="/admin/dashboard"
                                aria-label="Home"
                            >
                                <IconHome size={18} stroke={1.75} />
                            </JoyLink>
                            <Typography
                                color="primary"
                                sx={{ fontWeight: 500, fontSize: 12 }}
                            >
                                My profile
                            </Typography>
                        </Breadcrumbs>
                        <Typography
                            level="h2"
                            component="h1"
                            sx={{ mt: 1, mb: 2 }}
                        >
                            My profile
                        </Typography>
                    </Box>
                    <Tabs defaultValue={0} sx={{ bgcolor: "transparent" }}>
                        <TabList
                            tabFlex={1}
                            size="sm"
                            sx={{
                                pl: { xs: 2, md: 4 },
                                justifyContent: "left",
                                [`&& .${tabClasses.root}`]: {
                                    fontWeight: "600",
                                    flex: "initial",
                                    color: "text.tertiary",
                                    [`&.${tabClasses.selected}`]: {
                                        bgcolor: "transparent",
                                        color: "text.primary",
                                        "&::after": {
                                            height: "2px",
                                            bgcolor: "primary.500",
                                        },
                                    },
                                },
                            }}
                        >
                            <Tab
                                sx={{ borderRadius: "6px 6px 0 0" }}
                                indicatorInset
                                value={0}
                            >
                                Settings
                            </Tab>
                        </TabList>
                    </Tabs>
                </Box>
                <Stack
                    spacing={4}
                    sx={{
                        maxWidth: "800px",
                        mx: "auto",
                        px: { xs: 2, md: 6 },
                        py: { xs: 2, md: 3 },
                    }}
                >
                    {loadError && (
                        <Alert color="danger" variant="soft">
                            {loadError}
                        </Alert>
                    )}
                    {profile && (
                        <>
                            <PersonalInfoCard
                                profile={profile}
                                onProfile={setProfile}
                            />
                            <SecurityCard />
                            <TwoFactorCard
                                profile={profile}
                                onProfile={setProfile}
                            />
                        </>
                    )}
                </Stack>
            </Box>
        </AuthenticatedLayout>
    );
}
