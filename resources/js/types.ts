// Shared types for the Inertia page tree and the /api/admin JSON responses.

import type { PageProps as InertiaPageProps } from "@inertiajs/core";

export type User = {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
};

export type SharedAuth = {
    user: User | null;
};

// All Inertia pages can read these via usePage<PageProps>(). The Profile
// API responses carry the same shape under `user` so we reuse it.
export type PageProps = InertiaPageProps & {
    auth?: SharedAuth;
    errors?: Record<string, string>;
};

export type TwoFactorPending = {
    qr: string;
    uri: string;
};

export type TwoFactorState = {
    confirmed_at: string | null;
    pending: TwoFactorPending | null;
};

export type ProfilePayload = {
    user: User;
    twoFactor: TwoFactorState;
    avatarUploadLimitKb: number | null;
};

export type LoginResponse = {
    status: "two_factor_required";
    next: string;
};

export type TwoFactorResponse = {
    status: "authenticated" | "challenge_expired";
    next: string;
};

export type LogoutResponse = {
    status: "ok";
    next: string;
};

export type RegisterResponse = {
    status: "ok" | "invitation_invalid";
    next: string;
};

export type RegisterPageProps = PageProps & {
    token: string;
    email: string;
    twoFactor: { qr: string; uri: string };
    expiresAt: string;
    minPasswordLength: number;
};

export type FieldErrors = Record<string, string>;

// Analytics ─────────────────────────────────────────────────────────────

export type AnalyticsBreakdown = { label: string; count: number };

export type AnalyticsTotals = {
    views: number;
    visitors: number;
    prev_views: number;
    prev_visitors: number;
};

export type AnalyticsTimeSeriesPoint = {
    date: string; // YYYY-MM-DD
    views: number;
    visitors: number;
};

export type AnalyticsRange = 7 | 30 | 90;

export type AnalyticsOverview = {
    range_days: AnalyticsRange;
    totals: AnalyticsTotals;
    time_series: AnalyticsTimeSeriesPoint[];
    top_countries: AnalyticsBreakdown[];
    top_pages: AnalyticsBreakdown[];
};

export type AnalyticsVisits = {
    range_days: AnalyticsRange;
    time_series: AnalyticsTimeSeriesPoint[];
    totals: AnalyticsTotals;
};

export type AnalyticsGeo = {
    range_days: AnalyticsRange;
    countries: AnalyticsBreakdown[];
};

export type AnalyticsDevices = {
    range_days: AnalyticsRange;
    devices: AnalyticsBreakdown[];
    browsers: AnalyticsBreakdown[];
    os: AnalyticsBreakdown[];
};

export type AnalyticsReferrers = {
    range_days: AnalyticsRange;
    referrers: AnalyticsBreakdown[];
};

// Contact submissions ──────────────────────────────────────────────────

export type ContactSubmissionStatus = "sent" | "failed" | "queued";

export type ContactSubmission = {
    id: number;
    name: string;
    email: string;
    message: string;
    status: ContactSubmissionStatus;
    created_at: string;
    sent_at: string | null;
    failed_at: string | null;
};

export type ContactSubmissionsResponse = {
    data: ContactSubmission[];
    meta: {
        current_page: number;
        per_page: number;
        last_page: number;
        total: number;
        totals_by_status: {
            sent: number;
            failed: number;
            queued: number;
        };
    };
};
