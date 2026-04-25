import { Link } from "@inertiajs/react";
import Divider from "@mui/joy/Divider";
import Dropdown from "@mui/joy/Dropdown";
import IconButton from "@mui/joy/IconButton";
import Menu from "@mui/joy/Menu";
import MenuButton from "@mui/joy/MenuButton";
import MenuItem from "@mui/joy/MenuItem";
import {
    IconArrowDown,
    IconArrowUp,
    IconDots,
    IconPencil,
    IconTrash,
} from "@tabler/icons-react";

/**
 * Per-row menu in the Timelines table / list. Mirrors the template's RowMenu
 * but wires Edit to the admin route, exposes the move-up / move-down actions
 * (Settings reorder is the timeline's "Move" / "Rename" equivalent), and
 * delegates Delete back to the page-level confirmation dialog.
 */
export default function RowMenu({
    entry,
    onDelete,
    onMove,
    isFirst = false,
    isLast = false,
}) {
    return (
        <Dropdown>
            <MenuButton
                slots={{ root: IconButton }}
                slotProps={{
                    root: { variant: "plain", color: "neutral", size: "sm" },
                }}
            >
                <IconDots size={16} stroke={1.75} />
            </MenuButton>
            <Menu size="sm" sx={{ minWidth: 160 }}>
                <MenuItem
                    component={Link}
                    href={`/admin/settings/timelines/${entry.id}/edit`}
                >
                    <IconPencil size={14} stroke={1.75} /> Edit
                </MenuItem>
                <MenuItem disabled={isFirst} onClick={() => onMove(entry, "up")}>
                    <IconArrowUp size={14} stroke={1.75} /> Move up
                </MenuItem>
                <MenuItem disabled={isLast} onClick={() => onMove(entry, "down")}>
                    <IconArrowDown size={14} stroke={1.75} /> Move down
                </MenuItem>
                <Divider />
                <MenuItem color="danger" onClick={() => onDelete(entry)}>
                    <IconTrash size={14} stroke={1.75} /> Delete
                </MenuItem>
            </Menu>
        </Dropdown>
    );
}
