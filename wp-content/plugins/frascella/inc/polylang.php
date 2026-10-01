<?php

/**
 * The languages: what is translatable, and its addresses.
 *
 * - **Translatable in code, not in Polylang's settings screen.** A post type or taxonomy
 *   this plugin registers declares itself here (`frascella_translatable_post_types`), so a new
 *   install is right without anybody ticking a box.
 * - **The same slug in every language.** WordPress makes slugs unique across the whole
 *   site, so the English copy of `/servizi/` would become `/en/servizi-2/`. Within its
 *   language a slug is unique already; the language prefix tells the two apart.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

add_filter('pll_get_post_types', static function (array $types, bool $settings): array {
    foreach ((array) apply_filters('frascella_translatable_post_types', []) as $type) {
        $types[$type] = $type;
    }

    return $types;
}, 10, 2);

add_filter('pll_get_taxonomies', static function (array $taxonomies, bool $settings): array {
    foreach ((array) apply_filters('frascella_translatable_taxonomies', []) as $taxonomy) {
        $taxonomies[$taxonomy] = $taxonomy;
    }

    return $taxonomies;
}, 10, 2);

/**
 * A translation keeps the slug of its original: `/servizi/` and `/en/servizi/` instead of
 * `/en/servizi-2/`. Only when the slug is free within the post's own language.
 */
add_filter('wp_unique_post_slug', static function (string $slug, int $id, string $status, string $type, int $parent, string $original): string {
    if ($slug === $original || !function_exists('pll_get_post_language') || !function_exists('pll_is_translated_post_type') || !pll_is_translated_post_type($type)) {
        return $slug;
    }
    $lang = (string) pll_get_post_language($id);
    if ($lang === '') {
        return $slug;
    }
    // Every post with that slug, then their languages: a `lang` argument is ignored where
    // Polylang's query filter does not run (WP-CLI, some admin requests).
    $same = get_posts([
        'post_type' => $type,
        'name' => $original,
        'post_parent' => $parent,
        'post_status' => 'any',
        'lang' => '',
        'fields' => 'ids',
        'numberposts' => -1,
        'exclude' => [$id],
    ]);
    foreach ($same as $other) {
        if (pll_get_post_language((int) $other) === $lang) {
            return $slug;
        }
    }

    return $original;
}, 10, 6);

/**
 * A page or a post asked for under a language's address is resolved in that language.
 *
 * With the same slug in every language (above), WordPress resolves `/en/privacy/` to the
 * first `privacy` it finds — often the default language's — and redirect_canonical then
 * sends the reader there. This runs on pre_get_posts, before WP_Query turns `pagename` or
 * `name` into a post: from then on the choice is made and redirect_canonical defends it.
 * An address with no prefix is the default language's (Polylang's `hide_default`).
 */
add_action('pre_get_posts', static function (WP_Query $query): void {
    if (is_admin() || !$query->is_main_query() || !function_exists('pll_get_post_language') || !function_exists('pll_languages_list')) {
        return;
    }
    $lang = (string) $query->get('lang');
    if (!in_array($lang, (array) pll_languages_list(['fields' => 'slug']), true)) {
        $options = (array) get_option('polylang', []);
        if (empty($options['hide_default']) || !function_exists('pll_default_language')) {
            return;
        }
        $lang = (string) pll_default_language('slug');
    }

    // A page, by path.
    $pagename = (string) $query->get('pagename');
    if ($pagename !== '') {
        $found = get_page_by_path($pagename);
        if ($found instanceof WP_Post && pll_get_post_language((int) $found->ID) !== $lang) {
            $translated = function_exists('pll_get_post') ? (int) (pll_get_post((int) $found->ID, $lang) ?: 0) : 0;
            if ($translated > 0) {
                $query->set('pagename', '');
                $query->set('page_id', $translated);
            }
        }

        return;
    }

    // A single post of any type, by slug: the one in the address's language, by id.
    $name = (string) $query->get('name');
    $type = $query->get('post_type') ?: 'post';
    if ($name === '' || !is_string($type)) {
        return;
    }
    foreach (get_posts(['post_type' => $type, 'post_status' => 'publish', 'numberposts' => 10, 'name' => $name, 'lang' => '', 'fields' => 'ids']) as $candidate) {
        if (pll_get_post_language((int) $candidate) === $lang) {
            $query->set('name', '');
            $query->set('p', (int) $candidate);
            $query->set('post_type', $type);

            return;
        }
    }
}, 1);
