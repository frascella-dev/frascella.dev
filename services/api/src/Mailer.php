<?php

declare(strict_types=1);

namespace Api;

use PHPMailer\PHPMailer\PHPMailer;

/**
 * Wraps PHPMailer the way the old service wrapped nodemailer. SMTP config
 * comes from the environment; when MAIL_HOST is absent (local dev),
 * messages are logged instead of sent so the contact form still works end
 * to end without a mail server.
 */
final class Mailer
{
    /** True when a real SMTP transport is configured. */
    public static function isConfigured(): bool
    {
        return Env::get('MAIL_HOST') !== null && Env::get('MAIL_TO_ADDRESS') !== null;
    }

    /**
     * Delivers a contact submission to the site owner. Reply-to is the
     * submitter, so hitting reply in the inbox answers them directly.
     *
     * @throws \PHPMailer\PHPMailer\Exception on SMTP failure
     */
    public static function sendContactMessage(
        string $senderName,
        string $senderEmail,
        string $body,
        string $locale = 'en',
    ): void {
        $appName = Env::get('APP_NAME', 'Portfolio');
        $to = Env::get('MAIL_TO_ADDRESS');

        if (!self::isConfigured()) {
            error_log("[dev] Contact message from $senderName <$senderEmail> [$locale]:\n$body");
            return;
        }

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->Host = Env::get('MAIL_HOST');
        $mail->Port = (int) (Env::get('MAIL_PORT', '587') ?? 587);
        // MAIL_SECURE=true meant implicit TLS (port 465); otherwise STARTTLS
        // when the server offers it — the same behaviour nodemailer had.
        if (Env::get('MAIL_SECURE') === 'true') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->SMTPAutoTLS = true;
        }
        $username = Env::get('MAIL_USERNAME');
        $password = Env::get('MAIL_PASSWORD');
        if ($username !== null && $password !== null) {
            $mail->SMTPAuth = true;
            $mail->Username = $username;
            $mail->Password = $password;
        }

        $mail->setFrom(
            Env::get('MAIL_FROM_ADDRESS', 'no-reply@example.com'),
            Env::get('MAIL_FROM_NAME', $appName) ?? $appName,
        );
        $mail->addAddress($to);
        $mail->addReplyTo($senderEmail, $senderName);
        $mail->Subject = "[$appName] New contact message from $senderName";

        $when = gmdate('Y-m-d H:i');
        $mail->isHTML(true);
        $mail->Body = self::renderHtml($senderName, $senderEmail, $body, $appName, $when, $locale);
        $mail->AltBody = self::renderText($senderName, $senderEmail, $body, $appName, $when, $locale);

        $mail->send();
        error_log("Contact message from $senderEmail delivered to $to");
    }

    private static function renderText(
        string $name,
        string $email,
        string $body,
        string $appName,
        string $when,
        string $locale,
    ): string {
        return implode("\n", [
            "New contact message via $appName",
            '',
            "From:  $name",
            "Email: $email",
            "Received: $when UTC",
            // The notification itself stays English — it has one reader, who
            // does not need it translated. This line is what he does need:
            // which language to write back in.
            'Language: ' . strtoupper($locale),
            '',
            'Message:',
            $body,
            '',
            '— Sender identity is anonymised in storage; no IP or user agent is kept.',
        ]);
    }

    private static function renderHtml(
        string $name,
        string $email,
        string $body,
        string $appName,
        string $when,
        string $locale,
    ): string {
        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        $eName = $esc($name);
        $eEmail = $esc($email);
        $eBody = $esc($body);
        $eApp = $esc($appName);
        $eWhen = $esc($when);
        $eLocale = $esc(strtoupper($locale));

        return <<<HTML
<!doctype html>
<html>
  <body style="margin:0;background:#EEEAE0;font-family:Helvetica,Arial,sans-serif;color:#111110;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <h1 style="font-size:20px;margin:0 0 8px;">New contact message</h1>
      <p style="color:#7A7566;margin:0 0 24px;">via the contact form on <strong>{$eApp}</strong></p>
      <div style="background:#E6E1D4;border:1px solid rgba(17,17,16,0.14);border-radius:10px;padding:16px 18px;margin-bottom:24px;">
        <p style="margin:0 0 4px;"><strong>From:</strong> {$eName}</p>
        <p style="margin:0 0 4px;"><strong>Email:</strong> <a href="mailto:{$eEmail}" style="color:#FF6B1A;">{$eEmail}</a></p>
        <p style="margin:0 0 4px;"><strong>Received:</strong> {$eWhen} UTC</p>
        <p style="margin:0;"><strong>Language:</strong> {$eLocale}</p>
      </div>
      <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:0.06em;color:#7A7566;margin:0 0 8px;">Message</h2>
      <p style="white-space:pre-wrap;line-height:1.6;margin:0 0 24px;">{$eBody}</p>
      <a href="mailto:{$eEmail}" style="display:inline-block;background:#111110;color:#EEEAE0;text-decoration:none;padding:10px 18px;border-radius:8px;">Reply to {$eName}</a>
      <p style="color:#7A7566;font-size:12px;margin:24px 0 0;">Sender identity is anonymised in storage — no IP or user agent is kept.</p>
    </div>
  </body>
</html>
HTML;
    }
}
