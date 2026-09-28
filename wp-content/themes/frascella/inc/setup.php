<?php

/**
 * What the theme declares to WordPress, to Elementor and to the plugins it draws.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

add_action('after_setup_theme', static function (): void {
    load_theme_textdomain('frascella', FRASCELLA_THEME_DIR . '/languages');

    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script', 'navigation-widgets']);

    register_nav_menus(['primary' => __('Primary', 'frascella')]);

    /*
     * Elementor Pro's Theme Builder may replace the header, the footer and the body of any
     * kind of page. Declaring the core locations is what lets the two halves cooperate: a
     * document the site has built wins, and the theme's own markup runs when there is none
     * (frascella_location() in inc/template.php).
     */
    add_theme_support('elementor-pro');

    /*
     * Plugins that send email in the site's look read it from here. The same tokens for
     * all of them (inc/tokens.php). Add a plugin's own switches next to its email key —
     * for instance `'styles' => false` when the theme draws its front end itself.
     */
    foreach (['agenda', 'voci', 'chiaro'] as $plugin) {
        add_theme_support($plugin, ['email' => frascella_email_tokens()]);
    }
    add_theme_support('postino', frascella_email_tokens());
});

add_action('elementor/theme/register_locations', static function ($manager): void {
    $manager->register_all_core_location();
});

/**
 * Elementor's own palette, fonts and container width off, once, when the theme is
 * switched on: the look is the theme's stylesheet, and a second source of colours in the
 * Kit would be a second place to change them. The plugin does the same on activation, so
 * either one alone is enough.
 */
add_action('after_switch_theme', static function (): void {
    update_option('elementor_disable_color_schemes', 'yes');
    update_option('elementor_disable_typography_schemes', 'yes');
    update_option('elementor_container_width', '');
});
