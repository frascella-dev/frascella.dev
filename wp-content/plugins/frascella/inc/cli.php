<?php

/**
 * WP-CLI: `wp frascella …`.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

if (!defined('WP_CLI') || !WP_CLI) {
    return;
}

/** Write the theme's tokens.json into Elementor's Kit (after changing it). */
WP_CLI::add_command('frascella kit', static function (): void {
    frascella_apply_kit() ? WP_CLI::success('Kit written from tokens.json.') : WP_CLI::error('No active Elementor Kit, or the theme is not active.');
});

/**
 * Copy a Theme Builder document for a language (Elementor Pro + Polylang).
 *
 * ## OPTIONS
 *
 * <id>
 * : The document in the default language.
 *
 * <lang>
 * : The language slug of the copy, e.g. en.
 */
WP_CLI::add_command('frascella translate-template', static function (array $args): void {
    [$id, $lang] = $args + [0, ''];
    $copy = frascella_translate_template((int) $id, (string) $lang);
    if (is_wp_error($copy)) {
        WP_CLI::error($copy->get_error_message());
    }
    WP_CLI::success("Copy for $lang: $copy");
});
