<?php

/**
 * The desk: the 3D scene behind the home page's sheet, and the page's side of its contract
 * (assets/src/desk/CONTRACT.md).
 *
 * A page has the desk when its layout holds the plugin's «Desk» widget (the intermezzo).
 * On such a page, and only there:
 * - `canvas#desk` and the sheet (template-parts/stage.php) open `<body>`, before the skip
 *   link: the scene requires the canvas to be the first thing in the body, and both are
 *   `aria-hidden` and take no focus;
 * - `<body>` gets `has-desk`, which lifts `main` and the footer above the sheet;
 * - the `desk` entry is enqueued next to the page's own (inc/assets.php).
 *
 * Never in Elementor's editor: there the page is being written, and a sheet over it would
 * hide what is being written. The cut-out words are then plain text.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** Whether this request draws the desk. */
function frascella_has_desk(): bool
{
    static $has = null;
    if ($has !== null) {
        return $has;
    }
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- which view this is; nothing is changed.
    if (isset($_GET['elementor-preview']) || is_admin() || !is_singular()) {
        return $has = false;
    }
    $data = (string) get_post_meta((int) get_queried_object_id(), '_elementor_data', true);

    return $has = str_contains($data, '"widgetType":"frascella-desk"');
}

add_filter('body_class', static function (array $classes): array {
    if (frascella_has_desk()) {
        $classes[] = 'has-desk';
    }

    return $classes;
});

add_action('wp_body_open', static function (): void {
    if (frascella_has_desk()) {
        get_template_part('template-parts/stage');
    }
}, 0);
