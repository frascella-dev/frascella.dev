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

    /**
     * @param string $locale Which language the form was filled in. Carried
     *                       into the notification only — it changes nothing
     *                       about what is sent or stored, it just saves the
     *                       reader of the email a guess about how to reply.
     *
     * @return 'ok'|'cooldown'|'mail_not_configured'|'send_failed'
     */
    public static function submit(
        string $name,
        string $email,
        string $body,
        RateLimiter $limiter,
        string $locale = 'en',
    ): string {
        if ($limiter->isOnCooldown('email:' . $email, self::PER_EMAIL_COOLDOWN_SECONDS)) {
            return 'cooldown';
        }

        if (!Mailer::isConfigured() && Env::get('APP_ENV') === 'production') {
            return 'mail_not_configured';
        }

        try {
            Mailer::sendContactMessage($name, $email, $body, $locale);
        } catch (\Throwable $e) {
            error_log('Contact mail failed: ' . $e->getMessage());
            return 'send_failed';
        }

        // Armed only after a successful send, matching the old service.
        $limiter->touch('email:' . $email);

        return 'ok';
    }
}
