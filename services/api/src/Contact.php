<?php

declare(strict_types=1);

namespace Api;

/**
 * Contact-form business rules, unchanged from the NestJS service: a
 * lightweight per-email cooldown curbs accidental double-sends and trivial
 * spam without a database, then the message goes out by mail.
 */
final class Contact
{
    /** Cooldown window between two submissions from the same email. */
    private const PER_EMAIL_COOLDOWN_SECONDS = 15 * 60;

    /** @return 'ok'|'cooldown'|'mail_not_configured'|'send_failed' */
    public static function submit(
        string $name,
        string $email,
        string $body,
        RateLimiter $limiter,
    ): string {
        if ($limiter->isOnCooldown('email:' . $email, self::PER_EMAIL_COOLDOWN_SECONDS)) {
            return 'cooldown';
        }

        if (!Mailer::isConfigured() && Env::get('APP_ENV') === 'production') {
            return 'mail_not_configured';
        }

        try {
            Mailer::sendContactMessage($name, $email, $body);
        } catch (\Throwable $e) {
            error_log('Contact mail failed: ' . $e->getMessage());
            return 'send_failed';
        }

        // Armed only after a successful send, matching the old service.
        $limiter->touch('email:' . $email);

        return 'ok';
    }
}
