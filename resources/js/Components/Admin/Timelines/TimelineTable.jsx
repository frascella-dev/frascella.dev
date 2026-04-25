import { useEffect, useState } from "react";
import { Link, router } from "@inertiajs/react";
import Avatar from "@mui/joy/Avatar";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import Chip from "@mui/joy/Chip";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import JoyLink from "@mui/joy/Link";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import ModalDialog from "@mui/joy/ModalDialog";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import Typography from "@mui/joy/Typography";
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconFilter,
    IconSearch,
} from "@tabler/icons-react";

import RowMenu from "@/Components/Admin/Timelines/RowMenu.jsx";
import { kindColor, kindIcon } from "@/Components/Admin/Timelines/kind.jsx";

function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
}

function getComparator(order, orderBy) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function formatDate(iso) {
    if (!iso) return "—";
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

function initialsFrom(text = "") {
    return text.trim().charAt(0).toUpperCase() || "?";
}

export default function TimelineTable({
    entries,
    filters,
    kinds,
    onDelete,
    onMove,
}) {
    const rows = entries?.data ?? [];
    const links = entries?.links ?? [];

    const [order, setOrder] = useState("desc");
    const [selected, setSelected] = useState([]);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [search, setSearch] = useState(filters?.search ?? "");
    const [kind, setKind] = useState(filters?.kind ?? null);

    const submitFilters = () => {
        router.get(
            "/admin/settings/timelines",
            {
                search: search || undefined,
                kind: kind || undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ["entries", "filters"],
            },
        );
        setFiltersOpen(false);
    };

    // Auto-apply on Kind change since it's a single click.
    useEffect(() => {
        if ((kind ?? null) === (filters?.kind ?? null)) return;
        submitFilters();
    }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

    const sortedRows = [...rows].sort(getComparator(order, "year"));

    const renderFilters = () => (
        <>
            <FormControl size="sm">
                <FormLabel>Kind</FormLabel>
                <Select
                    size="sm"
                    placeholder="All"
                    value={kind ?? ""}
                    onChange={(_, value) => setKind(value || null)}
                    slotProps={{ button: { sx: { whiteSpace: "nowrap" } } }}
                >
                    <Option value="">All</Option>
                    {kinds.map((k) => (
                        <Option
                            key={k}
                            value={k}
                            sx={{ textTransform: "capitalize" }}
                        >
                            {k}
                        </Option>
                    ))}
                </Select>
            </FormControl>
        </>
    );

    return (
        <>
            <Sheet
                className="SearchAndFilters-mobile"
                sx={{
                    display: { xs: "flex", sm: "none" },
                    my: 1,
                    gap: 1,
                }}
            >
                <Input
                    size="sm"
                    placeholder="Search"
                    startDecorator={<IconSearch size={16} stroke={1.75} />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") submitFilters();
                    }}
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
                            <Button color="primary" onClick={submitFilters}>
                                Submit
                            </Button>
                        </Sheet>
                    </ModalDialog>
                </Modal>
            </Sheet>
            <Box
                className="SearchAndFilters-tabletUp"
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
                    <FormLabel>Search for entry</FormLabel>
                    <Input
                        size="sm"
                        placeholder="Search"
                        startDecorator={<IconSearch size={16} stroke={1.75} />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") submitFilters();
                        }}
                    />
                </FormControl>
                {renderFilters()}
            </Box>
            <Sheet
                className="TimelineTableContainer"
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
                                    indeterminate={
                                        selected.length > 0 &&
                                        selected.length !== rows.length
                                    }
                                    checked={
                                        rows.length > 0 &&
                                        selected.length === rows.length
                                    }
                                    onChange={(event) => {
                                        setSelected(
                                            event.target.checked
                                                ? rows.map((row) => row.id)
                                                : [],
                                        );
                                    }}
                                    color={
                                        selected.length > 0 ||
                                        selected.length === rows.length
                                            ? "primary"
                                            : undefined
                                    }
                                    sx={{ verticalAlign: "text-bottom" }}
                                />
                            </th>
                            <th
                                style={{ width: 120, padding: "12px 6px" }}
                            >
                                <JoyLink
                                    underline="none"
                                    color="primary"
                                    component="button"
                                    onClick={() =>
                                        setOrder(
                                            order === "asc" ? "desc" : "asc",
                                        )
                                    }
                                    endDecorator={
                                        <IconChevronDown
                                            size={14}
                                            stroke={1.75}
                                        />
                                    }
                                    sx={[
                                        {
                                            fontWeight: "lg",
                                            "& svg": { transition: "0.2s" },
                                        },
                                        order === "desc"
                                            ? {
                                                  "& svg": {
                                                      transform: "rotate(0deg)",
                                                  },
                                              }
                                            : {
                                                  "& svg": {
                                                      transform:
                                                          "rotate(180deg)",
                                                  },
                                              },
                                    ]}
                                >
                                    Year
                                </JoyLink>
                            </th>
                            <th
                                style={{ width: 140, padding: "12px 6px" }}
                            >
                                Updated
                            </th>
                            <th
                                style={{ width: 140, padding: "12px 6px" }}
                            >
                                Kind
                            </th>
                            <th
                                style={{ width: 240, padding: "12px 6px" }}
                            >
                                Title
                            </th>
                            <th
                                style={{ width: 140, padding: "12px 6px" }}
                            >
                                {" "}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.length === 0 && (
                            <tr>
                                <td colSpan={6}>
                                    <Box sx={{ py: 6, textAlign: "center" }}>
                                        <Typography
                                            level="body-sm"
                                            color="neutral"
                                        >
                                            No timeline entries match these
                                            filters.
                                        </Typography>
                                    </Box>
                                </td>
                            </tr>
                        )}
                        {sortedRows.map((row, idx) => (
                            <tr key={row.id}>
                                <td
                                    style={{
                                        textAlign: "center",
                                        width: 120,
                                    }}
                                >
                                    <Checkbox
                                        size="sm"
                                        checked={selected.includes(row.id)}
                                        color={
                                            selected.includes(row.id)
                                                ? "primary"
                                                : undefined
                                        }
                                        onChange={(event) => {
                                            setSelected((ids) =>
                                                event.target.checked
                                                    ? ids.concat(row.id)
                                                    : ids.filter(
                                                          (itemId) =>
                                                              itemId !== row.id,
                                                      ),
                                            );
                                        }}
                                        slotProps={{
                                            checkbox: {
                                                sx: { textAlign: "left" },
                                            },
                                        }}
                                        sx={{ verticalAlign: "text-bottom" }}
                                    />
                                </td>
                                <td>
                                    <Typography level="body-xs">
                                        {row.year}
                                    </Typography>
                                </td>
                                <td>
                                    <Typography level="body-xs">
                                        {formatDate(row.updated_at)}
                                    </Typography>
                                </td>
                                <td>
                                    <Chip
                                        variant="soft"
                                        size="sm"
                                        startDecorator={kindIcon(row.kind)}
                                        color={kindColor(row.kind)}
                                        sx={{ textTransform: "capitalize" }}
                                    >
                                        {row.kind}
                                    </Chip>
                                </td>
                                <td>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gap: 2,
                                            alignItems: "center",
                                        }}
                                    >
                                        <Avatar
                                            size="sm"
                                            src={row.cover_url ?? undefined}
                                        >
                                            {row.cover_url
                                                ? null
                                                : initialsFrom(row.title)}
                                        </Avatar>
                                        <div>
                                            <Typography level="body-xs">
                                                {row.title}
                                            </Typography>
                                            <Typography level="body-xs">
                                                {row.body_excerpt}
                                            </Typography>
                                        </div>
                                    </Box>
                                </td>
                                <td>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gap: 2,
                                            alignItems: "center",
                                        }}
                                    >
                                        <JoyLink
                                            level="body-xs"
                                            component={Link}
                                            href={`/admin/settings/timelines/${row.id}/edit`}
                                        >
                                            Edit
                                        </JoyLink>
                                        <RowMenu
                                            entry={row}
                                            onDelete={onDelete}
                                            onMove={onMove}
                                            isFirst={idx === 0}
                                            isLast={
                                                idx === sortedRows.length - 1
                                            }
                                        />
                                    </Box>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Sheet>
            <Box
                className="Pagination-laptopUp"
                sx={{
                    pt: 2,
                    gap: 1,
                    [`& .${iconButtonClasses.root}`]: {
                        borderRadius: "50%",
                    },
                    display: {
                        xs: "none",
                        md: "flex",
                    },
                }}
            >
                <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    disabled={!links?.[0]?.url}
                    onClick={() =>
                        links?.[0]?.url &&
                        router.visit(links[0].url, { preserveScroll: true })
                    }
                    startDecorator={<IconChevronLeft size={14} stroke={1.75} />}
                >
                    Previous
                </Button>
                <Box sx={{ flex: 1 }} />
                {(links ?? []).slice(1, -1).map((link, i) => {
                    const label = link.label
                        .replace(/&laquo;|&raquo;/g, "")
                        .trim();
                    return (
                        <IconButton
                            key={i}
                            size="sm"
                            variant={link.active ? "solid" : "outlined"}
                            color={link.active ? "primary" : "neutral"}
                            disabled={!link.url}
                            onClick={() =>
                                link.url &&
                                router.visit(link.url, { preserveScroll: true })
                            }
                        >
                            {label}
                        </IconButton>
                    );
                })}
                <Box sx={{ flex: 1 }} />
                <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    disabled={!links?.[links.length - 1]?.url}
                    onClick={() =>
                        links?.[links.length - 1]?.url &&
                        router.visit(links[links.length - 1].url, {
                            preserveScroll: true,
                        })
                    }
                    endDecorator={<IconChevronRight size={14} stroke={1.75} />}
                >
                    Next
                </Button>
            </Box>
        </>
    );
}
