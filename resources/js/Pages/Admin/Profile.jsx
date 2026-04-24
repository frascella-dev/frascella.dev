import { useEffect, useRef } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import Alert from "@mui/joy/Alert";
import AspectRatio from "@mui/joy/AspectRatio";
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

import AdminDashboardLayout from "@/Layouts/AdminDashboardLayout.jsx";
import OtpInput from "@/Components/Admin/OtpInput.jsx";

function initialsFrom(name = "") {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatDate(iso) {
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

function PersonalInfoCard({ user }) {
    const { data, setData, patch, processing, errors, isDirty, reset } =
        useForm({
            name: user?.name ?? "",
            email: user?.email ?? "",
        });

    const submit = (e) => {
        e.preventDefault();
        patch("/admin/profile", { preserveScroll: true });
    };

    const fileInputRef = useRef(null);
    const avatarForm = useForm({ avatar: null });

    const onAvatarPick = () => fileInputRef.current?.click();

    const onAvatarChosen = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        avatarForm.setData("avatar", file);
        avatarForm.post("/admin/profile/avatar", {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => {
                if (fileInputRef.current) fileInputRef.current.value = "";
                avatarForm.reset();
            },
        });
    };

    const onAvatarDelete = () => {
        router.delete("/admin/profile/avatar", { preserveScroll: true });
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
                    spacing={1}
                    sx={{ position: "relative" }}
                >
                    <AspectRatio
                        ratio="1"
                        maxHeight={160}
                        sx={{
                            flex: 1,
                            minWidth: { xs: 96, sm: 120 },
                            borderRadius: "100%",
                        }}
                    >
                        <Avatar
                            src={user?.avatar_url ?? undefined}
                            sx={{
                                width: "100%",
                                height: "100%",
                                fontSize: "2rem",
                            }}
                        >
                            {initialsFrom(user?.name)}
                        </Avatar>
                    </AspectRatio>
                    <IconButton
                        aria-label="Upload new picture"
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        onClick={onAvatarPick}
                        loading={avatarForm.processing}
                        sx={{
                            bgcolor: "background.body",
                            position: "absolute",
                            zIndex: 2,
                            borderRadius: "50%",
                            right: -4,
                            bottom: 24,
                            boxShadow: "sm",
                        }}
                    >
                        <IconPencil size={16} stroke={1.75} />
                    </IconButton>
                    {user?.avatar_url && (
                        <Button
                            size="sm"
                            variant="plain"
                            color="danger"
                            type="button"
                            onClick={onAvatarDelete}
                            startDecorator={
                                <IconTrash size={14} stroke={1.75} />
                            }
                            sx={{ alignSelf: "center" }}
                        >
                            Remove
                        </Button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                        onChange={onAvatarChosen}
                        style={{ display: "none" }}
                    />
                    {avatarForm.errors.avatar && (
                        <Typography level="body-xs" color="danger">
                            {avatarForm.errors.avatar}
                        </Typography>
                    )}
                </Stack>
                <Stack spacing={2} sx={{ flexGrow: 1, width: "100%" }}>
                    <FormControl error={!!errors.name}>
                        <FormLabel>Name</FormLabel>
                        <Input
                            size="sm"
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
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
                            onChange={(e) => setData("email", e.target.value)}
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
                        onClick={() => reset()}
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

function SecurityCard() {
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const submit = (e) => {
        e.preventDefault();
        put("/admin/profile/password", {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

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
                        onChange={(e) =>
                            setData("current_password", e.target.value)
                        }
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
                        onChange={(e) => setData("password", e.target.value)}
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
                        onChange={(e) =>
                            setData("password_confirmation", e.target.value)
                        }
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
                        onClick={() => reset()}
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

function TwoFactorCard({ twoFactor }) {
    const pending = twoFactor?.pending ?? null;
    const confirmed = Boolean(twoFactor?.confirmed_at);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: "",
    });
    const otpRef = useRef(null);

    // Auto-submit once six digits are entered — mirrors the login 2FA flow.
    useEffect(() => {
        if (!pending) return;
        if (
            data.code.length === 6 &&
            /^\d{6}$/.test(data.code) &&
            !processing
        ) {
            post("/admin/profile/2fa/confirm", {
                preserveScroll: true,
                onError: () => {
                    reset("code");
                    otpRef.current?.focus();
                },
            });
        }
    }, [data.code]); // eslint-disable-line react-hooks/exhaustive-deps

    const startRotation = () => {
        router.post("/admin/profile/2fa/reset", {}, { preserveScroll: true });
    };

    const cancelRotation = () => {
        router.delete("/admin/profile/2fa", { preserveScroll: true });
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
                            value={data.code}
                            onChange={(next) => setData("code", next)}
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
                                ? `Enrolled ${formatDate(twoFactor.confirmed_at)}.`
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
    const page = usePage();
    const user = page.props.auth?.user;
    const twoFactor = page.props.twoFactor;

    return (
        <AdminDashboardLayout>
            <Head title="Admin · Profile" />
            <Box sx={{ flex: 1, width: "100%" }}>
                <Box
                    sx={{
                        top: { xs: -100, md: -110 },
                        bgcolor: "background.body",
                        zIndex: 9995,
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
                    <PersonalInfoCard user={user} />
                    <SecurityCard />
                    <TwoFactorCard twoFactor={twoFactor} />
                </Stack>
            </Box>
        </AdminDashboardLayout>
    );
}
