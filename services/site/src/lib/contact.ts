import axios from "axios";
import { api, fieldErrors } from "./api.ts";

type FieldKey = "name" | "email" | "message";

const RULES: Record<FieldKey, (v: string) => string | null> = {
    name: (v) => (v.trim().length < 2 ? "please enter your name" : null),
    email: (v) => (!/^\S+@\S+\.\S+$/.test(v.trim()) ? "please enter a valid email" : null),
    message: (v) => (v.trim().length < 10 ? "at least 10 characters" : null),
};

export function initContactForm(root: ParentNode = document) {
    const form = root.querySelector<HTMLFormElement>("[data-contact-form]");
    if (!form) return;

    const status = form.querySelector<HTMLElement>("[data-form-status]")!;
    const button = form.querySelector<HTMLButtonElement>("[data-submit]")!;
    const label = button.textContent ?? "send message";

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

    // Errors clear as soon as the reader starts fixing them, and only
    // re-appear on blur — nobody wants to be told their email is invalid
    // while they are still typing the first character of it.
    for (const key of Object.keys(RULES) as FieldKey[]) {
        field(key).addEventListener("input", () => showError(key, null));
        field(key).addEventListener("blur", () => {
            const v = field(key).value;
            if (v.trim()) showError(key, RULES[key](v));
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (button.disabled) return;

        let firstInvalid: FieldKey | null = null;
        for (const key of Object.keys(RULES) as FieldKey[]) {
            const problem = RULES[key](field(key).value);
            showError(key, problem);
            if (problem && !firstInvalid) firstInvalid = key;
        }
        if (firstInvalid) {
            field(firstInvalid).focus();
            say("check the highlighted fields", "error");
            return;
        }

        button.disabled = true;
        button.textContent = "sending…";
        say("");

        try {
            await api.post("/api/contact", {
                name: field("name").value,
                email: field("email").value,
                message: field("message").value,
                website: form.querySelector<HTMLInputElement>('[name="website"]')!.value,
            });
            form.reset();
            say("received — i'll reply shortly.");
        } catch (err) {
            const st = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (st === 422) {
                // The API mirrors Laravel's 422 shape, so the flattener from
                // `api.ts` hands back one message per field.
                const fields = fieldErrors(err) as Partial<Record<FieldKey, string>>;
                for (const key of Object.keys(RULES) as FieldKey[]) {
                    showError(key, fields[key] ?? null);
                }
                say(fields.message ?? fields.email ?? fields.name ?? "check the form", "error");
            } else if (st === 429) {
                say("too many requests — give it a minute.", "error");
            } else {
                say("something went wrong — try again later.", "error");
            }
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    });
}
