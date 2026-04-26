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
