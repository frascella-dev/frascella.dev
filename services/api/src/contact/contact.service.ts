import { Injectable } from "@nestjs/common";
import { MailService } from "../mail/mail.service";

export type SubmitResult = { ok: true } | { ok: false; reason: string };

/**
 * Contact-form business rules. The old Laravel app persisted every message
 * and ran DB-side cooldowns; here the API's single job is delivering email,
 * so state is kept in-memory — a lightweight per-email cooldown that curbs
 * accidental double-sends and trivial spam without a database.
 */
@Injectable()
export class ContactService {
    /** Cooldown window between two submissions from the same email. */
    private static readonly PER_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

    private readonly lastSentByEmail = new Map<string, number>();

    constructor(private readonly mail: MailService) {}

    async submit(
        name: string,
        email: string,
        body: string,
        now: number = Date.now(),
    ): Promise<SubmitResult> {
        const normalizedEmail = email.trim().toLowerCase();

        const last = this.lastSentByEmail.get(normalizedEmail);
        if (last && now - last < ContactService.PER_EMAIL_COOLDOWN_MS) {
            return { ok: false, reason: "cooldown" };
        }

        if (!this.mail.isConfigured && process.env.NODE_ENV === "production") {
            return { ok: false, reason: "mail_not_configured" };
        }

        await this.mail.sendContactMessage({
            senderName: name.trim(),
            senderEmail: normalizedEmail,
            body: body.trim(),
            receivedAt: new Date(now),
        });

        this.lastSentByEmail.set(normalizedEmail, now);
        this.pruneExpired(now);

        return { ok: true };
    }

    /** Drop cooldown entries that have already expired to bound memory. */
    private pruneExpired(now: number): void {
        for (const [key, ts] of this.lastSentByEmail) {
            if (now - ts >= ContactService.PER_EMAIL_COOLDOWN_MS) {
                this.lastSentByEmail.delete(key);
            }
        }
    }
}
