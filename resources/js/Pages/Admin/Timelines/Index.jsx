import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import JoyLink from "@mui/joy/Link";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import {
    IconChevronRight,
    IconHome,
    IconPlus,
    IconTrash,
} from "@tabler/icons-react";

import AdminDashboardLayout from "@/Layouts/AdminDashboardLayout.jsx";
import TimelineList from "@/Components/Admin/Timelines/TimelineList.jsx";
import TimelineTable from "@/Components/Admin/Timelines/TimelineTable.jsx";

export default function TimelinesIndex() {
    const { props } = usePage();
    const entries = props.entries;
    const filters = props.filters ?? {};
    const kinds = props.kinds ?? [];

    const [confirmDelete, setConfirmDelete] = useState(null);

    const onDelete = (entry) => setConfirmDelete(entry);
    const performDelete = () => {
        if (!confirmDelete) return;
        router.delete(`/admin/settings/timelines/${confirmDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => setConfirmDelete(null),
        });
    };

    const onMove = (entry, direction) => {
        router.patch(
            `/admin/settings/timelines/${entry.id}/move`,
            { direction },
            {
                preserveScroll: true,
                preserveState: true,
                only: ["entries"],
            },
        );
    };

    return (
        <AdminDashboardLayout>
            <Head title="Admin · Timelines" />
            <Box
                sx={{
                    px: { xs: 2, md: 6 },
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    gap: 1,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center" }}>
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
                        <JoyLink
                            component={Link}
                            underline="hover"
                            color="neutral"
                            href="/admin/settings"
                            sx={{ fontSize: 12, fontWeight: 500 }}
                        >
                            Settings
                        </JoyLink>
                        <Typography
                            color="primary"
                            sx={{ fontWeight: 500, fontSize: 12 }}
                        >
                            Timelines
                        </Typography>
                    </Breadcrumbs>
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        mb: 1,
                        gap: 1,
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "start", sm: "center" },
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                    }}
                >
                    <Typography level="h2" component="h1">
                        Timelines
                    </Typography>
                    <Button
                        component={Link}
                        href="/admin/settings/timelines/create"
                        color="primary"
                        size="sm"
                        startDecorator={<IconPlus size={16} stroke={1.75} />}
                    >
                        New entry
                    </Button>
                </Box>

                <TimelineTable
                    entries={entries}
                    filters={filters}
                    kinds={kinds}
                    onDelete={onDelete}
                    onMove={onMove}
                />
                <TimelineList
                    entries={entries}
                    onDelete={onDelete}
                    onMove={onMove}
                />
            </Box>

            <Modal
                open={Boolean(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
            >
                <ModalDialog
                    role="alertdialog"
                    size="sm"
                    sx={{ maxWidth: 400 }}
                >
                    <Typography level="h4" component="h2">
                        Delete this entry?
                    </Typography>
                    <Typography level="body-sm" color="neutral">
                        “{confirmDelete?.title}” and any attached pictures will
                        be permanently removed. This can't be undone.
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mt: 2, justifyContent: "flex-end" }}
                    >
                        <Button
                            variant="plain"
                            color="neutral"
                            size="sm"
                            onClick={() => setConfirmDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            color="danger"
                            size="sm"
                            startDecorator={
                                <IconTrash size={14} stroke={1.75} />
                            }
                            onClick={performDelete}
                        >
                            Delete
                        </Button>
                    </Stack>
                </ModalDialog>
            </Modal>
        </AdminDashboardLayout>
    );
}
