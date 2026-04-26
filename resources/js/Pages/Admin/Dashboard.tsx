import { useEffect, useMemo, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import ButtonGroup from "@mui/joy/ButtonGroup";
import Card from "@mui/joy/Card";
import CircularProgress from "@mui/joy/CircularProgress";
import Divider from "@mui/joy/Divider";
import JoyLink from "@mui/joy/Link";
import Stack from "@mui/joy/Stack";
import Tab, { tabClasses } from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import TabPanel from "@mui/joy/TabPanel";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";
import {
    IconChevronRight,
    IconExternalLink,
    IconHome,
} from "@tabler/icons-react";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.tsx";
import { api } from "@/utils/api.ts";
import type {
    AnalyticsBreakdown,
    AnalyticsDevices,
    AnalyticsGeo,
    AnalyticsOverview,
    AnalyticsRange,
    AnalyticsReferrers,
    AnalyticsTimeSeriesPoint,
    AnalyticsTotals,
    AnalyticsVisits,
    PageProps,
} from "@/types.ts";

const RANGES: AnalyticsRange[] = [7, 30, 90];

const numberFormat = new Intl.NumberFormat();
const regionNames =
    typeof Intl !== "undefined" && "DisplayNames" in Intl
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;

function countryLabel(code: string): string {
    if (!code || code === "—") return "Unknown";
    try {
        return regionNames?.of(code) ?? code;
    } catch {
        return code;
    }
}

function formatPctDelta(curr: number, prev: number): string {
    if (prev === 0) return curr > 0 ? "new" : "—";
    const delta = ((curr - prev) / prev) * 100;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(0)}%`;
}

function deltaColor(curr: number, prev: number): "success" | "danger" | "neutral" {
    if (prev === 0) return curr > 0 ? "success" : "neutral";
    if (curr > prev) return "success";
    if (curr < prev) return "danger";
    return "neutral";
}

function StatCard({
    label,
    value,
    delta,
    color,
}: {
    label: string;
    value: number;
    delta: string;
    color: "success" | "danger" | "neutral";
}) {
    return (
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160, gap: 0.25 }}>
            <Typography level="body-xs" color="neutral">
                {label}
            </Typography>
            <Typography level="h3" sx={{ fontFamily: "display", fontWeight: 600 }}>
                {numberFormat.format(value)}
            </Typography>
            <Typography level="body-xs" color={color}>
                {delta} vs previous period
            </Typography>
        </Card>
    );
}

const AXIS_LABEL_STYLE = { fontSize: 11 };
const LEGEND_SLOT = {
    legend: {
        labelStyle: { fontSize: 12 },
        itemMarkWidth: 10,
        itemMarkHeight: 10,
        itemGap: 12,
    },
};
const HIDE_LEGEND_SLOT = { legend: { hidden: true } };

function TimeSeriesChart({ data }: { data: AnalyticsTimeSeriesPoint[] }) {
    const labels = data.map((d) =>
        new Date(d.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        }),
    );
    const views = data.map((d) => d.views);
    const visitors = data.map((d) => d.visitors);

    return (
        <Box sx={{ width: "100%", height: 220 }}>
            <LineChart
                xAxis={[
                    {
                        data: labels,
                        scaleType: "point",
                        tickLabelStyle: AXIS_LABEL_STYLE,
                    },
                ]}
                yAxis={[{ tickLabelStyle: AXIS_LABEL_STYLE }]}
                series={[
                    {
                        data: views,
                        label: "Views",
                        curve: "monotoneX",
                        showMark: false,
                    },
                    {
                        data: visitors,
                        label: "Visitors",
                        curve: "monotoneX",
                        showMark: false,
                    },
                ]}
                height={220}
                margin={{ left: 40, right: 16, top: 24, bottom: 28 }}
                slotProps={LEGEND_SLOT}
            />
        </Box>
    );
}

function BreakdownPie({
    data,
    labelMap,
    height = 200,
}: {
    data: AnalyticsBreakdown[];
    labelMap?: (label: string) => string;
    height?: number;
}) {
    const slices = data.map((row, i) => ({
        id: i,
        value: row.count,
        label: labelMap ? labelMap(row.label) : row.label,
    }));

    if (slices.length === 0) {
        return (
            <Typography level="body-sm" color="neutral">
                No data in the selected range.
            </Typography>
        );
    }

    return (
        <Box sx={{ width: "100%", height }}>
            <PieChart
                series={[
                    {
                        data: slices,
                        innerRadius: 50,
                        paddingAngle: 1,
                        cornerRadius: 3,
                    },
                ]}
                height={height}
                margin={{ right: 110, top: 8, bottom: 8 }}
                slotProps={LEGEND_SLOT}
            />
        </Box>
    );
}

function BreakdownBar({
    data,
    labelMap,
    height = 220,
}: {
    data: AnalyticsBreakdown[];
    labelMap?: (label: string) => string;
    height?: number;
}) {
    const labels = data.map((d) => (labelMap ? labelMap(d.label) : d.label));
    const counts = data.map((d) => d.count);

    if (data.length === 0) {
        return (
            <Typography level="body-sm" color="neutral">
                No data in the selected range.
            </Typography>
        );
    }

    return (
        <Box sx={{ width: "100%", height }}>
            <BarChart
                xAxis={[
                    {
                        data: labels,
                        scaleType: "band",
                        tickLabelStyle: AXIS_LABEL_STYLE,
                    },
                ]}
                yAxis={[{ tickLabelStyle: AXIS_LABEL_STYLE }]}
                series={[{ data: counts }]}
                height={height}
                margin={{ left: 40, right: 16, top: 16, bottom: 56 }}
                slotProps={HIDE_LEGEND_SLOT}
            />
        </Box>
    );
}

function useAnalytics<T>(path: string, range: AnalyticsRange) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.get<T>(path, { params: { range } })
            .then(({ data }) => {
                if (!cancelled) setData(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Could not load analytics.";
                    setError(message);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [path, range]);

    return { data, error, loading };
}

function TabFrame({
    loading,
    error,
    children,
}: {
    loading: boolean;
    error: string | null;
    children: React.ReactNode;
}) {
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size="sm" />
            </Box>
        );
    }
    if (error) {
        return (
            <Alert color="danger" variant="soft">
                {error}
            </Alert>
        );
    }
    return <>{children}</>;
}

function TotalsRow({ totals }: { totals: AnalyticsTotals }) {
    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ flexWrap: "wrap" }}
        >
            <StatCard
                label="Page views"
                value={totals.views}
                delta={formatPctDelta(totals.views, totals.prev_views)}
                color={deltaColor(totals.views, totals.prev_views)}
            />
            <StatCard
                label="Unique visitors"
                value={totals.visitors}
                delta={formatPctDelta(totals.visitors, totals.prev_visitors)}
                color={deltaColor(totals.visitors, totals.prev_visitors)}
            />
        </Stack>
    );
}

function OverviewTab({ range }: { range: AnalyticsRange }) {
    const { data, error, loading } = useAnalytics<AnalyticsOverview>(
        "/api/admin/analytics/overview",
        range,
    );

    return (
        <TabFrame loading={loading} error={error}>
            {data && (
                <Stack spacing={3}>
                    <TotalsRow totals={data.totals} />
                    <Card variant="outlined">
                        <Typography level="title-md">
                            Visits over time
                        </Typography>
                        <Divider />
                        <TimeSeriesChart data={data.time_series} />
                    </Card>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                    >
                        <Card variant="outlined" sx={{ flex: 1 }}>
                            <Typography level="title-md">
                                Top countries
                            </Typography>
                            <Divider />
                            <BreakdownPie
                                data={data.top_countries}
                                labelMap={countryLabel}
                            />
                        </Card>
                        <Card variant="outlined" sx={{ flex: 1 }}>
                            <Typography level="title-md">
                                Top pages
                            </Typography>
                            <Divider />
                            <BreakdownBar data={data.top_pages} />
                        </Card>
                    </Stack>
                </Stack>
            )}
        </TabFrame>
    );
}

function VisitsTab({ range }: { range: AnalyticsRange }) {
    const { data, error, loading } = useAnalytics<AnalyticsVisits>(
        "/api/admin/analytics/visits",
        range,
    );

    return (
        <TabFrame loading={loading} error={error}>
            {data && (
                <Stack spacing={3}>
                    <TotalsRow totals={data.totals} />
                    <Card variant="outlined">
                        <Typography level="title-md">
                            Daily traffic — last {range} days
                        </Typography>
                        <Divider />
                        <TimeSeriesChart data={data.time_series} />
                    </Card>
                </Stack>
            )}
        </TabFrame>
    );
}

function GeographyTab({ range }: { range: AnalyticsRange }) {
    const { data, error, loading } = useAnalytics<AnalyticsGeo>(
        "/api/admin/analytics/geo",
        range,
    );

    const enriched = useMemo(
        () =>
            data?.countries.map((c) => ({
                ...c,
                label: countryLabel(c.label),
            })) ?? [],
        [data?.countries],
    );

    return (
        <TabFrame loading={loading} error={error}>
            <Stack spacing={3}>
                <Card variant="outlined">
                    <Typography level="title-md">
                        Visits by country
                    </Typography>
                    <Divider />
                    <BreakdownPie data={enriched} />
                </Card>
                <Card variant="outlined">
                    <Typography level="title-md">Country leaderboard</Typography>
                    <Divider />
                    <BreakdownBar data={enriched} />
                </Card>
            </Stack>
        </TabFrame>
    );
}

function DevicesTab({ range }: { range: AnalyticsRange }) {
    const { data, error, loading } = useAnalytics<AnalyticsDevices>(
        "/api/admin/analytics/devices",
        range,
    );

    return (
        <TabFrame loading={loading} error={error}>
            {data && (
                <Stack spacing={3}>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                    >
                        <Card variant="outlined" sx={{ flex: 1 }}>
                            <Typography level="title-md">Devices</Typography>
                            <Divider />
                            <BreakdownPie data={data.devices} />
                        </Card>
                        <Card variant="outlined" sx={{ flex: 1 }}>
                            <Typography level="title-md">
                                Operating systems
                            </Typography>
                            <Divider />
                            <BreakdownPie data={data.os} />
                        </Card>
                    </Stack>
                    <Card variant="outlined">
                        <Typography level="title-md">Browsers</Typography>
                        <Divider />
                        <BreakdownBar data={data.browsers} />
                    </Card>
                </Stack>
            )}
        </TabFrame>
    );
}

function ReferrersTab({ range }: { range: AnalyticsRange }) {
    const { data, error, loading } = useAnalytics<AnalyticsReferrers>(
        "/api/admin/analytics/referrers",
        range,
    );

    return (
        <TabFrame loading={loading} error={error}>
            {data && (
                <Card variant="outlined">
                    <Typography level="title-md">Top referrers</Typography>
                    <Divider />
                    <BreakdownBar data={data.referrers} />
                </Card>
            )}
        </TabFrame>
    );
}

export default function Dashboard() {
    const user = usePage<PageProps>().props.auth?.user;
    const displayName = user?.name?.trim() || "there";

    const [range, setRange] = useState<AnalyticsRange>(30);
    const [tab, setTab] = useState(0);

    return (
        <AuthenticatedLayout>
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
                                    Welcome back, {displayName}
                                </Typography>
                                <Typography level="body-sm" color="neutral">
                                    Here's how the portfolio is doing.
                                </Typography>
                            </Box>
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: "center" }}
                            >
                                <ButtonGroup size="sm" variant="outlined">
                                    {RANGES.map((r) => (
                                        <Button
                                            key={r}
                                            variant={
                                                r === range
                                                    ? "solid"
                                                    : "outlined"
                                            }
                                            color={
                                                r === range
                                                    ? "primary"
                                                    : "neutral"
                                            }
                                            onClick={() => setRange(r)}
                                        >
                                            {r}d
                                        </Button>
                                    ))}
                                </ButtonGroup>
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
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v as number)}
                        sx={{ bgcolor: "transparent" }}
                    >
                        <TabList
                            tabFlex={1}
                            size="sm"
                            sx={{
                                pl: { xs: 2, md: 4 },
                                justifyContent: "left",
                                overflow: "auto",
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
                            <Tab
                                sx={{ borderRadius: "6px 6px 0 0" }}
                                indicatorInset
                                value={1}
                            >
                                Visits
                            </Tab>
                            <Tab
                                sx={{ borderRadius: "6px 6px 0 0" }}
                                indicatorInset
                                value={2}
                            >
                                Geography
                            </Tab>
                            <Tab
                                sx={{ borderRadius: "6px 6px 0 0" }}
                                indicatorInset
                                value={3}
                            >
                                Devices
                            </Tab>
                            <Tab
                                sx={{ borderRadius: "6px 6px 0 0" }}
                                indicatorInset
                                value={4}
                            >
                                Referrers
                            </Tab>
                        </TabList>
                        <Box
                            sx={{
                                maxWidth: "1100px",
                                mx: "auto",
                                px: { xs: 2, md: 6 },
                                py: { xs: 2, md: 3 },
                                width: "100%",
                            }}
                        >
                            <TabPanel value={0} sx={{ p: 0 }}>
                                {tab === 0 && <OverviewTab range={range} />}
                            </TabPanel>
                            <TabPanel value={1} sx={{ p: 0 }}>
                                {tab === 1 && <VisitsTab range={range} />}
                            </TabPanel>
                            <TabPanel value={2} sx={{ p: 0 }}>
                                {tab === 2 && <GeographyTab range={range} />}
                            </TabPanel>
                            <TabPanel value={3} sx={{ p: 0 }}>
                                {tab === 3 && <DevicesTab range={range} />}
                            </TabPanel>
                            <TabPanel value={4} sx={{ p: 0 }}>
                                {tab === 4 && <ReferrersTab range={range} />}
                            </TabPanel>
                        </Box>
                    </Tabs>
                </Box>
            </Box>
        </AuthenticatedLayout>
    );
}
