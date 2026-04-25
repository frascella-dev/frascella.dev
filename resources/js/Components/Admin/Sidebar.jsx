import { Link, router, usePage } from "@inertiajs/react";
import GlobalStyles from "@mui/joy/GlobalStyles";
import Avatar from "@mui/joy/Avatar";
import Box from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import IconButton from "@mui/joy/IconButton";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemButton, { listItemButtonClasses } from "@mui/joy/ListItemButton";
import ListItemContent from "@mui/joy/ListItemContent";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import {
    IconLayoutDashboard,
    IconLogout,
    IconUser,
} from "@tabler/icons-react";

import ColorSchemeToggle from "@/Components/Admin/ColorSchemeToggle.jsx";
import Logo from "@/Components/Public/Logo.jsx";
import { closeSidebar } from "@/utils/sidebar";

const NAV_ITEMS = [
    {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: IconLayoutDashboard,
    },
];

function initialsFrom(name = "") {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function Sidebar() {
    const { props, url } = usePage();
    const user = props.auth?.user;

    const isActive = (href) => url === href || url.startsWith(`${href}/`);

    const logout = () => {
        router.post("/admin/logout");
    };

    // Close the off-canvas drawer after an entry is tapped so mobile users
    // aren't stuck with the overlay covering the page they just loaded.
    const handleNavClick = () => {
        closeSidebar();
    };

    return (
        <Sheet
            className="Sidebar"
            sx={{
                position: { xs: "fixed", md: "sticky" },
                transform: {
                    xs: "translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1)))",
                    md: "none",
                },
                transition: "transform 0.4s, width 0.4s",
                zIndex: 1000,
                height: "100dvh",
                width: "var(--Sidebar-width)",
                top: 0,
                p: 2,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                borderRight: "1px solid",
                borderColor: "divider",
            }}
        >
            <GlobalStyles
                styles={(theme) => ({
                    ":root": {
                        "--Sidebar-width": "220px",
                        [theme.breakpoints.up("lg")]: {
                            "--Sidebar-width": "240px",
                        },
                    },
                })}
            />
            <Box
                className="Sidebar-overlay"
                sx={{
                    position: "fixed",
                    zIndex: 9998,
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    opacity: "var(--SideNavigation-slideIn)",
                    backgroundColor: "var(--joy-palette-background-backdrop)",
                    transition: "opacity 0.4s",
                    transform: {
                        xs: "translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1) + var(--SideNavigation-slideIn, 0) * var(--Sidebar-width, 0px)))",
                        lg: "translateX(-100%)",
                    },
                }}
                onClick={() => closeSidebar()}
            />
            <Box
                component={Link}
                href="/admin/dashboard"
                onClick={handleNavClick}
                sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                }}
            >
                <Logo />
                <ColorSchemeToggle sx={{ ml: "auto" }} />
            </Box>
            <Box
                sx={{
                    minHeight: 0,
                    overflow: "hidden auto",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    [`& .${listItemButtonClasses.root}`]: { gap: 1.5 },
                }}
            >
                <List
                    size="sm"
                    sx={{
                        gap: 1,
                        "--List-nestedInsetStart": "30px",
                        "--ListItem-radius": (theme) => theme.vars.radius.sm,
                    }}
                >
                    {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
                        <ListItem key={href}>
                            <ListItemButton
                                component={Link}
                                href={href}
                                selected={isActive(href)}
                                onClick={handleNavClick}
                            >
                                <Icon size={20} stroke={1.75} />
                                <ListItemContent>
                                    <Typography level="title-sm">
                                        {label}
                                    </Typography>
                                </ListItemContent>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Box
                    component={Link}
                    href="/admin/profile"
                    onClick={handleNavClick}
                    sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        flex: 1,
                        minWidth: 0,
                        textDecoration: "none",
                        color: "inherit",
                        borderRadius: "sm",
                        p: 0.5,
                        "&:hover": {
                            backgroundColor: "background.level1",
                        },
                    }}
                >
                    <Avatar
                        variant="outlined"
                        size="sm"
                        src={user?.avatar_url ?? undefined}
                        color={
                            isActive("/admin/profile") ? "primary" : "neutral"
                        }
                    >
                        {user?.name ? (
                            initialsFrom(user.name)
                        ) : (
                            <IconUser size={16} stroke={1.75} />
                        )}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography level="title-sm" noWrap>
                            {user?.name ?? "Profile"}
                        </Typography>
                        <Typography level="body-xs" noWrap>
                            {user?.email ?? ""}
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    size="sm"
                    variant="plain"
                    color="neutral"
                    onClick={logout}
                    aria-label="Sign out"
                >
                    <IconLogout size={18} stroke={1.75} />
                </IconButton>
            </Box>
        </Sheet>
    );
}
