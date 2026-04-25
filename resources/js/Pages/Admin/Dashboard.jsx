import { Head, Link, usePage } from "@inertiajs/react";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import JoyLink from "@mui/joy/Link";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import {
    IconChevronRight,
    IconExternalLink,
    IconHome,
} from "@tabler/icons-react";

import AdminDashboardLayout from "@/Layouts/AdminDashboardLayout.jsx";

export default function Dashboard() {
    const user = usePage().props.auth?.user;
    const firstName = user?.name?.split(/\s+/)[0] ?? "there";

    return (
        <AdminDashboardLayout>
            <Head title="Admin · Dashboard" />
            <Box sx={{ flex: 1, width: "100%" }}>
                <Box
                    sx={{
                        position: "sticky",
                        top: { xs: "var(--Header-height)", md: -110 },
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
                                Dashboard
                            </Typography>
                        </Breadcrumbs>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={{ xs: 1, sm: 2 }}
                            sx={{
                                mt: 1,
                                mb: 2,
                                alignItems: { xs: "flex-start", sm: "center" },
                                justifyContent: "space-between",
                            }}
                        >
                            <Box>
                                <Typography
                                    level="h2"
                                    component="h1"
                                    sx={{ mb: 0.5 }}
                                >
                                    Welcome back, {firstName}
                                </Typography>
                                <Typography level="body-sm" color="neutral">
                                    The portfolio admin home.
                                </Typography>
                            </Box>
                            <Button
                                component="a"
                                href="/"
                                target="_blank"
                                rel="noopener"
                                size="sm"
                                variant="outlined"
                                color="neutral"
                                startDecorator={
                                    <IconExternalLink size={16} stroke={1.75} />
                                }
                            >
                                View site
                            </Button>
                        </Stack>
                    </Box>
                </Box>
                <Stack
                    spacing={3}
                    sx={{
                        maxWidth: "900px",
                        mx: "auto",
                        px: { xs: 2, md: 6 },
                        py: { xs: 2, md: 3 },
                        width: "100%",
                    }}
                >
                    <Card variant="outlined" sx={{ p: 4 }}>
                        <Typography level="title-md">Quick links</Typography>
                        <Typography
                            level="body-sm"
                            color="neutral"
                            sx={{ mb: 2 }}
                        >
                            Use the sidebar to manage projects, timeline entries
                            and your profile.
                        </Typography>
                    </Card>
                </Stack>
            </Box>
        </AdminDashboardLayout>
    );
}
