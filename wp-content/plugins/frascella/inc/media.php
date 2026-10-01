<?php

/**
 * A photograph's alt text in every language.
 *
 * WordPress gives an image one alt text, and a media item is the same file in every
 * language (media is not translated: a photograph is the same photograph). So each of the
 * site's other languages gets a field of its own next to WordPress's — «Alternative text
 * (EN)» — shown in the media library and in Elementor's media modal, and an Image widget
 * prints the one for the page's language, falling back to WordPress's.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** The languages other than the default, which get a field of their own. @return list<string> */
function frascella_media_languages(): array
{
    if (!function_exists('pll_languages_list') || !function_exists('pll_default_language')) {
        return [];
    }
    $default = (string) pll_default_language('slug');

    return array_values(array_filter(array_map('strval', (array) pll_languages_list(['fields' => 'slug'])), static fn (string $l): bool => $l !== $default));
}

/** The alt text of an attachment in a language (the current one by default). */
function frascella_attachment_alt(int $id, string $lang = ''): string
{
    $lang = $lang !== '' ? $lang : (function_exists('pll_current_language') ? (string) pll_current_language('slug') : '');
    $own = $lang !== '' ? trim((string) get_post_meta($id, '_frascella_alt_' . $lang, true)) : '';

    return $own !== '' ? $own : trim((string) get_post_meta($id, '_wp_attachment_image_alt', true));
}

add_filter('attachment_fields_to_edit', static function (array $fields, WP_Post $post): array {
    if (!wp_attachment_is_image($post)) {
        return $fields;
    }
    foreach (frascella_media_languages() as $lang) {
        $fields['frascella_alt_' . $lang] = [
            /* translators: %s: language code, e.g. EN. */
            'label' => sprintf(__('Alternative text (%s)', 'frascella'), strtoupper($lang)),
            'input' => 'text',
            'value' => (string) get_post_meta($post->ID, '_frascella_alt_' . $lang, true),
        ];
    }

    return $fields;
}, 10, 2);

add_filter('attachment_fields_to_save', static function (array $post, array $attachment): array {
    foreach (frascella_media_languages() as $lang) {
        if (isset($attachment['frascella_alt_' . $lang])) {
            update_post_meta((int) $post['ID'], '_frascella_alt_' . $lang, sanitize_text_field((string) $attachment['frascella_alt_' . $lang]));
        }
    }

    return $post;
}, 10, 2);

/** An Image widget prints the alt text of the page's language. */
add_filter('elementor/image_size/get_attachment_image_html', static function (string $html, array $settings, string $size, string $key): string {
    $id = (int) ($settings[$key]['id'] ?? 0);
    if ($id <= 0 || $html === '') {
        return $html;
    }
    $tags = new WP_HTML_Tag_Processor($html);
    if ($tags->next_tag('img')) {
        $tags->set_attribute('alt', frascella_attachment_alt($id));
        $html = $tags->get_updated_html();
    }

    return $html;
}, 10, 4);
