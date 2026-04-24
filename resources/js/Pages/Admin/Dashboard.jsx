import { Head, Link, usePage } from "@inertiajs/react";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Card from "@mui/joy/Card";
import Chip from "@mui/joy/Chip";
import JoyLink from "@mui/joy/Link";
import LinearProgress from "@mui/joy/LinearProgress";
import Stack from "@mui/joy/Stack";
import Tab, { tabClasses } from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";
import {
    IconBrandChrome,
    IconCalendarEvent,
    IconChevronRight,
    IconClick,
    IconDeviceAnalytics,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconDeviceTablet,
    IconEye,
    IconHome,
    IconLink,
    IconMapPin,
    IconRobot,
    IconRoute,
    IconUsers,
} from "@tabler/icons-react";

import AdminDashboardLayout from "@/Layouts/AdminDashboardLayout.jsx";

const numberFormatter = new Intl.NumberFormat();

function format(n) {
    return numberFormatter.format(Number(n ?? 0));
}

function StatCard({ icon: Icon, label, value, hint, tone = "primary" }) {
    return (
        <Card variant="outlined" sx={{ flex: 1, minWidth: 0 }}>
            <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "flex-start" }}
            >
                <Box
                    sx={{
                        p: 1,
                        borderRadius: "sm",
                        bgcolor: `${tone}.softBg`,
                        color: `${tone}.softColor`,
                        display: "flex",
                    }}
                >
                    <Icon size={20} stroke={1.75} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        level="body-xs"
                        sx={{
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "text.tertiary",
                        }}
                    >
                        {label}
                    </Typography>
                    <Typography level="h2" sx={{ mt: 0.25, lineHeight: 1.1 }}>
                        {format(value)}
                    </Typography>
                    {hint && (
                        <Typography
                            level="body-xs"
                            color="neutral"
                            sx={{ mt: 0.25 }}
                            noWrap
                        >
                            {hint}
                        </Typography>
                    )}
                </Box>
            </Stack>
        </Card>
    );
}

function SparklineCard({ daily, windowDays }) {
    const max = daily.reduce((m, d) => Math.max(m, Number(d.visits)), 0) || 1;
    const total = daily.reduce((sum, d) => sum + Number(d.visits), 0);
    return (
        <Card variant="outlined">
            <Stack
                direction="row"
                spacing={1}
                sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                    flexWrap: "wrap",
                }}
            >
                <Box>
                    <Typography level="title-md">
                        Visits over the last {windowDays} days
                    </Typography>
                    <Typography level="body-sm" color="neutral">
                        {format(total)} total visits
                    </Typography>
                </Box>
            </Stack>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "2px",
                    height: { xs: 100, md: 140 },
                    width: "100%",
                }}
            >
                {daily.map((d) => {
                    const h = (Number(d.visits) / max) * 100;
                    return (
                        <Box
                            key={d.day}
                            title={`${d.day}: ${format(d.visits)}`}
                            sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                height: "100%",
                            }}
                        >
                            <Box
                                sx={{
                                    height: `${Math.max(h, d.visits > 0 ? 4 : 0)}%`,
                                    bgcolor:
                                        d.visits > 0
                                            ? "primary.400"
                                            : "neutral.softBg",
                                    borderRadius: "2px",
                                    transition: "height 0.2s",
                                }}
                            />
                        </Box>
                    );
                })}
            </Box>
            <Stack
                direction="row"
                sx={{
                    justifyContent: "space-between",
                    mt: 1,
                }}
            >
                <Typography level="body-xs" color="neutral">
                    {daily[0]?.day}
                </Typography>
                <Typography level="body-xs" color="neutral">
                    {daily[daily.length - 1]?.day}
                </Typography>
            </Stack>
        </Card>
    );
}

function RankedList({
    icon: Icon,
    title,
    subtitle,
    items,
    labelKey,
    valueLabel = "visits",
}) {
    const max = items.reduce((m, it) => Math.max(m, Number(it.visits)), 0) || 1;
    return (
        <Card variant="outlined" sx={{ minWidth: 0 }}>
            <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", mb: 1 }}
            >
                <Box
                    sx={{
                        p: 0.75,
                        borderRadius: "sm",
                        bgcolor: "neutral.softBg",
                        color: "neutral.softColor",
                        display: "flex",
                    }}
                >
                    <Icon size={18} stroke={1.75} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography level="title-md">{title}</Typography>
                    {subtitle && (
                        <Typography level="body-xs" color="neutral">
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </Stack>
            {items.length === 0 ? (
                <Typography level="body-sm" color="neutral">
                    No data yet.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {items.map((item, idx) => {
                        const value = Number(item.visits);
                        const percent = (value / max) * 100;
                        return (
                            <Box key={`${item[labelKey]}-${idx}`}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Typography
                                        level="body-sm"
                                        sx={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            flex: 1,
                                            minWidth: 0,
                                        }}
                                        title={item[labelKey]}
                                    >
                                        {item[labelKey] || "—"}
                                    </Typography>
                                    <Typography level="body-sm" color="neutral">
                                        {format(value)} {valueLabel}
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    determinate
                                    value={percent}
                                    sx={{
                                        mt: 0.5,
                                        "--LinearProgress-thickness": "4px",
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Card>
    );
}

function DeviceCard({ breakdown }) {
    const iconFor = (type) =>
        ({
            mobile: IconDeviceMobile,
            tablet: IconDeviceTablet,
            desktop: IconDeviceDesktop,
            bot: IconRobot,
        })[type] ?? IconDeviceAnalytics;

    return (
        <Card variant="outlined" sx={{ minWidth: 0 }}>
            <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", mb: 1 }}
            >
                <Box
                    sx={{
                        p: 0.75,
                        borderRadius: "sm",
                        bgcolor: "neutral.softBg",
                        color: "neutral.softColor",
                        display: "flex",
                    }}
                >
                    <IconDeviceAnalytics size={18} stroke={1.75} />
                </Box>
                <Typography level="title-md">Devices</Typography>
            </Stack>
            {breakdown.length === 0 ? (
                <Typography level="body-sm" color="neutral">
                    No data yet.
                </Typography>
            ) : (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    {breakdown.map((b) => {
                        const Icon = iconFor(b.device_type);
                        return (
                            <Chip
                                key={b.device_type}
                                variant="soft"
                                color="neutral"
                                startDecorator={
                                    <Icon size={14} stroke={1.75} />
                                }
                                sx={{ textTransform: "capitalize" }}
                            >
                                {b.device_type}: {format(b.visits)}
                            </Chip>
                        );
                    })}
                </Stack>
            )}
        </Card>
    );
}

export default function Dashboard() {
    const page = usePage();
    const user = page.props.auth?.user;
    const metrics = page.props.metrics;
    const firstName = user?.name?.split(/\s+/)[0] ?? "there";

    return (
        <AdminDashboardLayout>
            <Head title="Admin · Dashboard" />
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
                                Dashboard
                            </Typography>
                        </Breadcrumbs>
                        <Typography
                            level="h2"
                            component="h1"
                            sx={{ mt: 1, mb: 0.5 }}
                        >
                            Welcome back, {firstName}
                        </Typography>
                        <Typography
                            level="body-sm"
                            color="neutral"
                            sx={{ mb: 2 }}
                        >
                            Activity from the last {metrics?.windowDays ?? 30}{" "}
                            days.
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
                                Overview
                            </Tab>
                        </TabList>
                    </Tabs>
                </Box>
                <Stack
                    spacing={3}
                    sx={{
                        maxWidth: "1200px",
                        mx: "auto",
                        px: { xs: 2, md: 6 },
                        py: { xs: 2, md: 3 },
                        width: "100%",
                    }}
                >
                    {/* Stat cards */}
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                                lg: "repeat(4, 1fr)",
                            },
                        }}
                    >
                        <StatCard
                            icon={IconEye}
                            label={`Visits · ${metrics?.windowDays ?? 30}d`}
                            value={metrics?.totals?.visits}
                            hint="Human sessions"
                        />
                        <StatCard
                            icon={IconUsers}
                            label={`Unique · ${metrics?.windowDays ?? 30}d`}
                            value={metrics?.totals?.uniqueVisitors}
                            hint="Distinct IP fingerprints"
                            tone="success"
                        />
                        <StatCard
                            icon={IconCalendarEvent}
                            label="Today"
                            value={metrics?.totals?.visitsToday}
                            hint={`${format(metrics?.totals?.uniqueVisitorsToday)} unique`}
                            tone="warning"
                        />
                        <StatCard
                            icon={IconRobot}
                            label="Bot hits"
                            value={metrics?.totals?.botHits}
                            hint="Excluded from human metrics"
                            tone="neutral"
                        />
                    </Box>

                    {/* Daily chart */}
                    {metrics?.daily && (
                        <SparklineCard
                            daily={metrics.daily}
                            windowDays={metrics.windowDays}
                        />
                    )}

                    {/* Ranked lists */}
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, 1fr)",
                            },
                        }}
                    >
                        <RankedList
                            icon={IconRoute}
                            title="Top pages"
                            subtitle="Most visited paths"
                            items={metrics?.topPaths ?? []}
                            labelKey="path"
                        />
                        <RankedList
                            icon={IconLink}
                            title="Top referrers"
                            subtitle="External sources"
                            items={metrics?.topReferrers ?? []}
                            labelKey="referrer_host"
                        />
                        <RankedList
                            icon={IconBrandChrome}
                            title="Browsers"
                            items={metrics?.topBrowsers ?? []}
                            labelKey="browser"
                        />
                        <RankedList
                            icon={IconDeviceAnalytics}
                            title="Operating systems"
                            items={metrics?.topOs ?? []}
                            labelKey="os"
                        />
                        <RankedList
                            icon={IconClick}
                            title="UTM sources"
                            subtitle="Tagged campaigns"
                            items={metrics?.topUtmSources ?? []}
                            labelKey="utm_source"
                        />
                        <RankedList
                            icon={IconMapPin}
                            title="Countries"
                            items={metrics?.topCountries ?? []}
                            labelKey="country"
                        />
                    </Box>

                    <DeviceCard breakdown={metrics?.deviceBreakdown ?? []} />
                </Stack>
            </Box>
        </AdminDashboardLayout>
    );
}
