<?php

/**
 * The sitemap is WordPress's own; this file only tells it what, on this site, is not a
 * document.
 *
 * Core generates, paginates, updates and serves it. What it cannot know is which pages
 * are nobody's document — a confirmation, a private page, an author archive on a site with
 * one author — and a sitemap asking a crawler to index those spends trust for nothing.
 * The rule that keeps the two honest: a page marked noindex (inc/head.php) is also left
 * out here, through the same `frascella_noindex_ids` list.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

// No author archives on a site that does not have them.
add_filter('wp_sitemaps_add_provider', static fn ($provider, string $name) => $name === 'users' ? false : $provider, 10, 2);

// Categories and tags only where the site uses them.
add_filter('wp_sitemaps_taxonomies', static fn (array $taxonomies): array => (array) apply_filters('frascella_sitemap_taxonomies', []));

// The pages a filter marks as not documents (ids), out of the sitemap as out of the index.
add_filter('wp_sitemaps_posts_query_args', static function (array $args): array {
    $exclude = array_map('intval', (array) apply_filters('frascella_noindex_ids', []));
    if ($exclude !== []) {
        $args['post__not_in'] = array_merge((array) ($args['post__not_in'] ?? []), $exclude);
    }

    return $args;
});
