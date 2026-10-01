<?php

/**
 * The palette and the type, from tokens.json.
 *
 * One file, three readers: Vite writes it as CSS custom properties, the plugin writes it
 * into Elementor's Kit (`frascella_apply_kit()`), and this file hands it to every plugin that
 * sends email in the site's colours. The hex values used to be copied by hand into each of
 * those places, and three copies of a colour are three colours by the second redesign.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/**
 * The decoded tokens, read once.
 *
 * @return array{colors: array<string, array{value: string, label: string}>, fonts: array<string, array<string, string>>, radius: string, kit: array<string, array<string, string>>, email: array<string, string>}
 */
function frascella_tokens(): array
{
    static $tokens = null;
    if ($tokens === null) {
        $file = FRASCELLA_THEME_DIR . '/tokens.json';
        $decoded = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
        $tokens = is_array($decoded) ? $decoded : [];
        $tokens += ['colors' => [], 'fonts' => [], 'radius' => '0px', 'kit' => [], 'email' => []];
    }

    return $tokens;
}

/** A colour by name, as a hex string. */
function frascella_color(string $name, string $fallback = '#000000'): string
{
    return (string) (frascella_tokens()['colors'][$name]['value'] ?? $fallback);
}

/**
 * The email look every mail-sending plugin reads through `add_theme_support()`: the same
 * keys the workspace's plugins (Agenda, Postino, Voci, Chiaro) expect, from the tokens.
 *
 * The logo is a PNG: most mail clients will not show an SVG.
 *
 * @return array<string, string>
 */
function frascella_email_tokens(): array
{
    $tokens = frascella_tokens();
    $out = [];
    foreach ((array) $tokens['email'] as $key => $source) {
        $out[$key] = str_starts_with($key, 'font_')
            ? (string) ($tokens['fonts'][$source]['stack'] ?? '')
            : frascella_color((string) $source);
    }
    $out['radius'] = (string) $tokens['radius'];
    $logo = FRASCELLA_THEME_DIR . '/assets/img/email-logo.png';
    if (is_file($logo)) {
        $out['logo'] = FRASCELLA_THEME_URI . '/assets/img/email-logo.png';
        $out['logo_width'] = '48px';
    }

    return $out;
}
