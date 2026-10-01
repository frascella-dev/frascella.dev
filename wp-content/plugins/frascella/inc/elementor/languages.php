<?php

/**
 * Theme Builder documents, one per language (Elementor Pro and Polylang).
 *
 * A header, a footer or a single-post layout is one Elementor document for the whole site,
 * and a word changed in it would be the same word on every language's pages. So each
 * document has a copy per language: the default language's copy carries the display
 * conditions; each other copy points to it (`_frascella_translation_of`) and is served in its
 * place on that language's pages, through the filter Elementor Pro keeps for translation
 * plugins. Every copy states its language in `_frascella_lang` — which is also what the editor
 * reads to start a widget's fields from that language's words.
 *
 * A document with no copy in a language is served as it is. To add one: duplicate the
 * document, then set the two metas (`wp frascella translate-template <id> <lang>` does both).
 *
 * Without Elementor Pro or Polylang none of this runs and nothing breaks.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** The copy of a Theme Builder document in a language, or 0 when there is none. */
function frascella_template_translation(int $id, string $lang): int
{
    static $cache = [];
    $key = "$id:$lang";
    if (!isset($cache[$key])) {
        $found = get_posts([
            'post_type' => 'elementor_library',
            'post_status' => 'publish',
            'numberposts' => 1,
            'fields' => 'ids',
            'meta_query' => [
                ['key' => '_frascella_translation_of', 'value' => (string) $id],
                ['key' => '_frascella_lang', 'value' => $lang],
            ],
        ]);
        $cache[$key] = (int) ($found[0] ?? 0);
    }

    return $cache[$key];
}

/** On an English page, the English copy of the header, the footer, the single layout… */
add_filter('elementor/theme/get_location_templates/template_id', static function ($id) {
    if (!function_exists('pll_current_language')) {
        return $id;
    }
    $lang = (string) pll_current_language('slug');
    if ($lang === '' || $lang === (string) get_post_meta((int) $id, '_frascella_lang', true)) {
        return $id;
    }

    return frascella_template_translation((int) $id, $lang) ?: $id;
});

/**
 * The editor's preview of a copy speaks its language. The preview is a front-end request
 * in the site's main language; without this, every word the widgets read from the site
 * would come out in the main language beside the copy's fields.
 */
add_action('wp', static function (): void {
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- which document is previewed; nothing is changed.
    $id = (int) ($_GET['elementor-preview'] ?? 0);
    if ($id <= 0 || get_post_type($id) !== 'elementor_library' || !function_exists('PLL')) {
        return;
    }
    $lang = (string) get_post_meta($id, '_frascella_lang', true);
    $language = $lang !== '' ? PLL()->model->get_language($lang) : false;
    if ($language) {
        PLL()->curlang = $language;
    }
}, 0);

/**
 * Make a copy of a Theme Builder document for a language: a duplicate of its layout, its
 * type and its settings, without its display conditions (the original keeps those).
 */
function frascella_translate_template(int $id, string $lang): int|WP_Error
{
    $post = get_post($id);
    if (!$post || $post->post_type !== 'elementor_library') {
        return new WP_Error('frascella_not_template', __('Not an Elementor template.', 'frascella'));
    }
    $existing = frascella_template_translation($id, $lang);
    if ($existing > 0) {
        return $existing;
    }
    $main = function_exists('pll_default_language') ? (string) pll_default_language('slug') : '';
    if ($main !== '' && get_post_meta($id, '_frascella_lang', true) === '') {
        update_post_meta($id, '_frascella_lang', $main);
    }
    $copy = wp_insert_post([
        'post_type' => 'elementor_library',
        'post_status' => 'publish',
        'post_title' => $post->post_title . ' (' . strtoupper($lang) . ')',
    ], true);
    if (is_wp_error($copy)) {
        return $copy;
    }
    foreach (['_elementor_data', '_elementor_edit_mode', '_elementor_template_type', '_elementor_version', '_elementor_page_settings'] as $meta) {
        $value = get_post_meta($id, $meta, true);
        if ($value !== '') {
            update_post_meta($copy, $meta, is_string($value) ? wp_slash($value) : $value);
        }
    }
    foreach (wp_get_object_terms($id, 'elementor_library_type', ['fields' => 'slugs']) as $type) {
        wp_set_object_terms($copy, $type, 'elementor_library_type', true);
    }
    update_post_meta($copy, '_frascella_lang', $lang);
    update_post_meta($copy, '_frascella_translation_of', (string) $id);

    return (int) $copy;
}
