<?php

/**
 * Polylang: Italian on the root, English under /en/.
 *
 *   bin/wp eval-file /var/www/html/tools/setup-languages.php
 *
 * Idempotent. Change the list for a project with other languages; add a
 * `inc/content/{slug}.php` to the theme for each one.
 */

if (!defined('ABSPATH')) {
    exit(1);
}
if (!function_exists('PLL')) {
    fwrite(STDERR, "Polylang is not active.\n");
    exit(1);
}

$model = PLL()->model;
$languages = [
    ['name' => 'Italiano', 'slug' => 'it', 'locale' => 'it_IT', 'flag' => 'it', 'term_group' => 0],
    ['name' => 'English', 'slug' => 'en', 'locale' => 'en_GB', 'flag' => 'gb', 'term_group' => 1],
];
foreach ($languages as $language) {
    if ($model->get_language($language['slug'])) {
        echo "· {$language['slug']} already there\n";
        continue;
    }
    $added = $model->add_language($language + ['rtl' => 0, 'no_default_cat' => true]);
    echo is_wp_error($added) ? "! {$language['slug']}: " . $added->get_error_message() . "\n" : "✓ {$language['slug']}\n";
}

$options = (array) get_option('polylang', []);
update_option('polylang', array_merge($options, [
    'default_lang' => 'it',
    // The language as a folder (`/en/`), the default one on the root.
    'force_lang' => 1,
    'hide_default' => 1,
    // No redirect on the browser's language: an address answers the same to everyone.
    'browser' => 0,
    // A language's home is its root, not its home page's permalink.
    'redirect_lang' => 1,
    // A photograph is the same photograph in every language (alt texts: the plugin's media.php).
    'media_support' => 0,
    'rewrite' => 1,
]));
$model->clean_languages_cache();
delete_transient('pll_languages_list');

// Content created before the languages existed has none: give it the default.
foreach (get_posts(['post_type' => ['page', 'post'], 'numberposts' => -1, 'fields' => 'ids', 'lang' => '', 'post_status' => 'any']) as $id) {
    if (!pll_get_post_language((int) $id)) {
        pll_set_post_language((int) $id, 'it');
    }
}
echo "Languages ready.\n";
