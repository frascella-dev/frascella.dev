import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export type ContactMessage = {
    senderName: string;
    senderEmail: string;
    body: string;
    receivedAt: Date;
};

/**
 * Wraps nodemailer. SMTP config comes from the environment; when it is
 * absent (local dev), messages are logged instead of sent so the contact
 * form still works end to end without a mail server.
 */
@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: nodemailer.Transporter | null;

    constructor() {
        const host = process.env.MAIL_HOST;
        if (!host) {
            this.transporter = null;
            this.logger.warn(
                "MAIL_HOST is not set — contact messages will be logged, not emailed.",
            );
            return;
        }

        this.transporter = nodemailer.createTransport({
            host,
            port: Number(process.env.MAIL_PORT ?? 587),
            secure: process.env.MAIL_SECURE === "true",
            auth:
                process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD
                    ? {
                          user: process.env.MAIL_USERNAME,
                          pass: process.env.MAIL_PASSWORD,
                      }
                    : undefined,
        });
    }

    /** True when a real SMTP transport is configured. */
    get isConfigured(): boolean {
        return this.transporter !== null && !!process.env.MAIL_TO_ADDRESS;
    }

    /**
     * Deliver a contact submission to the site owner. Reply-to is the
     * submitter, so hitting reply in the inbox answers them directly.
     */
    async sendContactMessage(msg: ContactMessage): Promise<void> {
        const to = process.env.MAIL_TO_ADDRESS;
        const appName = process.env.APP_NAME ?? "Portfolio";
        const fromAddress =
            process.env.MAIL_FROM_ADDRESS ?? "no-reply@example.com";
        const fromName = process.env.MAIL_FROM_NAME ?? appName;

        const subject = `[${appName}] New contact message from ${msg.senderName}`;

        if (!this.transporter || !to) {
            this.logger.log(
                `[dev] Contact message from ${msg.senderName} <${msg.senderEmail}>:\n${msg.body}`,
            );
            return;
        }

        await this.transporter.sendMail({
            to,
            from: { name: fromName, address: fromAddress },
            replyTo: { name: msg.senderName, address: msg.senderEmail },
            subject,
            text: this.renderText(msg, appName),
            html: this.renderHtml(msg, appName),
        });

        this.logger.log(`Contact message from ${msg.senderEmail} delivered to ${to}`);
    }

    private renderText(msg: ContactMessage, appName: string): string {
        const when = msg.receivedAt.toISOString().slice(0, 16).replace("T", " ");
        return [
            `New contact message via ${appName}`,
            ``,
            `From:  ${msg.senderName}`,
            `Email: ${msg.senderEmail}`,
            `Received: ${when} UTC`,
            ``,
            `Message:`,
            msg.body,
            ``,
            `— Sender identity is anonymised in storage; no IP or user agent is kept.`,
        ].join("\n");
    }

    private renderHtml(msg: ContactMessage, appName: string): string {
        const when = msg.receivedAt.toISOString().slice(0, 16).replace("T", " ");
        const esc = (s: string) =>
            s
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
        return `<!doctype html>
<html>
  <body style="margin:0;background:#EEEAE0;font-family:Helvetica,Arial,sans-serif;color:#111110;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <h1 style="font-size:20px;margin:0 0 8px;">New contact message</h1>
      <p style="color:#7A7566;margin:0 0 24px;">via the contact form on <strong>${esc(appName)}</strong></p>
      <div style="background:#E6E1D4;border:1px solid rgba(17,17,16,0.14);border-radius:10px;padding:16px 18px;margin-bottom:24px;">
        <p style="margin:0 0 4px;"><strong>From:</strong> ${esc(msg.senderName)}</p>
        <p style="margin:0 0 4px;"><strong>Email:</strong> <a href="mailto:${esc(msg.senderEmail)}" style="color:#FF6B1A;">${esc(msg.senderEmail)}</a></p>
        <p style="margin:0;"><strong>Received:</strong> ${esc(when)} UTC</p>
      </div>
      <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:0.06em;color:#7A7566;margin:0 0 8px;">Message</h2>
      <p style="white-space:pre-wrap;line-height:1.6;margin:0 0 24px;">${esc(msg.body)}</p>
      <a href="mailto:${esc(msg.senderEmail)}" style="display:inline-block;background:#111110;color:#EEEAE0;text-decoration:none;padding:10px 18px;border-radius:8px;">Reply to ${esc(msg.senderName)}</a>
      <p style="color:#7A7566;font-size:12px;margin:24px 0 0;">Sender identity is anonymised in storage — no IP or user agent is kept.</p>
    </div>
  </body>
</html>`;
    }
}
