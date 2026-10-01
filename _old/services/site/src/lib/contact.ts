import axios from "axios";
import { api, fieldErrors } from "./api.ts";
import { readJson } from "./copy.ts";
import { track } from "./track.ts";

type FieldKey = "name" | "email" | "message";

/**
 * Every word this module says, written onto the form by Contact.astro — see
 * lib/copy.ts for why none of it is imported. The fallbacks are English and
 * exist only so a missing attribute degrades to a working form rather than to
 * `undefined` in the status line; on a real page nothing here is ever used.
 */
type FormCopy = {
    locale: string;
    sending: string;
    sent: string;
    checkHighlighted: string;
    checkForm: string;
    tooMany: string;
    failed: string;
    errors: Record<FieldKey, string>;
};

const FALLBACK: FormCopy = {
    locale: "en",
    sending: "sending…",
    sent: "received — i'll reply shortly.",
    checkHighlighted: "check the highlighted fields",
    checkForm: "check the form",
    tooMany: "too many requests — give it a minute.",
    failed: "something went wrong — try again later.",
    errors: {
        name: "please enter your name",
        email: "please enter a valid email",
        message: "at least 10 characters",
    },
};

/**
 * The rules themselves are language-independent — a name is too short, an
 * address has no `@`, a message is under ten characters — so only the
 * sentence explaining the failure comes from the page.
 */
const RULES: Record<FieldKey, (v: string) => boolean> = {
    name: (v) => v.trim().length >= 2,
    email: (v) => /^\S+@\S+\.\S+$/.test(v.trim()),
    message: (v) => v.trim().length >= 10,
};

export function initContactForm(root: ParentNode = document) {
    const form = root.querySelector<HTMLFormElement>("[data-contact-form]");
    if (!form) return;

    const copy = { ...FALLBACK, ...readJson<Partial<FormCopy>>(form, "data-copy", {}) };
    const check = (key: FieldKey, value: string) => (RULES[key](value) ? null : copy.errors[key]);

    const status = form.querySelector<HTMLElement>("[data-form-status]")!;
    const button = form.querySelector<HTMLButtonElement>("[data-submit]")!;
    // The button's own rendered label, kept so it can be put back after
    // "sending…". It is the one string that needs no dictionary — the page
    // already wrote it in the right language.
    const label = button.textContent ?? "";

    const field = (key: FieldKey) =>
        form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${key}"]`)!;
    const wrapper = (key: FieldKey) => field(key).closest<HTMLElement>("[data-field]")!;
    const errorSlot = (key: FieldKey) =>
        form.querySelector<HTMLElement>(`[data-error-for="${key}"]`)!;

    const showError = (key: FieldKey, message: string | null) => {
        errorSlot(key).textContent = message ?? "";
        wrapper(key).toggleAttribute("data-invalid", Boolean(message));
        field(key).setAttribute("aria-invalid", String(Boolean(message)));
    };

    const say = (message: string, kind: "ok" | "error" | "" = "ok") => {
        status.textContent = message;
        if (kind === "error") status.dataset.kind = "error";
        else delete status.dataset.kind;
    };

    // The funnel, in four beats: the form came into view, somebody started
    // writing, they pressed send, it went. `track` is a no-op unless consent
    // was granted — see lib/track.ts — so this costs nothing either way.
    let startedTyping = false;
    const noteStart = () => {
        if (startedTyping) return;
        startedTyping = true;
        track("contact_start");
    };

    if ("IntersectionObserver" in window) {
        const seen = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                seen.disconnect();
                track("contact_view");
            },
            { threshold: 0.4 },
        );
        seen.observe(form);
    }

    // Errors clear as soon as the reader starts fixing them, and only
    // re-appear on blur — nobody wants to be told their email is invalid
    // while they are still typing the first character of it.
    for (const key of Object.keys(RULES) as FieldKey[]) {
        field(key).addEventListener("input", () => {
            noteStart();
            showError(key, null);
        });
        field(key).addEventListener("blur", () => {
            const v = field(key).value;
            if (v.trim()) showError(key, check(key, v));
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (button.disabled) return;

        let firstInvalid: FieldKey | null = null;
        for (const key of Object.keys(RULES) as FieldKey[]) {
            const problem = check(key, field(key).value);
            showError(key, problem);
            if (problem && !firstInvalid) firstInvalid = key;
        }
        if (firstInvalid) {
            field(firstInvalid).focus();
            say(copy.checkHighlighted, "error");
            return;
        }

        button.disabled = true;
        button.textContent = copy.sending;
        say("");
        track("contact_submit");

        try {
            await api.post("/api/contact", {
                name: field("name").value,
                email: field("email").value,
                message: field("message").value,
                website: form.querySelector<HTMLInputElement>('[name="website"]')!.value,
                // The server validates too, and its 422 messages are printed
                // verbatim into the field slots below — so it has to be told
                // which language to write them in. Unknown values fall back
                // to English there, not here.
                locale: copy.locale,
            });
            form.reset();
            say(copy.sent);
            track("contact_success");
        } catch (err) {
            const st = axios.isAxiosError(err) ? err.response?.status : undefined;
            track("contact_error", st ? String(st) : "network");
            if (st === 422) {
                // The API mirrors Laravel's 422 shape, so the flattener from
                // `api.ts` hands back one message per field.
                const fields = fieldErrors(err) as Partial<Record<FieldKey, string>>;
                for (const key of Object.keys(RULES) as FieldKey[]) {
                    showError(key, fields[key] ?? null);
                }
                say(fields.message ?? fields.email ?? fields.name ?? copy.checkForm, "error");
            } else if (st === 429) {
                say(copy.tooMany, "error");
            } else {
                say(copy.failed, "error");
            }
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    });
}
