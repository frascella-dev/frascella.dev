<?php

/**
 * The `<head>`: title, description, canonical, languages, sharing card, robots, and the
 * boot script that tells the stylesheet what kind of page load this is.
 *
 * Hook priorities, so the order is readable in one place:
 *   0  referrer policy (before anything that makes a request)
 *   2  description, canonical, hreflang, Open Graph
 *   6  modulepreload (inc/assets.php)
 *   8  JSON-LD (inc/schema.php)
 *   99 the boot script
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/**
 * The pages a crawler is asked to leave alone.
 *
 * Said through `wp_robots`, WordPress's own mechanism, which every plugin with an opinion
 * about robots also reads — a hand-written `<meta name="robots">` beside it would be two
 * tags disagreeing. A page someone's link opens (a receipt, a private page, a confirmation)
 * says nothing without that someone, and adds itself through the `frascella_noindex` filter.
 */
function frascella_is_noindex(): bool
{
    if (is_404() || is_search()) {
        return true;
    }
    // The same list the sitemap leaves out (inc/sitemap.php): the two move together.
    if (is_singular() && in_array((int) get_queried_object_id(), array_map('intval', (array) apply_filters('frascella_noindex_ids', [])), true)) {
        return true;
    }

    return (bool) apply_filters('frascella_noindex', false);
}

add_filter('wp_robots', static fn (array $robots): array => frascella_is_noindex() ? wp_robots_no_robots($robots) : $robots);

/** The title: the tree's own on the front page, «Page - Name» elsewhere. */
add_filter('document_title_parts', static function (array $parts): array {
    if (is_front_page()) {
        return ['title' => frascella_s('meta.title')];
    }
    $parts['site'] = frascella_who()['name'];
    unset($parts['tagline']);

    return $parts;
});

add_filter('document_title_separator', static fn (): string => '-');

/**
 * This page's description: one a page states for itself (`frascella_description`), then its
 * excerpt, then the site's own sentence in this language.
 */
function frascella_description(): string
{
    $own = (string) apply_filters('frascella_description', '');
    if ($own !== '') {
        return $own;
    }
    if (is_singular() && !is_front_page()) {
        $excerpt = trim(wp_strip_all_tags((string) get_the_excerpt()));
        if ($excerpt !== '') {
            return $excerpt;
        }
    }

    return frascella_s('meta.description');
}

/**
 * The canonical. WordPress's own (removed in inc/cleanup.php) answers from the query, not
 * from the address; a page that wants another canonical says so through
 * `frascella_canonical_url`.
 */
function frascella_canonical(): string
{
    $own = apply_filters('frascella_canonical_url', null);
    if (is_string($own) && $own !== '') {
        return $own;
    }
    if (is_front_page()) {
        return function_exists('pll_home_url') ? (string) pll_home_url() : home_url('/');
    }
    if (is_singular()) {
        return (string) get_permalink();
    }
    $page = max(1, (int) get_query_var('paged'));
    if ($page > 1) {
        // Page two's canonical is page two: a paged list is not a pile of duplicates of its
        // first page.
        return (string) get_pagenum_link($page, false);
    }

    return home_url(add_query_arg([], $GLOBALS['wp']->request ? '/' . $GLOBALS['wp']->request . '/' : '/'));
}

/**
 * The languages of this page, from Polylang: the switcher and the head read the same
 * list, so they cannot disagree about which languages exist.
 *
 * @return list<array{locale: string, hreflang: string, url: string, endonym: string, current: bool}>
 */
function frascella_alternates(): array
{
    if (!function_exists('pll_the_languages')) {
        return [];
    }
    $languages = pll_the_languages(['raw' => 1, 'hide_if_no_translation' => 0]);
    if (!is_array($languages)) {
        return [];
    }
    $out = [];
    foreach ($languages as $language) {
        $slug = (string) ($language['slug'] ?? '');
        $url = (string) ($language['url'] ?? '');
        if ($slug === '' || $url === '') {
            continue;
        }
        // A language's first page is its root, `/` and `/en/`, not the permalink of the page
        // that holds it. pll_home_url() and not home_url(): on an English page Polylang
        // rewrites home_url() to `/en/`, and every alternate would point there.
        if (is_front_page() && function_exists('pll_home_url')) {
            $url = (string) pll_home_url($slug);
        }
        $tree = frascella_tree($slug);
        $out[] = [
            'locale' => $slug,
            'hreflang' => (string) ($tree['htmlLang'] ?? $slug),
            'endonym' => (string) ($tree['endonym'] ?? strtoupper($slug)),
            'url' => $url,
            'current' => !empty($language['current_lang']),
        ];
    }

    return $out;
}

/**
 * The referrer policy, stated by the page, when a filter asks for one.
 *
 * A lesson from a real site: a server sending `Referrer-Policy: same-origin` makes Firefox
 * and Safari send a cross-site beacon (an analytics service's, for one) with `Origin:
 * null`, and a service that accepts events only from registered domains refuses it. A
 * `<meta name="referrer">` replaces the header's policy for the document; return
 * 'strict-origin-when-cross-origin' (the browsers' default) from `frascella_referrer_policy`
 * when the site loads such a service. Never on a page whose address carries a token.
 */
add_action('wp_head', static function (): void {
    $policy = (string) apply_filters('frascella_referrer_policy', '');
    if ($policy !== '') {
        printf('<meta name="referrer" content="%s" />' . "\n", esc_attr($policy));
    }
}, 0);

add_action('wp_head', static function (): void {
    $title = wp_get_document_title();
    $description = frascella_description();
    $canonical = frascella_canonical();

    printf('<meta name="description" content="%s" />' . "\n", esc_attr($description));
    printf('<link rel="canonical" href="%s" />' . "\n", esc_url($canonical));

    $alternates = frascella_alternates();
    if (!frascella_is_noindex() && count($alternates) > 1) {
        foreach ($alternates as $link) {
            printf('<link rel="alternate" hreflang="%s" href="%s" />' . "\n", esc_attr($link['hreflang']), esc_url($link['url']));
        }
        // x-default is the default language's address, taken from the set: a page's
        // address can be a different word in each language.
        $default = $alternates[0];
        $root = function_exists('pll_default_language') ? (string) pll_default_language('slug') : '';
        foreach ($alternates as $link) {
            if ($link['locale'] === $root) {
                $default = $link;
            }
        }
        printf('<link rel="alternate" hreflang="x-default" href="%s" />' . "\n", esc_url($default['url']));
    }

    printf('<meta property="og:title" content="%s" />' . "\n", esc_attr($title));
    printf('<meta property="og:description" content="%s" />' . "\n", esc_attr($description));
    printf('<meta property="og:type" content="%s" />' . "\n", is_singular('post') ? 'article' : 'website');
    printf('<meta property="og:url" content="%s" />' . "\n", esc_url($canonical));
    printf('<meta property="og:site_name" content="%s" />' . "\n", esc_attr(frascella_who()['name']));
    printf('<meta property="og:locale" content="%s" />' . "\n", esc_attr((string) (frascella_tree()['ogLocale'] ?? 'it_IT')));
    $image = frascella_og_image();
    if ($image !== null) {
        printf('<meta property="og:image" content="%s" />' . "\n", esc_url($image['url']));
        printf('<meta property="og:image:width" content="%d" />' . "\n", $image['width']);
        printf('<meta property="og:image:height" content="%d" />' . "\n", $image['height']);
        echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
    }
}, 2);

/**
 * The sharing card: this page's featured image, then the front page's. None is better
 * than a wrong one.
 *
 * @return array{url: string, width: int, height: int}|null
 */
function frascella_og_image(): ?array
{
    $id = is_singular() && has_post_thumbnail() ? (int) get_post_thumbnail_id() : 0;
    if ($id === 0) {
        $front = (int) get_option('page_on_front');
        $id = $front > 0 ? (int) get_post_thumbnail_id($front) : 0;
    }
    $src = $id > 0 ? wp_get_attachment_image_src($id, 'full') : false;
    if (!is_array($src)) {
        return null;
    }

    // Scrapers cache a card by its URL for days: a stable address is a card nobody sees change.
    return [
        'url' => add_query_arg('v', (string) get_post_modified_time('U', true, $id), (string) $src[0]),
        'width' => (int) $src[1],
        'height' => (int) $src[2],
    ];
}

/**
 * The two Latin font files, preloaded: the stylesheet names them only once it has arrived
 * and been parsed, and the opening's words (the LCP) wait for them. The Latin-extended
 * files load only when a page has such a letter.
 */
add_action('wp_head', static function (): void {
    foreach (['assets/fonts/schibsted-grotesk-latin.woff2', 'assets/fonts/gloock-latin.woff2'] as $key) {
        $file = (string) (frascella_manifest()[$key]['file'] ?? '');
        if ($file !== '') {
            printf('<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin />' . "\n", esc_url(frascella_dist_url($file)));
        }
    }
}, 5);

/**
 * The boot script: blocking on purpose, and tiny.
 *
 * The stylesheet holds back what the reveal layer brings in only under `html.motion`, so
 * this has to land before the first paint or the page flashes its static self and jumps.
 * With no JavaScript, or with reduced motion, `motion` is never set and nothing is held
 * back.
 *
 * In Elementor's preview the page is being written, not read: `editing` instead, and
 * nothing held back — Elementor draws and redraws sections after the page has loaded, and
 * a reveal that already ran would leave them invisible in the editor.
 */
function frascella_boot_script(): string
{
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- which view this is; nothing is changed.
    if (isset($_GET['elementor-preview'])) {
        return '(function(){document.documentElement.classList.add("js","editing");})();';
    }

    return '(function(){var d=document.documentElement;d.classList.add("js");'
        . 'if(!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("motion");}})();';
}

add_action('wp_head', static function (): void {
    wp_print_inline_script_tag(frascella_boot_script());
}, 99);
