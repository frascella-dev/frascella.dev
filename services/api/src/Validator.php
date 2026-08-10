<?php

declare(strict_types=1);

namespace Api;

/**
 * The contact form's rules, one for one with the old NestJS DTO — same
 * fields, same limits, same messages, same field order (the 422 body's
 * top-level `message` is the first failing field's first error).
 *
 * The messages are translated, the rules are not. A name under two characters
 * is too short in every language; only the sentence saying so changes. The
 * site prints these straight into the field slots under the inputs, so an
 * Italian page whose server answered in English would break exactly at the
 * moment the reader is already stuck.
 */
final class Validator
{
    public const DEFAULT_LOCALE = 'en';

    /**
     * Message tables, keyed by locale then by rule. Adding a language here
     * means adding it to `src/i18n/` on the site as well — these are the
     * server's half of one dictionary, not a second one.
     *
     * @var array<string, array<string, string>>
     */
    private const MESSAGES = [
        'en' => [
            'name.required' => 'Please enter your name',
            'name.long' => 'name must be shorter than or equal to 120 characters',
            'email.invalid' => 'Please enter a valid email',
            'email.long' => 'email must be shorter than or equal to 180 characters',
            'message.short' => 'At least 10 characters',
            'message.long' => 'message must be shorter than or equal to 5000 characters',
            'website.rejected' => 'Rejected.',
            // Both of these come back as a 422 with the text under `message`,
            // which the form prints into the field slot — so they are read by
            // a visitor and belong in here with the rest.
            'contact.cooldown' => 'You sent a message recently — please wait a bit before sending another.',
            'contact.undelivered' => 'Could not deliver your message right now.',
            'admin.email' => 'Enter your email address',
            'admin.password' => 'Enter your password',
        ],
        'it' => [
            'name.required' => 'Inserisci il tuo nome',
            'name.long' => 'il nome non può superare i 120 caratteri',
            'email.invalid' => 'Inserisci un indirizzo email valido',
            'email.long' => "l'email non può superare i 180 caratteri",
            'message.short' => 'Almeno 10 caratteri',
            'message.long' => 'il messaggio non può superare i 5000 caratteri',
            'website.rejected' => 'Rifiutato.',
            'contact.cooldown' => 'Hai inviato un messaggio da poco — aspetta un momento prima di mandarne un altro.',
            'contact.undelivered' => 'Non è stato possibile consegnare il tuo messaggio in questo momento.',
            'admin.email' => 'Inserisci il tuo indirizzo email',
            'admin.password' => 'Inserisci la tua password',
        ],
    ];

    /**
     * Anything unrecognised — a missing field, a locale we do not publish, a
     * value that is not a string — is the default. A visitor cannot make the
     * API answer in a language by asking for one that does not exist.
     */
    public static function locale(mixed $value): string
    {
        return is_string($value) && isset(self::MESSAGES[$value])
            ? $value
            : self::DEFAULT_LOCALE;
    }

    /**
     * One message from the table. Public because the contact route has two of
     * its own — the cooldown and the undelivered notice — which reach the
     * visitor through the same 422 body as the field errors do.
     *
     * A key missing from a locale falls back to English rather than to an
     * empty string: an untranslated sentence is a bug worth seeing, a blank
     * one is a bug that looks like a working form.
     */
    public static function say(string $locale, string $key): string
    {
        return self::MESSAGES[$locale][$key] ?? self::MESSAGES[self::DEFAULT_LOCALE][$key];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, list<string>> field → messages, empty when valid
     */
    public static function contact(array $input): array
    {
        $errors = [];
        $locale = self::locale($input['locale'] ?? null);

        $name = $input['name'] ?? null;
        if (!is_string($name) || mb_strlen(trim($name)) < 2) {
            $errors['name'] = [self::say($locale, 'name.required')];
        } elseif (mb_strlen($name) > 120) {
            $errors['name'] = [self::say($locale, 'name.long')];
        }

        $email = $input['email'] ?? null;
        if (!is_string($email) || filter_var(trim($email), FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = [self::say($locale, 'email.invalid')];
        } elseif (mb_strlen($email) > 180) {
            $errors['email'] = [self::say($locale, 'email.long')];
        }

        $message = $input['message'] ?? null;
        if (!is_string($message) || mb_strlen(trim($message)) < 10) {
            $errors['message'] = [self::say($locale, 'message.short')];
        } elseif (mb_strlen($message) > 5000) {
            $errors['message'] = [self::say($locale, 'message.long')];
        }

        // Honeypot — a real user never fills this hidden field. Any content
        // here means a bot, so we reject it.
        $website = $input['website'] ?? null;
        if ($website !== null && $website !== '') {
            $errors['website'] = [self::say($locale, 'website.rejected')];
        }

        return $errors;
    }

    /**
     * The dashboard's sign-in form. Shape only — whether the account exists
     * is deliberately not answered here, or by the response that follows.
     *
     * @param array<string, mixed> $input
     * @return array<string, list<string>>
     */
    public static function adminLogin(array $input): array
    {
        $errors = [];
        // The dashboard is English-only and has one user, but it reads from
        // the same table so a stray key cannot go missing from one language.
        $locale = self::locale($input['locale'] ?? null);

        $email = $input['email'] ?? null;
        if (!is_string($email) || filter_var(trim($email), FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = [self::say($locale, 'admin.email')];
        }

        $password = $input['password'] ?? null;
        if (!is_string($password) || $password === '') {
            $errors['password'] = [self::say($locale, 'admin.password')];
        }

        return $errors;
    }

    /**
     * A `YYYY-MM-DD` day from a query string, or null. Both the shape and
     * the calendar have to agree — `2026-02-31` parses as a date and is not
     * one, and every stats query interpolates the result into a range.
     */
    public static function day(mixed $value): ?string
    {
        if (!is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $value));

        return checkdate($m, $d, $y) ? $value : null;
    }
}
