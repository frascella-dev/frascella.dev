<?php

declare(strict_types=1);

namespace Api;

/**
 * Time-based one-time passwords — RFC 6238, which is RFC 4226 counting in
 * thirty-second steps.
 *
 * Written out rather than pulled in: the whole algorithm is an HMAC, a
 * truncation and a modulo, and every authenticator app on earth implements
 * the same defaults (SHA-1, 6 digits, 30 seconds). A dependency for eighty
 * lines would be the fourth package in a service that has one.
 *
 * SHA-1 is not a mistake here. HOTP's security rests on HMAC, which does not
 * inherit SHA-1's collision weakness, and the alternatives are not what
 * Google Authenticator, Aegis, 1Password or iOS Passwords actually read.
 */
final class Totp
{
    private const PERIOD = 30;
    private const DIGITS = 6;

    /**
     * How far either side of now a code is accepted. One step ≈ up to a
     * minute of tolerance, which covers a phone clock that has drifted and a
     * person typing the last two digits as the code rolls over.
     */
    private const WINDOW = 1;

    /** A fresh 160-bit secret, base32 as every authenticator app expects. */
    public static function secret(): string
    {
        return self::base32Encode(random_bytes(20));
    }

    /** The code for a given moment — used by the tests and the CLI, not by login. */
    public static function code(string $secret, ?int $at = null): string
    {
        return self::at($secret, intdiv($at ?? time(), self::PERIOD));
    }

    /**
     * Checks a code and, on success, returns the counter it matched.
     *
     * The counter is the point. Returning a bool would leave a code valid for
     * its whole window, so anyone who read it over a shoulder — or off a
     * proxy log — could replay it seconds later. The caller stores the
     * counter and passes it back as `$lastCounter` next time, which makes
     * every code single-use.
     *
     * @return int|null the counter used, or null when the code is wrong
     */
    public static function verify(
        string $secret,
        string $code,
        ?int $lastCounter = null,
        ?int $at = null,
    ): ?int {
        $code = preg_replace('/\D/', '', $code) ?? '';
        if (strlen($code) !== self::DIGITS) {
            return null;
        }

        $now = intdiv($at ?? time(), self::PERIOD);
        for ($offset = -self::WINDOW; $offset <= self::WINDOW; $offset++) {
            $counter = $now + $offset;
            if ($lastCounter !== null && $counter <= $lastCounter) {
                continue; // already spent
            }
            if (hash_equals(self::at($secret, $counter), $code)) {
                return $counter;
            }
        }

        return null;
    }

    /**
     * The `otpauth://` URI an authenticator app scans or accepts pasted.
     * The label carries the issuer twice by convention — once as a prefix so
     * older apps group correctly, once as a parameter.
     */
    public static function uri(string $secret, string $account, string $issuer): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d',
            rawurlencode($issuer),
            rawurlencode($account),
            $secret,
            rawurlencode($issuer),
            self::DIGITS,
            self::PERIOD,
        );
    }

    /** One counter's code: HMAC, dynamic truncation, modulo. */
    private static function at(string $secret, int $counter): string
    {
        $key = self::base32Decode($secret);
        if ($key === '') {
            return '';
        }

        // The counter goes in as 8 bytes, big-endian.
        $hash = hash_hmac('sha1', pack('J', $counter), $key, true);

        // Dynamic truncation: the low nibble of the last byte picks where to
        // read four bytes from, and the top bit of those is masked off so the
        // result is positive on every platform.
        $offset = ord($hash[19]) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24)
            | (ord($hash[$offset + 1]) << 16)
            | (ord($hash[$offset + 2]) << 8)
            | ord($hash[$offset + 3]);

        return str_pad((string) ($value % (10 ** self::DIGITS)), self::DIGITS, '0', STR_PAD_LEFT);
    }

    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /** RFC 4648 base32, unpadded — what otpauth URIs carry. */
    private static function base32Encode(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
        }

        return $out;
    }

    private static function base32Decode(string $secret): string
    {
        $secret = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $secret) ?? '');
        if ($secret === '') {
            return '';
        }

        $bits = '';
        for ($i = 0, $n = strlen($secret); $i < $n; $i++) {
            $index = strpos(self::ALPHABET, $secret[$i]);
            if ($index === false) {
                return '';
            }
            $bits .= str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
        }

        $out = '';
        // Trailing bits that don't make a whole byte are padding; drop them.
        foreach (str_split(substr($bits, 0, intdiv(strlen($bits), 8) * 8), 8) as $byte) {
            $out .= chr(bindec($byte));
        }

        return $out;
    }
}
