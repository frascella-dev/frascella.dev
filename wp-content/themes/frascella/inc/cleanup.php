<?php

/**
 * What WordPress prints and this site does not.
 *
 * The rule: a feature the site does not have should not be advertised in its head. Each
 * removal says why; remove a line here when the site gains the feature.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

// The canonical is inc/head.php's: WordPress answers from the query, not the address.
remove_action('wp_head', 'rel_canonical');

// The generator tag names the version: useful only to someone scanning for an unpatched one.
remove_action('wp_head', 'wp_generator');

// Shortlinks, adjacent-post links, RSD and WLW: more addresses for pages that already have one.
remove_action('wp_head', 'wp_shortlink_wp_head');
remove_action('template_redirect', 'wp_shortlink_header', 11);
remove_action('wp_head', 'adjacent_posts_rel_link_wp_head', 10);
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wlwmanifest_link');

// Emoji: a stylesheet and a script to replace characters every current system draws.
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('admin_print_scripts', 'print_emoji_detection_script');
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('admin_print_styles', 'print_emoji_styles');
add_filter('emoji_svg_url', '__return_false');

// The block editor's front-end styles: this is not a block theme, and no public page
// renders a block. They would be a second set of resets under a stylesheet that already
// declares everything.
add_action('wp_enqueue_scripts', static function (): void {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('global-styles');
    wp_dequeue_style('classic-theme-styles');
}, 100);
