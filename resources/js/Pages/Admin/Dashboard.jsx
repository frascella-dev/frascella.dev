import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import Chip from "@mui/joy/Chip";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import JoyLink from "@mui/joy/Link";
import LinearProgress from "@mui/joy/LinearProgress";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Switch from "@mui/joy/Switch";
import Tab, { tabClasses } from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import TabPanel from "@mui/joy/TabPanel";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";
import {
    IconActivity,
    IconArrowDownRight,
    IconArrowUpRight,
    IconBrandChrome,
    IconBrowser,
    IconChevronRight,
    IconClick,
    IconClock,
    IconDeviceAnalytics,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconDeviceTablet,
    IconExternalLink,
    IconEye,
    IconHome,
    IconLink,
    IconMapPin,
    IconRefresh,
    IconRobot,
    IconRoute,
    IconUsers,
} from "@tabler/icons-react";

import AdminDashboardLayout from "@/Layouts/AdminDashboardLayout.jsx";

/* ---------- formatting helpers ---------- */

const numberFormatter = new Intl.NumberFormat();

function formatNumber(n) {
    return numberFormatter.format(Number(n ?? 0));
}

function formatDelta(pct, betterWhenLower) {
    if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
    const improving = betterWhenLower ? pct < 0 : pct > 0;
    const worsening = betterWhenLower ? pct > 0 : pct < 0;
    const color = improving ? "success" : worsening ? "danger" : "neutral";
    const Arrow = pct >= 0 ? IconArrowUpRight : IconArrowDownRight;
    return { pct, color, Arrow };
}

/* ---------- URL + router helpers ---------- */

const TAB_VALUES = [
    "overview",
    "audience",
    "acquisition",
    "performance",
    "events",
];

function readInitialTab() {
    if (typeof window === "undefined") return "overview";
    const value = new URLSearchParams(window.location.search).get("tab");
    return TAB_VALUES.includes(value) ? value : "overview";
}

function persistTabInUrl(next) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (next === "overview") {
        params.delete("tab");
    } else {
        params.set("tab", next);
    }
    const qs = params.toString();
    const url = qs
        ? `${window.location.pathname}?${qs}`
        : window.location.pathname;
    // replaceState so the back button doesn't fill up with tab clicks.
    window.history.replaceState({}, "", url);
}

function reloadMetrics(data) {
    router.visit("/admin/dashboard", {
        data,
        preserveScroll: true,
        preserveState: true,
        only: ["metrics"],
    });
}

/* ---------- shared section title ---------- */

function SectionHeader({ icon: Icon, title, subtitle }) {
    return (
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
    );
}

/* ---------- cards ---------- */

function StatCard({ icon: Icon, label, stat, hint, tone = "primary" }) {
    const value = typeof stat === "object" && stat !== null ? stat.value : stat;
    const delta =
        typeof stat === "object" && stat !== null
            ? formatDelta(stat.deltaPct, stat.betterWhenLower)
            : null;

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
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "baseline",
                            mt: 0.25,
                            flexWrap: "wrap",
                        }}
                    >
                        <Typography level="h2" sx={{ lineHeight: 1.1 }}>
                            {value === null || value === undefined
                                ? "—"
                                : formatNumber(value)}
                        </Typography>
                        {delta && (
                            <Chip
                                size="sm"
                                color={delta.color}
                                variant="soft"
                                startDecorator={
                                    <delta.Arrow size={12} stroke={2} />
                                }
                                sx={{ fontWeight: 600 }}
                            >
                                {Math.abs(delta.pct)}%
                            </Chip>
                        )}
                    </Stack>
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

function TimeseriesCard({ series, label, grain }) {
    const max = series.reduce((m, d) => Math.max(m, Number(d.visits)), 0) || 1;
    const total = series.reduce((sum, d) => sum + Number(d.visits), 0);

    return (
        <Card variant="outlined">
            <SectionHeader
                icon={IconActivity}
                title={`Traffic · ${label}`}
                subtitle={`${formatNumber(total)} total visits · ${
                    grain === "hour" ? "per hour" : "per day"
                }`}
            />
            <Box
                sx={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "2px",
                    height: { xs: 120, md: 180 },
                    width: "100%",
                }}
            >
                {series.map((d) => {
                    const h = (Number(d.visits) / max) * 100;
                    return (
                        <Box
                            key={d.bucket}
                            title={`${d.label}: ${formatNumber(d.visits)}`}
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
                sx={{ justifyContent: "space-between", mt: 1 }}
            >
                <Typography level="body-xs" color="neutral">
                    {series[0]?.label}
                </Typography>
                <Typography level="body-xs" color="neutral">
                    {series[series.length - 1]?.label}
                </Typography>
            </Stack>
        </Card>
    );
}

function HourOfDayCard({ buckets }) {
    const max = buckets.reduce((m, b) => Math.max(m, b.visits), 0) || 1;

    return (
        <Card variant="outlined">
            <SectionHeader
                icon={IconClock}
                title="Hour of day"
                subtitle="When visitors arrive (server timezone)"
            />
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(24, 1fr)",
                    gap: "2px",
                    alignItems: "end",
                    height: 120,
                }}
            >
                {buckets.map((b) => {
                    const h = (b.visits / max) * 100;
                    return (
                        <Box
                            key={b.hour}
                            title={`${b.label}: ${formatNumber(b.visits)}`}
                            sx={{
                                height: `${Math.max(h, b.visits > 0 ? 6 : 2)}%`,
                                bgcolor:
                                    b.visits > 0
                                        ? "primary.400"
                                        : "neutral.softBg",
                                borderRadius: "2px",
                            }}
                        />
                    );
                })}
            </Box>
            <Stack
                direction="row"
                sx={{ justifyContent: "space-between", mt: 0.5 }}
            >
                {[0, 6, 12, 18, 23].map((h) => (
                    <Typography key={h} level="body-xs" color="neutral">
                        {String(h).padStart(2, "0")}
                    </Typography>
                ))}
            </Stack>
        </Card>
    );
}

function SplitCard({ title, icon, left, right, leftLabel, rightLabel }) {
    const total = (left || 0) + (right || 0);
    const leftPct = total > 0 ? (left / total) * 100 : 0;
    const rightPct = total > 0 ? (right / total) * 100 : 0;

    return (
        <Card variant="outlined" sx={{ minWidth: 0 }}>
            <SectionHeader icon={icon} title={title} />
            {total === 0 ? (
                <Typography level="body-sm" color="neutral">
                    No data yet.
                </Typography>
            ) : (
                <>
                    <Stack
                        direction="row"
                        sx={{
                            height: 8,
                            borderRadius: "sm",
                            overflow: "hidden",
                            mb: 1,
                        }}
                    >
                        <Box
                            sx={{
                                width: `${leftPct}%`,
                                bgcolor: "primary.400",
                            }}
                        />
                        <Box
                            sx={{
                                width: `${rightPct}%`,
                                bgcolor: "neutral.400",
                            }}
                        />
                    </Stack>
                    <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between" }}
                    >
                        <Box>
                            <Typography level="title-sm">
                                {formatNumber(left)}
                            </Typography>
                            <Typography level="body-xs" color="neutral">
                                {leftLabel} · {leftPct.toFixed(0)}%
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                            <Typography level="title-sm">
                                {formatNumber(right)}
                            </Typography>
                            <Typography level="body-xs" color="neutral">
                                {rightLabel} · {rightPct.toFixed(0)}%
                            </Typography>
                        </Box>
                    </Stack>
                </>
            )}
        </Card>
    );
}

function ResponseTimeCard({ data }) {
    return (
        <Card variant="outlined" sx={{ minWidth: 0 }}>
            <SectionHeader icon={IconActivity} title="Response time" />
            {data.avg === null || data.avg === undefined ? (
                <Typography level="body-sm" color="neutral">
                    No data yet.
                </Typography>
            ) : (
                <Stack
                    direction="row"
                    spacing={3}
                    sx={{ flexWrap: "wrap", gap: 2 }}
                >
                    <Box>
                        <Typography level="title-lg">{data.avg} ms</Typography>
                        <Typography level="body-xs" color="neutral">
                            avg
                        </Typography>
                    </Box>
                    <Box>
                        <Typography level="title-lg">{data.p95} ms</Typography>
                        <Typography level="body-xs" color="neutral">
                            p95
                        </Typography>
                    </Box>
                    <Box>
                        <Typography level="title-lg">{data.max} ms</Typography>
                        <Typography level="body-xs" color="neutral">
                            max
                        </Typography>
                    </Box>
                </Stack>
            )}
        </Card>
    );
}

function BounceRateCard({ data }) {
    return (
        <Card variant="outlined" sx={{ minWidth: 0 }}>
            <SectionHeader icon={IconRefresh} title="Bounce rate" />
            {data.rate === null || data.rate === undefined ? (
                <Typography level="body-sm" color="neutral">
                    No data yet.
                </Typography>
            ) : (
                <>
                    <Typography level="h2">{data.rate}%</Typography>
                    <Typography level="body-xs" color="neutral">
                        {formatNumber(data.bounces)} bounced of{" "}
                        {formatNumber(data.sessions)} sessions
                    </Typography>
                </>
            )}
        </Card>
    );
}

function StatusCodeCard({ rows }) {
    const total = rows.reduce((s, r) => s + r.visits, 0);
    const colorFor = (bucket) =>
        bucket >= 500
            ? "danger"
            : bucket >= 400
              ? "warning"
              : bucket >= 300
                ? "neutral"
                : "success";

    return (
        <Card variant="outlined" sx={{ minWidth: 0 }}>
            <SectionHeader icon={IconBrowser} title="Status codes" />
            {rows.length === 0 ? (
                <Typography level="body-sm" color="neutral">
                    No data yet.
                </Typography>
            ) : (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    {rows.map((r) => (
                        <Chip
                            key={r.bucket}
                            color={colorFor(r.bucket)}
                            variant="soft"
                        >
                            {r.label}: {formatNumber(r.visits)}
                            {total > 0 && (
                                <Typography level="body-xs" sx={{ ml: 0.5 }}>
                                    ({((r.visits / total) * 100).toFixed(0)}%)
                                </Typography>
                            )}
                        </Chip>
                    ))}
                </Stack>
            )}
        </Card>
    );
}

function RankedList({
    icon,
    title,
    subtitle,
    items,
    labelKey,
    valueLabel = "visits",
}) {
    const max =
        items.reduce((m, it) => Math.max(m, Number(it.visits ?? it.hits)), 0) ||
        1;

    return (
        <Card variant="outlined" sx={{ minWidth: 0 }}>
            <SectionHeader icon={icon} title={title} subtitle={subtitle} />
            {items.length === 0 ? (
                <Typography level="body-sm" color="neutral">
                    No data yet.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {items.map((item, idx) => {
                        const raw = Number(item.visits ?? item.hits);
                        const percent = (raw / max) * 100;
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
                                        {formatNumber(raw)} {valueLabel}
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
            <SectionHeader icon={IconDeviceAnalytics} title="Devices" />
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
                                {b.device_type}: {formatNumber(b.visits)}
                            </Chip>
                        );
                    })}
                </Stack>
            )}
        </Card>
    );
}

/* ---------- page ---------- */

// Only padding here — setting `display: flex` in sx would beat the UA
// `[hidden] { display: none }` rule that Joy UI uses to hide inactive panels,
// and every tab you clicked would stay visible and stack below.
const PANEL_SX = {
    p: 0,
    pt: 3,
};

const PANEL_STACK_SPACING = 3;

const GRID_2 = {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
};

const GRID_3 = {
    display: "grid",
    gap: 2,
    gridTemplateColumns: {
        xs: "1fr",
        md: "repeat(2, 1fr)",
        lg: "repeat(3, 1fr)",
    },
};

const GRID_4 = {
    display: "grid",
    gap: 2,
    gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, 1fr)",
        lg: "repeat(4, 1fr)",
    },
};

export default function Dashboard() {
    const page = usePage();
    const user = page.props.auth?.user;
    const metrics = page.props.metrics;
    const firstName = user?.name?.split(/\s+/)[0] ?? "there";
    const [tab, setTab] = useState(readInitialTab);

    const handleTab = (_, value) => {
        if (!value) return;
        setTab(value);
        persistTabInUrl(value);
    };

    const handleRange = (_, value) => {
        if (!value) return;
        reloadMetrics({
            range: value,
            bots: metrics?.includeBots ? 1 : 0,
        });
    };

    const handleBots = (checked) => {
        reloadMetrics({
            range: metrics?.range ?? "30d",
            bots: checked ? 1 : 0,
        });
    };

    return (
        <AdminDashboardLayout>
            <Head title="Admin · Dashboard" />
            <Tabs
                value={tab}
                onChange={handleTab}
                sx={{ bgcolor: "transparent" }}
            >
                <Box sx={{ flex: 1, width: "100%" }}>
                    {/* ── Sticky header: breadcrumbs + title row + tabs ── */}
                    <Box
                        sx={{
                            position: "sticky",
                            top: { xs: -100, md: -110 },
                            bgcolor: "background.body",
                            zIndex: 9995,
                        }}
                    >
                        <Box
                            sx={{
                                px: { xs: 2, md: 6 },
                                pt: { xs: 2, md: 0 },
                            }}
                        >
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
                                direction={{ xs: "column", md: "row" }}
                                spacing={{ xs: 1.5, md: 2 }}
                                sx={{
                                    mt: 1,
                                    mb: 2,
                                    alignItems: {
                                        xs: "stretch",
                                        md: "flex-end",
                                    },
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
                                        {metrics?.label ?? "Activity"} ·{" "}
                                        {metrics?.grain === "hour"
                                            ? "hourly"
                                            : "daily"}{" "}
                                        granularity
                                    </Typography>
                                </Box>
                                <Stack
                                    direction="row"
                                    spacing={1.5}
                                    sx={{
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Select
                                        size="sm"
                                        value={metrics?.range ?? "30d"}
                                        onChange={handleRange}
                                        sx={{ minWidth: 180 }}
                                    >
                                        {(metrics?.ranges ?? []).map((r) => (
                                            <Option
                                                key={r.value}
                                                value={r.value}
                                            >
                                                {r.label}
                                            </Option>
                                        ))}
                                    </Select>
                                    <FormControl
                                        orientation="horizontal"
                                        sx={{ gap: 1 }}
                                    >
                                        <Switch
                                            size="sm"
                                            checked={Boolean(
                                                metrics?.includeBots,
                                            )}
                                            onChange={(e) =>
                                                handleBots(e.target.checked)
                                            }
                                        />
                                        <FormLabel sx={{ fontSize: "sm" }}>
                                            Bots
                                        </FormLabel>
                                    </FormControl>
                                    <Button
                                        component="a"
                                        href="/"
                                        target="_blank"
                                        rel="noopener"
                                        size="sm"
                                        variant="outlined"
                                        color="neutral"
                                        startDecorator={
                                            <IconExternalLink
                                                size={16}
                                                stroke={1.75}
                                            />
                                        }
                                    >
                                        View site
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>

                        <TabList
                            size="sm"
                            sx={{
                                pl: { xs: 2, md: 4 },
                                pr: { xs: 2, md: 4 },
                                justifyContent: "flex-start",
                                // Let the list scroll horizontally when it
                                // overflows the viewport on small screens.
                                overflowX: "auto",
                                overflowY: "hidden",
                                flexWrap: "nowrap",
                                scrollbarWidth: "none",
                                "&::-webkit-scrollbar": { display: "none" },
                                [`&& .${tabClasses.root}`]: {
                                    fontWeight: 600,
                                    // Content-sized, never shrink — combined
                                    // with overflowX on the container this is
                                    // what actually makes the bar scrollable.
                                    flex: "0 0 auto",
                                    whiteSpace: "nowrap",
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
                                value="overview"
                                indicatorInset
                                sx={{ borderRadius: "6px 6px 0 0" }}
                            >
                                Overview
                            </Tab>
                            <Tab
                                value="audience"
                                indicatorInset
                                sx={{ borderRadius: "6px 6px 0 0" }}
                            >
                                Audience
                            </Tab>
                            <Tab
                                value="acquisition"
                                indicatorInset
                                sx={{ borderRadius: "6px 6px 0 0" }}
                            >
                                Acquisition
                            </Tab>
                            <Tab
                                value="performance"
                                indicatorInset
                                sx={{ borderRadius: "6px 6px 0 0" }}
                            >
                                Performance
                            </Tab>
                            <Tab
                                value="events"
                                indicatorInset
                                sx={{ borderRadius: "6px 6px 0 0" }}
                            >
                                Events
                            </Tab>
                        </TabList>
                    </Box>

                    {/* ── Panel content ── */}
                    <Box
                        sx={{
                            maxWidth: "1200px",
                            mx: "auto",
                            px: { xs: 2, md: 6 },
                            py: { xs: 2, md: 3 },
                            width: "100%",
                        }}
                    >
                        <TabPanel value="overview" sx={PANEL_SX}>
                            <Stack spacing={PANEL_STACK_SPACING}>
                                <Box sx={GRID_4}>
                                    <StatCard
                                        icon={IconEye}
                                        label="Visits"
                                        stat={metrics?.totals?.visits}
                                        hint="vs previous period"
                                    />
                                    <StatCard
                                        icon={IconUsers}
                                        label="Unique visitors"
                                        stat={metrics?.totals?.uniqueVisitors}
                                        hint="Distinct IP fingerprints"
                                        tone="success"
                                    />
                                    <StatCard
                                        icon={IconClock}
                                        label="Avg response"
                                        stat={
                                            metrics?.totals?.avgResponseTimeMs
                                        }
                                        hint="Milliseconds"
                                        tone="warning"
                                    />
                                    <StatCard
                                        icon={IconRobot}
                                        label="Bot hits"
                                        stat={metrics?.totals?.botHits}
                                        hint="Automated traffic"
                                        tone="neutral"
                                    />
                                </Box>
                                {metrics?.timeseries && (
                                    <TimeseriesCard
                                        series={metrics.timeseries}
                                        label={metrics.label}
                                        grain={metrics.grain}
                                    />
                                )}
                                <DeviceCard
                                    breakdown={metrics?.deviceBreakdown ?? []}
                                />
                            </Stack>
                        </TabPanel>

                        <TabPanel value="audience" sx={PANEL_SX}>
                            <Stack spacing={PANEL_STACK_SPACING}>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 2,
                                        gridTemplateColumns: {
                                            xs: "1fr",
                                            md: "2fr 1fr",
                                        },
                                    }}
                                >
                                    {metrics?.hourOfDay && (
                                        <HourOfDayCard
                                            buckets={metrics.hourOfDay}
                                        />
                                    )}
                                    <SplitCard
                                        title="New vs returning"
                                        icon={IconUsers}
                                        left={metrics?.newVsReturning?.new ?? 0}
                                        right={
                                            metrics?.newVsReturning
                                                ?.returning ?? 0
                                        }
                                        leftLabel="New"
                                        rightLabel="Returning"
                                    />
                                </Box>
                                <Box sx={GRID_3}>
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
                                        icon={IconMapPin}
                                        title="Countries"
                                        items={metrics?.topCountries ?? []}
                                        labelKey="country"
                                    />
                                </Box>
                            </Stack>
                        </TabPanel>

                        <TabPanel value="acquisition" sx={PANEL_SX}>
                            <Stack spacing={PANEL_STACK_SPACING}>
                                <Box sx={GRID_2}>
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
                                </Box>
                                <RankedList
                                    icon={IconClick}
                                    title="UTM sources"
                                    subtitle="Tagged campaigns"
                                    items={metrics?.topUtmSources ?? []}
                                    labelKey="utm_source"
                                />
                            </Stack>
                        </TabPanel>

                        <TabPanel value="performance" sx={PANEL_SX}>
                            <Stack spacing={PANEL_STACK_SPACING}>
                                <Box sx={GRID_3}>
                                    <ResponseTimeCard
                                        data={metrics?.responseTime ?? {}}
                                    />
                                    <BounceRateCard
                                        data={metrics?.bounceRate ?? {}}
                                    />
                                    <StatusCodeCard
                                        rows={metrics?.statusCodes ?? []}
                                    />
                                </Box>
                            </Stack>
                        </TabPanel>

                        <TabPanel value="events" sx={PANEL_SX}>
                            <RankedList
                                icon={IconActivity}
                                title="Top events"
                                subtitle="Tracked interactions in the selected window"
                                items={metrics?.topEvents ?? []}
                                labelKey="name"
                                valueLabel="events"
                            />
                        </TabPanel>
                    </Box>
                </Box>
            </Tabs>
        </AdminDashboardLayout>
    );
}
