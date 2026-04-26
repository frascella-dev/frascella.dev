import { Head, Link } from "@inertiajs/react";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import AdminLayout from "../../Layouts/AdminLayout.tsx";
import Logo from "@/Components/Public/Logo.tsx";
import ColorSchemeToggle from "@/Components/Admin/ColorSchemeToggle.tsx";

export default function RegisterInvalid() {
    return (
        <AdminLayout>
            <Head title="Admin · Invitation invalid" />
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
                        width: 440,
                        maxWidth: "100%",
                        mx: "auto",
                    }}
                >
                    <Stack spacing={2}>
                        <Typography level="h3" sx={{ fontFamily: "display" }}>
                            Invitation invalid
                        </Typography>
                        <Typography level="body-sm" color="neutral">
                            This invitation link is missing, expired, or has
                            already been used. Ask an existing admin to send
                            you a fresh one.
                        </Typography>
                        <Button component={Link} href="/admin/login" fullWidth>
                            Back to sign in
                        </Button>
                    </Stack>
                </Box>
            </Box>
        </AdminLayout>
    );
}
