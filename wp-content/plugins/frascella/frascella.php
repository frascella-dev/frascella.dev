<?php

/**
 * Plugin Name:       frascella.dev
 * Description:       The frascella.dev site's content and composition: the business's facts, the Elementor widgets for the parts of the site that have data or behaviour, the dynamic tags and the Kit. The theme draws; this plugin remembers and composes.
 * Version:           0.1.0
 * Requires at least: 6.6
 * Requires PHP:      8.2
 * Requires Plugins:  elementor
 * License:           GPL-2.0-or-later
 * Text Domain:       frascella
 *
 * Content lives here and not in the theme, because changing theme must not take the
 * site's content with it.
 *
 * ## What is a widget of this plugin, and what is not
 *
 * The words and pictures of a page are Elementor's own widgets — Heading, Text Editor,
 * Image — inside containers that carry the theme's classes: they are written, replaced and
 * moved in the editor like anything else. A widget of this plugin exists only where there
 * is data or behaviour. Its render() prints the theme's template part, every sentence it
 * prints is a field, and an empty field says what the site says in that language.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

define('FRASCELLA_VERSION', '0.1.0');
define('FRASCELLA_FILE', __FILE__);
define('FRASCELLA_DIR', plugin_dir_path(__FILE__));
define('FRASCELLA_URL', plugin_dir_url(__FILE__));

require FRASCELLA_DIR . 'inc/facts.php';      // the business's facts, in one option
require FRASCELLA_DIR . 'inc/media.php';      // a photograph's alt text in every language
require FRASCELLA_DIR . 'inc/polylang.php';   // the languages: what is translatable, and its addresses
require FRASCELLA_DIR . 'inc/elementor.php';  // the widgets, the dynamic tags, the Kit
require FRASCELLA_DIR . 'inc/cli.php';        // wp frascella …

/**
 * Activation: the addresses, and Elementor's own look off.
 *
 * The palette and the type are the theme's (tokens.json); these options are the supported
 * way to tell Elementor not to impose its own, written once and then left alone. The theme
 * writes the same ones when it is switched on, so either alone is enough.
 */
register_activation_hook(__FILE__, static function (): void {
    global $wp_rewrite;
    if (get_option('permalink_structure') === '') {
        $wp_rewrite->set_permalink_structure('/%postname%/');
    }
    // Polylang: a language's home is its root (`/en/`), not its home page's permalink.
    $polylang = get_option('polylang');
    if (is_array($polylang) && empty($polylang['redirect_lang'])) {
        $polylang['redirect_lang'] = 1;
        update_option('polylang', $polylang);
        delete_transient('pll_languages_list');
    }
    flush_rewrite_rules();
    update_option('elementor_disable_color_schemes', 'yes');
    update_option('elementor_disable_typography_schemes', 'yes');
    update_option('elementor_container_width', '');
    // The theme decides `loading` and `fetchpriority` for each image; Elementor's module
    // would add a second `fetchpriority` in front of the theme's.
    update_option('elementor_optimized_image_loading', '0');
    if (function_exists('frascella_apply_kit')) {
        frascella_apply_kit();
    }
});

register_deactivation_hook(__FILE__, static function (): void {
    flush_rewrite_rules();
});
