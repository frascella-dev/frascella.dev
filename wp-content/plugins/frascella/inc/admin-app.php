<?php

/**
 * The dashboard: Portfolio.
 *
 *   Portfolio
 *     Projects   write, translate, order and publish the work the home page shows
 *     Settings   the business's facts: name, place, VAT number, profiles
 *
 * Each item is a WordPress page holding the same React app (`build/admin.js`, source in
 * `src/`), told which view to show by `data-view` — the same shape as the owner's other
 * plugins (Agenda, Voci, Postino, Chiaro): their menu, their header with the views as tabs,
 * their cards and tables, @wordpress/components underneath. The settings live inside the
 * plugin's own section, as theirs do, not under WordPress's Settings.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** page slug => [view, capability] */
function frascella_admin_views(): array
{
    return [
        'frascella' => ['projects', 'frascella_edit'],
        'frascella-settings' => ['settings', 'frascella_manage'],
    ];
}

add_action('admin_menu', static function (): void {
    $render = static function (): void {
        $page = sanitize_key(wp_unslash((string) ($_GET['page'] ?? ''))); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- which menu page is open; nothing is changed.
        $views = frascella_admin_views();
        // `wp-header-end` is where WordPress moves other plugins' notices: above the app, not
        // into its header (WordPress's script otherwise puts them after the first heading).
        printf('<div class="wrap frascella-wrap"><hr class="wp-header-end" /><div id="frascella-app" data-view="%s"></div></div>', esc_attr($views[$page][0] ?? 'projects'));
    };
    $labels = [
        'frascella' => __('Projects', 'frascella'),
        'frascella-settings' => __('Settings', 'frascella'),
    ];

    $svg = (string) file_get_contents(FRASCELLA_DIR . 'assets/menu-icon.svg'); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- our own icon.
    $hooks = [add_menu_page(__('Portfolio', 'frascella'), __('Portfolio', 'frascella'), 'frascella_edit', 'frascella', $render, 'data:image/svg+xml;base64,' . base64_encode($svg), 24)];
    foreach (frascella_admin_views() as $slug => [$view, $cap]) {
        $hooks[] = add_submenu_page('frascella', $labels[$slug], $labels[$slug], $cap, $slug, $render);
    }
    foreach (array_filter($hooks) as $hook) {
        add_action("load-$hook", 'frascella_admin_assets');
    }
});

function frascella_admin_assets(): void
{
    add_action('admin_enqueue_scripts', static function (): void {
        $asset = FRASCELLA_DIR . 'build/admin.asset.php';
        if (!is_file($asset)) {
            return;
        }
        $meta = require $asset;
        $url = FRASCELLA_URL . 'build/';
        wp_enqueue_script('frascella-admin', $url . 'admin.js', $meta['dependencies'], $meta['version'], true);
        wp_enqueue_style('frascella-admin', $url . 'admin.css', ['wp-components'], $meta['version']);
        // The screenshot: WordPress's own media library.
        wp_enqueue_media();
        wp_set_script_translations('frascella-admin', 'frascella', FRASCELLA_DIR . 'languages');

        $pages = [];
        foreach (frascella_admin_views() as $slug => [$view, $cap]) {
            if (current_user_can($cap)) {
                $pages[$view] = admin_url("admin.php?page=$slug");
            }
        }
        wp_add_inline_script('frascella-admin', 'window.frascellaAdmin = ' . wp_json_encode([
            'site' => wp_specialchars_decode((string) get_bloginfo('name'), ENT_QUOTES),
            'can' => [
                'manage' => current_user_can('frascella_manage'),
                'edit' => current_user_can('frascella_edit'),
            ],
            'pages' => $pages,
            'icon' => FRASCELLA_URL . 'assets/icon.svg',
            'languages' => frascella_languages(),
            'mainLanguage' => frascella_default_language(),
            'home' => esc_url_raw(function_exists('pll_home_url') ? (string) pll_home_url(frascella_default_language()) : home_url('/')),
        ]) . ';', 'before');
    });

    add_filter('admin_body_class', static fn (string $classes): string => "$classes frascella-screen");
}

/** "Settings" next to "Deactivate" in the plugin list. */
add_filter('plugin_action_links_' . plugin_basename(FRASCELLA_FILE), static function (array $links): array {
    if (current_user_can('frascella_manage')) {
        array_unshift($links, sprintf('<a href="%s">%s</a>', esc_url(admin_url('admin.php?page=frascella-settings')), esc_html__('Settings', 'frascella')));
    }

    return $links;
});
