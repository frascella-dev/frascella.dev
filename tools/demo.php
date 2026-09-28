<?php

/**
 * A demo home page, built the way every page of a Bottega site is built.
 *
 *   bin/wp eval-file /var/www/html/tools/demo.php [rebuild]
 *
 * Italian and English, linked by Polylang, the Italian one as the front page:
 * - a welcome section of native widgets in a container with the theme's classes
 *   (`sheet`, `measure`, `display`, `prose`);
 * - three columns in an `frascella-reveal` container, which brings them in one after the other;
 * - the plugin's «Contact card» widget, whose fields start from the theme's words;
 * - demo facts (an invented business, for this machine only), a privacy page, a menu per
 *   language.
 *
 * It exists so that a fresh install has something to look at and the e2e tests have
 * something to test. Delete it from a real project once the real pages exist, or keep it
 * as the example of how a page is composed from code.
 *
 * Idempotent: a page already built is left alone unless `rebuild`.
 */

if (!defined('ABSPATH')) {
    exit(1);
}

$rebuild = in_array('rebuild', (array) ($args ?? []), true);

/* The pieces an Elementor document is made of --------------------------------------------- */

$id = static fn (): string => substr(bin2hex(random_bytes(4)), 0, 7);
$box = static fn (string $classes, array $children, string $tag = 'div') => [
    'id' => $id(), 'elType' => 'container', 'isInner' => false,
    'settings' => ['content_width' => 'full', 'html_tag' => $tag, 'css_classes' => $classes,
        'padding' => ['unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true],
        'margin' => ['unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true]],
    'elements' => $children,
];
$widget = static fn (string $type, array $settings, string $classes = '') => [
    'id' => $id(), 'elType' => 'widget', 'widgetType' => $type,
    'settings' => $classes !== '' ? $settings + ['_css_classes' => $classes] : $settings, 'elements' => [],
];
$heading = static fn (string $title, string $tag, string $classes) => $widget('heading', ['title' => $title, 'header_size' => $tag], $classes);
$text = static fn (string $html, string $classes) => $widget('text-editor', ['editor' => $html], $classes);

/* The words of the demo, per language ------------------------------------------------------ */

$words = [
    'it' => [
        'title' => 'Home',
        'eyebrow' => 'Benvenuti',
        'heading' => 'Un sito fatto<br><em>come si deve</em>',
        'lede' => '<p>Ogni parola di questa pagina è un widget di Elementor: si scrive, si sposta e si sostituisce nell’editor. Il disegno lo portano le classi del tema.</p>',
        'columns' => [['Le parole', 'Titoli e testi sono widget nativi, con la classe del tema.'], ['I dati', 'Un widget del plugin solo dove ci sono dati o comportamento.'], ['Le lingue', 'Ogni campo parte dalle parole della sua lingua.']],
        'privacy' => 'Privacy',
    ],
    'en' => [
        'title' => 'Home',
        'eyebrow' => 'Welcome',
        'heading' => 'A site made<br><em>the proper way</em>',
        'lede' => '<p>Every word on this page is an Elementor widget: written, moved and replaced in the editor. The design comes from the theme’s classes.</p>',
        'columns' => [['The words', 'Headings and texts are native widgets, with the theme’s class.'], ['The data', 'A plugin widget only where there is data or behaviour.'], ['The languages', 'Every field starts from its own language’s words.']],
        'privacy' => 'Privacy',
    ],
];

$layout = static function (array $w) use ($box, $heading, $text, $widget): array {
    $columns = array_map(static fn (array $c): array => $box('demo-column', [
        $heading($c[0], 'h3', 'demo-column-title'),
        $text('<p>' . $c[1] . '</p>', 'prose'),
    ]), $w['columns']);

    return [
        $box('sheet', [$box('measure', [
            $heading($w['eyebrow'], 'p', 'eyebrow'),
            $heading($w['heading'], 'h1', 'display'),
            $text($w['lede'], 'prose demo-lede'),
        ])], 'section'),
        $box('sheet sheet--dark on-dark', [$box('measure demo-columns frascella-reveal', $columns)], 'section'),
        $widget('frascella-contact', []),
    ];
};

/* The facts: an invented business, for this machine only ---------------------------------- */

if (get_option('frascella_facts') === false) {
    update_option('frascella_facts', [
        'name' => 'frascella.dev', 'street' => 'Via Roma 1', 'postcode' => '00100', 'city' => 'Roma', 'region' => 'RM',
        'country' => 'IT', 'phone' => '+39 06 0000 0000', 'email' => 'info@example.org', 'vat' => '',
    ]);
}

/* The pages -------------------------------------------------------------------------------- */

// WordPress's own sample content, which no site keeps.
foreach ([get_page_by_path('sample-page'), get_page_by_path('hello-world', OBJECT, 'post')] as $sample) {
    if ($sample) {
        wp_delete_post($sample->ID, true);
    }
}

$page = static function (string $slug, string $title, string $lang): int {
    // By slug, then by language: under WP-CLI Polylang's query filter does not run, and a
    // `lang` argument to get_posts() is silently ignored.
    foreach (get_posts(['post_type' => 'page', 'name' => $slug, 'lang' => '', 'numberposts' => -1, 'fields' => 'ids', 'post_status' => 'any']) as $found) {
        if (!function_exists('pll_get_post_language') || pll_get_post_language((int) $found) === $lang) {
            return (int) $found;
        }
    }
    $new = (int) wp_insert_post(['post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug]);
    if (function_exists('pll_set_post_language')) {
        pll_set_post_language($new, $lang);
        // Saved again now that it has a language, so the plugin keeps the same slug in every
        // language (inc/polylang.php): WordPress gave it `home-2` at insert time.
        wp_update_post(['ID' => $new, 'post_name' => $slug]);
    }

    return $new;
};

$homes = [];
$privacies = [];
foreach ($words as $lang => $w) {
    $homes[$lang] = $page('home', $w['title'], $lang);
    $privacies[$lang] = $page('privacy', $w['privacy'], $lang);
    if ($rebuild || get_post_meta($homes[$lang], '_elementor_edit_mode', true) !== 'builder') {
        update_post_meta($homes[$lang], '_elementor_data', wp_slash((string) wp_json_encode($layout($w))));
        update_post_meta($homes[$lang], '_elementor_edit_mode', 'builder');
        update_post_meta($homes[$lang], '_elementor_template_type', 'wp-page');
        update_post_meta($homes[$lang], '_elementor_version', defined('ELEMENTOR_VERSION') ? ELEMENTOR_VERSION : '3.0.0');
        echo "✓ home ($lang)\n";
    }
    if (get_post_field('post_content', $privacies[$lang]) === '') {
        wp_update_post(['ID' => $privacies[$lang], 'post_content' => $lang === 'it'
            ? '<p>Questa pagina descrive quello che il sito fa con i dati. Scrivila dal codice: ogni volta che il sito raccoglie qualcosa di nuovo, cambia qui nello stesso commit.</p>'
            : '<p>This page describes what the site does with data. Write it from the code: whenever the site collects something new, it changes here in the same commit.</p>']);
    }
}
if (function_exists('pll_save_post_translations')) {
    pll_save_post_translations($homes);
    pll_save_post_translations($privacies);
}
update_option('show_on_front', 'page');
update_option('page_on_front', $homes['it']);
update_option('wp_page_for_privacy_policy', $privacies['it']);

/* A menu per language, in the «Primary» position ------------------------------------------- */

$menus = [];
foreach ($words as $lang => $w) {
    $name = 'Primary (' . strtoupper($lang) . ')';
    $menu = wp_get_nav_menu_object($name);
    $menuId = $menu ? (int) $menu->term_id : (int) wp_create_nav_menu($name);
    if (!$menu) {
        foreach ([$homes[$lang], $privacies[$lang]] as $i => $target) {
            wp_update_nav_menu_item($menuId, 0, ['menu-item-object-id' => $target, 'menu-item-object' => 'page', 'menu-item-type' => 'post_type', 'menu-item-status' => 'publish', 'menu-item-position' => $i + 1]);
        }
    }
    $menus[$lang] = $menuId;
}
set_theme_mod('nav_menu_locations', ['primary' => $menus['it']] + (array) get_theme_mod('nav_menu_locations', []));
if (function_exists('PLL')) {
    $options = (array) get_option('polylang', []);
    $options['nav_menus'][get_stylesheet()]['primary'] = $menus;
    update_option('polylang', $options);
}

if (class_exists('\Elementor\Plugin')) {
    \Elementor\Plugin::$instance->files_manager->clear_cache();
}
flush_rewrite_rules();
echo "Demo ready.\n";
