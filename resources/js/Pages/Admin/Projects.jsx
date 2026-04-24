import { Head, Link } from "@inertiajs/react";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Card from "@mui/joy/Card";
import JoyLink from "@mui/joy/Link";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { IconChevronRight, IconHome } from "@tabler/icons-react";

import AdminDashboardLayout from "@/Layouts/AdminDashboardLayout.jsx";

export default function Projects() {
    return (
        <AdminDashboardLayout>
            <Head title="Admin · Projects" />
            <Box sx={{ flex: 1, width: "100%" }}>
                <Box sx={{ px: { xs: 2, md: 6 }, pt: { xs: 2, md: 0 } }}>
                    <Breadcrumbs
                        size="sm"
                        aria-label="breadcrumbs"
                        separator={<IconChevronRight size={14} stroke={1.75} />}
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
                            Projects
                        </Typography>
                    </Breadcrumbs>
                    <Typography level="h2" component="h1" sx={{ mt: 1, mb: 2 }}>
                        Projects
                    </Typography>
                </Box>
                <Stack
                    spacing={4}
                    sx={{
                        maxWidth: "1100px",
                        mx: "auto",
                        px: { xs: 2, md: 6 },
                        py: { xs: 2, md: 3 },
                    }}
                >
                    <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                        <Typography level="title-md">
                            No projects yet
                        </Typography>
                        <Typography level="body-sm" color="neutral">
                            Project management will live here.
                        </Typography>
                    </Card>
                </Stack>
            </Box>
        </AdminDashboardLayout>
    );
}
