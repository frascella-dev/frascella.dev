import { Link, router } from "@inertiajs/react";
import Avatar from "@mui/joy/Avatar";
import Box from "@mui/joy/Box";
import Chip from "@mui/joy/Chip";
import IconButton from "@mui/joy/IconButton";
import JoyLink from "@mui/joy/Link";
import List from "@mui/joy/List";
import ListDivider from "@mui/joy/ListDivider";
import ListItem from "@mui/joy/ListItem";
import ListItemContent from "@mui/joy/ListItemContent";
import ListItemDecorator from "@mui/joy/ListItemDecorator";
import Typography from "@mui/joy/Typography";
import {
    IconChevronLeft,
    IconChevronRight,
} from "@tabler/icons-react";

import RowMenu from "@/Components/Admin/Timelines/RowMenu.jsx";
import { kindColor, kindIcon } from "@/Components/Admin/Timelines/kind.jsx";

function initialsFrom(text = "") {
    return text.trim().charAt(0).toUpperCase() || "?";
}

export default function TimelineList({ entries, onDelete, onMove }) {
    const rows = entries?.data ?? [];
    const meta = entries?.meta ?? {};
    const links = entries?.links ?? [];

    return (
        <Box sx={{ display: { xs: "block", sm: "none" } }}>
            {rows.length === 0 && (
                <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography level="body-sm" color="neutral">
                        No timeline entries match these filters.
                    </Typography>
                </Box>
            )}
            {rows.map((row, idx) => (
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
                                <Avatar
                                    size="sm"
                                    src={row.cover_url ?? undefined}
                                >
                                    {row.cover_url
                                        ? null
                                        : initialsFrom(row.title)}
                                </Avatar>
                            </ListItemDecorator>
                            <div>
                                <Typography
                                    gutterBottom
                                    sx={{ fontWeight: 600 }}
                                >
                                    {row.title}
                                </Typography>
                                <Typography level="body-xs" gutterBottom>
                                    {row.body_excerpt}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 0.5,
                                        mb: 1,
                                    }}
                                >
                                    <Typography level="body-xs">
                                        {row.year}
                                    </Typography>
                                    <Typography level="body-xs">
                                        &bull;
                                    </Typography>
                                    <Typography level="body-xs">
                                        {row.pictures_count} pic
                                        {row.pictures_count === 1 ? "" : "s"}
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
                                        isLast={idx === rows.length - 1}
                                    />
                                </Box>
                            </div>
                        </ListItemContent>
                        <Chip
                            variant="soft"
                            size="sm"
                            startDecorator={kindIcon(row.kind)}
                            color={kindColor(row.kind)}
                            sx={{ textTransform: "capitalize" }}
                        >
                            {row.kind}
                        </Chip>
                    </ListItem>
                    <ListDivider />
                </List>
            ))}
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
                    disabled={!links?.[0]?.url}
                    onClick={() =>
                        links?.[0]?.url &&
                        router.visit(links[0].url, { preserveScroll: true })
                    }
                >
                    <IconChevronLeft size={14} stroke={1.75} />
                </IconButton>
                <Typography level="body-sm" sx={{ mx: "auto" }}>
                    Page {meta.current_page ?? 1} of {meta.last_page ?? 1}
                </Typography>
                <IconButton
                    aria-label="next page"
                    variant="outlined"
                    color="neutral"
                    size="sm"
                    disabled={!links?.[links.length - 1]?.url}
                    onClick={() =>
                        links?.[links.length - 1]?.url &&
                        router.visit(links[links.length - 1].url, {
                            preserveScroll: true,
                        })
                    }
                >
                    <IconChevronRight size={14} stroke={1.75} />
                </IconButton>
            </Box>
        </Box>
    );
}
