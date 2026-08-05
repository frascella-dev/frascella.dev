<?php

declare(strict_types=1);

namespace Api;

/**
 * The contact form's rules, one for one with the old NestJS DTO — same
 * fields, same limits, same messages, same field order (the 422 body's
 * top-level `message` is the first failing field's first error).
 */
final class Validator
{
    /**
     * @param array<string, mixed> $input
     * @return array<string, list<string>> field → messages, empty when valid
     */
    public static function contact(array $input): array
    {
        $errors = [];

        $name = $input['name'] ?? null;
        if (!is_string($name) || mb_strlen(trim($name)) < 2) {
            $errors['name'] = ['Please enter your name'];
        } elseif (mb_strlen($name) > 120) {
            $errors['name'] = ['name must be shorter than or equal to 120 characters'];
        }

        $email = $input['email'] ?? null;
        if (!is_string($email) || filter_var(trim($email), FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = ['Please enter a valid email'];
        } elseif (mb_strlen($email) > 180) {
            $errors['email'] = ['email must be shorter than or equal to 180 characters'];
        }

        $message = $input['message'] ?? null;
        if (!is_string($message) || mb_strlen(trim($message)) < 10) {
            $errors['message'] = ['At least 10 characters'];
        } elseif (mb_strlen($message) > 5000) {
            $errors['message'] = ['message must be shorter than or equal to 5000 characters'];
        }

        // Honeypot — a real user never fills this hidden field. Any content
        // here means a bot, so we reject it.
        $website = $input['website'] ?? null;
        if ($website !== null && $website !== '') {
            $errors['website'] = ['Rejected.'];
        }

        return $errors;
    }
}
