<?php

/**
 * Elementor: the panel category, the widgets, their stylesheet, the dynamic tags, the Kit.
 *
 * The widget classes load on `elementor/init`, because `\Elementor\Widget_Base` is declared
 * by Elementor itself: a file extending it at load time is a fatal wherever Elementor is
 * deactivated.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

require FRASCELLA_DIR . 'inc/elementor/sections.php';   // what each widget offers: the spec
require FRASCELLA_DIR . 'inc/elementor/languages.php';  // Theme Builder documents, one per language
require FRASCELLA_DIR . 'inc/elementor/stations.php';   // the desk's camera stations, on containers

add_action('elementor/init', static function (): void {
    require_once FRASCELLA_DIR . 'inc/elementor/widgets.php';
});

/** Its own group in the panel, above Elementor's. */
add_action('elementor/elements/categories_registered', static function ($manager): void {
    $manager->add_category('frascella', ['title' => __('frascella.dev', 'frascella'), 'icon' => 'eicon-apps'], 1);
});

add_action('elementor/widgets/register', static function ($widgets): void {
    foreach (frascella_elementor_widgets() as $class) {
        if (class_exists($class)) {
            $widgets->register(new $class());
        }
    }
});

/**
 * The page's one `<main>`, on Elementor's full-width template too: the theme's templates
 * open it, and this template is Elementor's own and skips them.
 */
add_action('elementor/page_templates/header-footer/before_content', static function (): void {
    echo '<main id="content">';
});
add_action('elementor/page_templates/header-footer/after_content', static function (): void {
    echo '</main>';
});

/**
 * The rules that take Elementor's layout back off (assets/elementor.css). They state a fact
 * about Elementor, not about the design, so they live here and not in the theme. Loaded
 * after Elementor's own and before the theme's, which depends on this handle.
 */
add_action('wp_enqueue_scripts', static function (): void {
    if (did_action('elementor/loaded')) {
        wp_enqueue_style('frascella-elementor', FRASCELLA_URL . 'assets/elementor.css', ['elementor-frontend'], FRASCELLA_VERSION);
    }
}, 5);

add_action('elementor/editor/after_enqueue_styles', static function (): void {
    wp_enqueue_style('frascella-elementor-editor', FRASCELLA_URL . 'assets/elementor.css', [], FRASCELLA_VERSION);
});

/** The facts as dynamic tags, in a group of their own. */
add_action('elementor/dynamic_tags/register', static function ($tags): void {
    require_once FRASCELLA_DIR . 'inc/elementor/tags.php';
    $tags->register_group('frascella', ['title' => __('frascella.dev', 'frascella')]);
    $tags->register(new Frascella_Tag_Fact());
    $tags->register(new Frascella_Tag_Link());
});

/**
 * The Kit: the theme's palette and type (tokens.json) as Elementor's global colours and
 * fonts, so a native widget can wear them. Nothing is applied by default — the theme's
 * classes do that — and Google Fonts stay off: fonts are served by the site, and fetching
 * them from Google would hand every visitor's address to a third party.
 *
 * Run on activation and with `wp frascella kit`, after changing tokens.json.
 */
function frascella_apply_kit(): bool
{
    update_option('elementor_google_font', '0');
    $kit = (int) get_option('elementor_active_kit');
    if ($kit <= 0 || get_post_type($kit) !== 'elementor_library' || !function_exists('frascella_tokens')) {
        return false;
    }
    $tokens = frascella_tokens();
    $settings = get_post_meta($kit, '_elementor_page_settings', true);
    $settings = is_array($settings) ? $settings : [];

    $system = [];
    foreach ((array) ($tokens['kit']['colors'] ?? []) as $id => $name) {
        $system[] = ['_id' => $id, 'title' => (string) ($tokens['colors'][$name]['label'] ?? $name), 'color' => frascella_color((string) $name)];
    }
    $custom = [];
    foreach ((array) $tokens['colors'] as $name => $color) {
        if (!in_array($name, (array) ($tokens['kit']['colors'] ?? []), true)) {
            $custom[] = ['_id' => 'frascella' . strtolower((string) $name), 'title' => (string) $color['label'], 'color' => (string) $color['value']];
        }
    }
    $typography = [];
    foreach ((array) ($tokens['kit']['typography'] ?? []) as $id => $name) {
        $font = (array) ($tokens['fonts'][$name] ?? []);
        $typography[] = [
            '_id' => $id,
            'title' => (string) ($font['label'] ?? $name),
            'typography_typography' => 'custom',
            'typography_font_family' => (string) ($font['family'] ?? ''),
            'typography_font_weight' => (string) ($font['weight'] ?? '400'),
        ];
    }
    $settings['system_colors'] = $system;
    $settings['custom_colors'] = $custom;
    $settings['system_typography'] = $typography;
    update_post_meta($kit, '_elementor_page_settings', $settings);
    if (class_exists('\Elementor\Plugin')) {
        \Elementor\Plugin::$instance->files_manager->clear_cache();
    }

    return true;
}
