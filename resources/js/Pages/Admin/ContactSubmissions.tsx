import * as React from "react";
import { Head, Link as InertiaLink } from "@inertiajs/react";
import type { ColorPaletteProp } from "@mui/joy/styles";
import Alert from "@mui/joy/Alert";
import Avatar from "@mui/joy/Avatar";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import Chip from "@mui/joy/Chip";
import CircularProgress from "@mui/joy/CircularProgress";
import Divider from "@mui/joy/Divider";
import Dropdown from "@mui/joy/Dropdown";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import JoyLink from "@mui/joy/Link";
import List from "@mui/joy/List";
import ListDivider from "@mui/joy/ListDivider";
import ListItem from "@mui/joy/ListItem";
import ListItemContent from "@mui/joy/ListItemContent";
import ListItemDecorator from "@mui/joy/ListItemDecorator";
import Menu from "@mui/joy/Menu";
import MenuButton from "@mui/joy/MenuButton";
import MenuItem from "@mui/joy/MenuItem";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import ModalDialog from "@mui/joy/ModalDialog";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import {
    IconAlertTriangle,
    IconCheck,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconClock,
    IconDots,
    IconFilter,
    IconHome,
    IconMail,
    IconSearch,
} from "@tabler/icons-react";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.tsx";
import { api } from "@/utils/api.ts";
import type {
    ContactSubmission,
    ContactSubmissionStatus,
    ContactSubmissionsResponse,
} from "@/types.ts";

type Order = "asc" | "desc";
type StatusFilter = "all" | ContactSubmissionStatus;

const dateFormat = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    try {
        return dateFormat.format(new Date(iso));
    } catch {
        return iso;
    }
}

function initialFrom(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
}

const STATUS_META: Record<
    ContactSubmissionStatus,
    {
        label: string;
        color: ColorPaletteProp;
        icon: React.ComponentType<{ size?: number; stroke?: number }>;
    }
> = {
    sent: { label: "Sent", color: "success", icon: IconCheck },
    queued: { label: "Queued", color: "neutral", icon: IconClock },
    failed: { label: "Failed", color: "danger", icon: IconAlertTriangle },
};

function StatusChip({ status }: { status: ContactSubmissionStatus }) {
    const meta = STATUS_META[status];
    const Icon = meta.icon;
    return (
        <Chip
            variant="soft"
            size="sm"
            color={meta.color}
            startDecorator={<Icon size={12} stroke={2.2} />}
        >
            {meta.label}
        </Chip>
    );
}

function MessageCell({ value }: { value: string }) {
    return (
        <Tooltip
            arrow
            placement="bottom-start"
            variant="outlined"
            title={
                <Box sx={{ maxWidth: 360, whiteSpace: "pre-wrap", py: 1 }}>
                    {value}
                </Box>
            }
        >
            <Typography
                level="body-sm"
                sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    cursor: "help",
                }}
            >
                {value}
            </Typography>
        </Tooltip>
    );
}

function RowMenu({ submission }: { submission: ContactSubmission }) {
    const copyEmail = () => {
        navigator.clipboard?.writeText(submission.email).catch(() => {});
    };
    return (
        <Dropdown>
            <MenuButton
                slots={{ root: IconButton }}
                slotProps={{
                    root: { variant: "plain", color: "neutral", size: "sm" },
                }}
            >
                <IconDots size={18} stroke={1.75} />
            </MenuButton>
            <Menu size="sm" sx={{ minWidth: 160 }}>
                <MenuItem
                    component="a"
                    href={`mailto:${submission.email}?subject=${encodeURIComponent("Re: your message")}`}
                >
                    Reply via mail
                </MenuItem>
                <MenuItem onClick={copyEmail}>Copy email</MenuItem>
            </Menu>
        </Dropdown>
    );
}

/**
 * Returns a sparse list of page numbers ('1, 2, 3, …, last-1, last') ready
 * to render. The blanks are represented by '…'.
 */
function pageRange(current: number, last: number): (number | "…")[] {
    if (last <= 7) {
        return Array.from({ length: last }, (_, i) => i + 1);
    }
    const set = new Set<number>([
        1,
        2,
        last - 1,
        last,
        current - 1,
        current,
        current + 1,
    ]);
    const filtered = Array.from(set)
        .filter((p) => p >= 1 && p <= last)
        .sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let prev = 0;
    for (const p of filtered) {
        if (prev > 0 && p - prev > 1) out.push("…");
        out.push(p);
        prev = p;
    }
    return out;
}

function useContactSubmissions({
    status,
    search,
    order,
    page,
    perPage,
}: {
    status: StatusFilter;
    search: string;
    order: Order;
    page: number;
    perPage: number;
}) {
    const [data, setData] = React.useState<ContactSubmissionsResponse | null>(
        null,
    );
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const params: Record<string, string | number> = {
            page,
            per_page: perPage,
            order,
        };
        if (status !== "all") params.status = status;
        if (search.trim() !== "") params.search = search.trim();

        api.get<ContactSubmissionsResponse>("/api/admin/contact-submissions", {
            params,
        })
            .then(({ data }) => {
                if (!cancelled) setData(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Could not load submissions.",
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [status, search, order, page, perPage]);

    return { data, error, loading };
}

export default function ContactSubmissions() {
    const [status, setStatus] = React.useState<StatusFilter>("all");
    const [search, setSearch] = React.useState("");
    const [searchInput, setSearchInput] = React.useState("");
    const [order, setOrder] = React.useState<Order>("desc");
    const [page, setPage] = React.useState(1);
    const [selected, setSelected] = React.useState<readonly number[]>([]);
    const [filtersOpen, setFiltersOpen] = React.useState(false);

    const perPage = 20;

    // Debounce free-text search so we don't hammer the API on every keystroke.
    React.useEffect(() => {
        const id = window.setTimeout(() => setSearch(searchInput), 280);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    // Reset to page 1 whenever the result set changes shape.
    React.useEffect(() => {
        setPage(1);
        setSelected([]);
    }, [status, search, order]);

    const { data, error, loading } = useContactSubmissions({
        status,
        search,
        order,
        page,
        perPage,
    });

    const rows = data?.data ?? [];
    const lastPage = data?.meta.last_page ?? 1;
    const totals = data?.meta.totals_by_status;

    const allSelectedIds = rows.map((r) => r.id);
    const allSelected =
        rows.length > 0 && allSelectedIds.every((id) => selected.includes(id));
    const someSelected = selected.length > 0 && !allSelected;

    const renderFilters = () => (
        <React.Fragment>
            <FormControl size="sm">
                <FormLabel>Status</FormLabel>
                <Select
                    size="sm"
                    value={status}
                    onChange={(_, v) => v && setStatus(v as StatusFilter)}
                    slotProps={{ button: { sx: { whiteSpace: "nowrap" } } }}
                >
                    <Option value="all">All</Option>
                    <Option value="sent">
                        Sent{totals && ` · ${totals.sent}`}
                    </Option>
                    <Option value="queued">
                        Queued{totals && ` · ${totals.queued}`}
                    </Option>
                    <Option value="failed">
                        Failed{totals && ` · ${totals.failed}`}
                    </Option>
                </Select>
            </FormControl>
            <FormControl size="sm">
                <FormLabel>Sort by date</FormLabel>
                <Select
                    size="sm"
                    value={order}
                    onChange={(_, v) => v && setOrder(v as Order)}
                >
                    <Option value="desc">Newest first</Option>
                    <Option value="asc">Oldest first</Option>
                </Select>
            </FormControl>
        </React.Fragment>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Admin · Contact submissions" />
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
                                component={InertiaLink}
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
                                Contact submissions
                            </Typography>
                        </Breadcrumbs>
                        <Box sx={{ mt: 1, mb: 2 }}>
                            <Typography
                                level="h2"
                                component="h1"
                                sx={{ mb: 0.5 }}
                            >
                                Contact submissions
                            </Typography>
                            <Typography level="body-sm" color="neutral">
                                Messages received via the public contact form,
                                with email delivery status.
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Box
                    sx={{
                        maxWidth: "1400px",
                        mx: "auto",
                        px: { xs: 2, md: 6 },
                        py: { xs: 1, md: 2 },
                        width: "100%",
                    }}
                >
                    {/* Mobile search + filter trigger */}
                    <Sheet
                        sx={{
                            display: { xs: "flex", sm: "none" },
                            my: 1,
                            gap: 1,
                        }}
                    >
                        <Input
                            size="sm"
                            placeholder="Search"
                            startDecorator={
                                <IconSearch size={16} stroke={1.75} />
                            }
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            sx={{ flexGrow: 1 }}
                        />
                        <IconButton
                            size="sm"
                            variant="outlined"
                            color="neutral"
                            onClick={() => setFiltersOpen(true)}
                        >
                            <IconFilter size={16} stroke={1.75} />
                        </IconButton>
                        <Modal
                            open={filtersOpen}
                            onClose={() => setFiltersOpen(false)}
                        >
                            <ModalDialog
                                aria-labelledby="filter-modal"
                                layout="fullscreen"
                            >
                                <ModalClose />
                                <Typography id="filter-modal" level="h2">
                                    Filters
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Sheet
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                    }}
                                >
                                    {renderFilters()}
                                    <Button
                                        color="primary"
                                        onClick={() => setFiltersOpen(false)}
                                    >
                                        Apply
                                    </Button>
                                </Sheet>
                            </ModalDialog>
                        </Modal>
                    </Sheet>

                    {/* Desktop search + filters */}
                    <Box
                        sx={{
                            borderRadius: "sm",
                            py: 2,
                            display: { xs: "none", sm: "flex" },
                            flexWrap: "wrap",
                            gap: 1.5,
                            "& > *": {
                                minWidth: { xs: "120px", md: "160px" },
                            },
                        }}
                    >
                        <FormControl sx={{ flex: 1 }} size="sm">
                            <FormLabel>Search</FormLabel>
                            <Input
                                size="sm"
                                placeholder="Name, email or message"
                                startDecorator={
                                    <IconSearch size={16} stroke={1.75} />
                                }
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </FormControl>
                        {renderFilters()}
                    </Box>

                    {error && (
                        <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Desktop table */}
                    <Sheet
                        variant="outlined"
                        sx={{
                            display: { xs: "none", sm: "initial" },
                            width: "100%",
                            borderRadius: "sm",
                            flexShrink: 1,
                            overflow: "auto",
                            minHeight: 0,
                        }}
                    >
                        <Table
                            aria-labelledby="tableTitle"
                            stickyHeader
                            hoverRow
                            sx={{
                                "--TableCell-headBackground":
                                    "var(--joy-palette-background-level1)",
                                "--Table-headerUnderlineThickness": "1px",
                                "--TableRow-hoverBackground":
                                    "var(--joy-palette-background-level1)",
                                "--TableCell-paddingY": "4px",
                                "--TableCell-paddingX": "8px",
                            }}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            width: 48,
                                            textAlign: "center",
                                            padding: "12px 6px",
                                        }}
                                    >
                                        <Checkbox
                                            size="sm"
                                            indeterminate={someSelected}
                                            checked={allSelected}
                                            onChange={(event) => {
                                                setSelected(
                                                    event.target.checked
                                                        ? allSelectedIds
                                                        : [],
                                                );
                                            }}
                                            color={
                                                selected.length > 0
                                                    ? "primary"
                                                    : undefined
                                            }
                                            sx={{
                                                verticalAlign: "text-bottom",
                                            }}
                                        />
                                    </th>
                                    <th
                                        style={{
                                            width: 180,
                                            padding: "12px 6px",
                                        }}
                                    >
                                        <JoyLink
                                            underline="none"
                                            color="primary"
                                            component="button"
                                            onClick={() =>
                                                setOrder(
                                                    order === "asc"
                                                        ? "desc"
                                                        : "asc",
                                                )
                                            }
                                            endDecorator={
                                                <IconChevronDown
                                                    size={14}
                                                    stroke={1.75}
                                                />
                                            }
                                            sx={{
                                                fontWeight: "lg",
                                                "& svg": {
                                                    transition: "0.2s",
                                                    transform:
                                                        order === "desc"
                                                            ? "rotate(0deg)"
                                                            : "rotate(180deg)",
                                                },
                                            }}
                                        >
                                            Received
                                        </JoyLink>
                                    </th>
                                    <th
                                        style={{
                                            width: 140,
                                            padding: "12px 6px",
                                        }}
                                    >
                                        Status
                                    </th>
                                    <th
                                        style={{
                                            width: 240,
                                            padding: "12px 6px",
                                        }}
                                    >
                                        From
                                    </th>
                                    <th style={{ padding: "12px 6px" }}>
                                        Message
                                    </th>
                                    <th
                                        style={{
                                            width: 100,
                                            padding: "12px 6px",
                                        }}
                                    ></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    py: 6,
                                                }}
                                            >
                                                <CircularProgress size="sm" />
                                            </Box>
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: 1.5,
                                                    py: 6,
                                                    color: "text.tertiary",
                                                }}
                                            >
                                                <IconMail
                                                    size={32}
                                                    stroke={1.5}
                                                />
                                                <Typography level="body-sm">
                                                    No submissions match.
                                                </Typography>
                                            </Box>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.id}>
                                            <td
                                                style={{
                                                    textAlign: "center",
                                                }}
                                            >
                                                <Checkbox
                                                    size="sm"
                                                    checked={selected.includes(
                                                        row.id,
                                                    )}
                                                    color={
                                                        selected.includes(
                                                            row.id,
                                                        )
                                                            ? "primary"
                                                            : undefined
                                                    }
                                                    onChange={(event) => {
                                                        setSelected((ids) =>
                                                            event.target.checked
                                                                ? ids.concat(
                                                                      row.id,
                                                                  )
                                                                : ids.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          row.id,
                                                                  ),
                                                        );
                                                    }}
                                                    sx={{
                                                        verticalAlign:
                                                            "text-bottom",
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <Typography level="body-xs">
                                                    {formatDate(row.created_at)}
                                                </Typography>
                                            </td>
                                            <td>
                                                <StatusChip
                                                    status={row.status}
                                                />
                                            </td>
                                            <td>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 1.5,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Avatar size="sm">
                                                        {initialFrom(row.name)}
                                                    </Avatar>
                                                    <Box
                                                        sx={{
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <Typography
                                                            level="body-xs"
                                                            sx={{
                                                                fontWeight: 500,
                                                            }}
                                                            noWrap
                                                        >
                                                            {row.name}
                                                        </Typography>
                                                        <JoyLink
                                                            href={`mailto:${row.email}`}
                                                            level="body-xs"
                                                            underline="hover"
                                                        >
                                                            {row.email}
                                                        </JoyLink>
                                                    </Box>
                                                </Box>
                                            </td>
                                            <td>
                                                <MessageCell
                                                    value={row.message}
                                                />
                                            </td>
                                            <td>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 1,
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "flex-end",
                                                    }}
                                                >
                                                    <RowMenu submission={row} />
                                                </Box>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Sheet>

                    {/* Mobile list */}
                    <Box sx={{ display: { xs: "block", sm: "none" } }}>
                        {loading && rows.length === 0 ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    py: 4,
                                }}
                            >
                                <CircularProgress size="sm" />
                            </Box>
                        ) : rows.length === 0 ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 1,
                                    py: 4,
                                    color: "text.tertiary",
                                }}
                            >
                                <IconMail size={28} stroke={1.5} />
                                <Typography level="body-sm">
                                    No submissions match.
                                </Typography>
                            </Box>
                        ) : (
                            rows.map((row) => (
                                <List
                                    key={row.id}
                                    size="sm"
                                    sx={{ "--ListItem-paddingX": 0 }}
                                >
                                    <ListItem
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "start",
                                        }}
                                    >
                                        <ListItemContent
                                            sx={{
                                                display: "flex",
                                                gap: 2,
                                                alignItems: "start",
                                            }}
                                        >
                                            <ListItemDecorator>
                                                <Avatar size="sm">
                                                    {initialFrom(row.name)}
                                                </Avatar>
                                            </ListItemDecorator>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography
                                                    gutterBottom
                                                    sx={{ fontWeight: 600 }}
                                                    noWrap
                                                >
                                                    {row.name}
                                                </Typography>
                                                <Typography
                                                    level="body-xs"
                                                    gutterBottom
                                                >
                                                    <JoyLink
                                                        href={`mailto:${row.email}`}
                                                        level="body-xs"
                                                        underline="hover"
                                                    >
                                                        {row.email}
                                                    </JoyLink>
                                                </Typography>
                                                <Typography
                                                    level="body-sm"
                                                    sx={{
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient:
                                                            "vertical",
                                                        overflow: "hidden",
                                                        mb: 1,
                                                    }}
                                                >
                                                    {row.message}
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "space-between",
                                                        gap: 0.5,
                                                        mb: 1,
                                                    }}
                                                >
                                                    <Typography level="body-xs">
                                                        {formatDate(
                                                            row.created_at,
                                                        )}
                                                    </Typography>
                                                    <Typography level="body-xs">
                                                        &bull;
                                                    </Typography>
                                                    <Typography level="body-xs">
                                                        № {row.id}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        mb: 1,
                                                    }}
                                                >
                                                    <JoyLink
                                                        level="body-sm"
                                                        component="a"
                                                        href={`mailto:${row.email}?subject=${encodeURIComponent("Re: your message")}`}
                                                    >
                                                        Reply
                                                    </JoyLink>
                                                    <RowMenu submission={row} />
                                                </Box>
                                            </Box>
                                        </ListItemContent>
                                        <StatusChip status={row.status} />
                                    </ListItem>
                                    <ListDivider />
                                </List>
                            ))
                        )}
                    </Box>

                    {data && data.meta.total > 0 && (
                        <React.Fragment>
                            <Box
                                className="Pagination-laptopUp"
                                sx={{
                                    pt: 2,
                                    gap: 1,
                                    [`& .${iconButtonClasses.root}`]: {
                                        borderRadius: "50%",
                                    },
                                    display: { xs: "none", md: "flex" },
                                }}
                            >
                                <Button
                                    size="sm"
                                    variant="outlined"
                                    color="neutral"
                                    disabled={page <= 1 || loading}
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    startDecorator={
                                        <IconChevronLeft
                                            size={16}
                                            stroke={1.75}
                                        />
                                    }
                                >
                                    Previous
                                </Button>

                                <Box sx={{ flex: 1 }} />

                                {pageRange(page, lastPage).map((p, i) =>
                                    p === "…" ? (
                                        <IconButton
                                            key={`ellipsis-${i}`}
                                            size="sm"
                                            variant="plain"
                                            color="neutral"
                                            disabled
                                        >
                                            …
                                        </IconButton>
                                    ) : (
                                        <IconButton
                                            key={p}
                                            size="sm"
                                            variant={
                                                p === page
                                                    ? "solid"
                                                    : "outlined"
                                            }
                                            color={
                                                p === page
                                                    ? "primary"
                                                    : "neutral"
                                            }
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </IconButton>
                                    ),
                                )}

                                <Box sx={{ flex: 1 }} />

                                <Button
                                    size="sm"
                                    variant="outlined"
                                    color="neutral"
                                    disabled={page >= lastPage || loading}
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(lastPage, p + 1),
                                        )
                                    }
                                    endDecorator={
                                        <IconChevronRight
                                            size={16}
                                            stroke={1.75}
                                        />
                                    }
                                >
                                    Next
                                </Button>
                            </Box>

                            <Box
                                className="Pagination-mobile"
                                sx={{
                                    display: { xs: "flex", md: "none" },
                                    alignItems: "center",
                                    py: 2,
                                }}
                            >
                                <IconButton
                                    aria-label="previous page"
                                    variant="outlined"
                                    color="neutral"
                                    size="sm"
                                    disabled={page <= 1 || loading}
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                >
                                    <IconChevronLeft size={16} stroke={1.75} />
                                </IconButton>
                                <Typography level="body-sm" sx={{ mx: "auto" }}>
                                    Page {data.meta.current_page} of {lastPage}
                                </Typography>
                                <IconButton
                                    aria-label="next page"
                                    variant="outlined"
                                    color="neutral"
                                    size="sm"
                                    disabled={page >= lastPage || loading}
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(lastPage, p + 1),
                                        )
                                    }
                                >
                                    <IconChevronRight size={16} stroke={1.75} />
                                </IconButton>
                            </Box>
                        </React.Fragment>
                    )}
                </Box>
            </Box>
        </AuthenticatedLayout>
    );
}
