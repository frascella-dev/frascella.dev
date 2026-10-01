<?php

/**
 * The helpers the templates call.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** Escaped text. The one way words reach the page. */
function frascella_e(mixed $value): string
{
    return esc_html((string) $value);
}

/**
 * Words from the tree that may hold `<em>`, `<strong>`, `<br>` or a link — never a
 * visitor's input, which goes through frascella_e().
 */
function frascella_html(string $value): string
{
    return wp_kses($value, ['em' => [], 'strong' => [], 'br' => [], 'a' => ['href' => true]]);
}

/**
 * Whether Elementor Pro's Theme Builder printed a location (header, footer, single,
 * archive). The theme's own markup runs when it did not.
 */
function frascella_location(string $location): bool
{
    return function_exists('elementor_theme_do_location') && elementor_theme_do_location($location);
}

/** Whether this document was laid out in the builder: Elementor's own flag, not "has content". */
function frascella_page_is_built(?int $id = null): bool
{
    $id ??= (int) get_the_ID();

    return $id > 0 && get_post_meta($id, '_elementor_edit_mode', true) === 'builder';
}

/**
 * The body of a page, from wherever it is: the Theme Builder's document for this kind of
 * page, then the builder's layout for this one page, then the theme's own template part.
 *
 * The third is what runs with no Elementor at all, and it is the same part the plugin's
 * widget prints — so the three are the same page, and the markup exists once.
 */
function frascella_document(string $location, string $part, array $args = []): void
{
    if (frascella_location($location)) {
        return;
    }
    if (frascella_page_is_built()) {
        the_content();

        return;
    }
    get_template_part("template-parts/$part", null, $args);
}

/** The home page, in this reader's language. */
function frascella_home_url(): string
{
    return function_exists('pll_home_url') ? (string) pll_home_url() : home_url('/');
}

/**
 * The privacy notice, in this reader's language: WordPress's privacy page and its
 * Polylang translation. A plain `/privacy/` would send every language to the default one.
 */
function frascella_privacy_url(): string
{
    $id = (int) get_option('wp_page_for_privacy_policy');
    if ($id > 0 && function_exists('pll_get_post')) {
        $id = (int) (pll_get_post($id) ?: $id);
    }

    return $id > 0 && get_post_status($id) === 'publish' ? (string) get_permalink($id) : '';
}

/**
 * A reveal on scroll, for the theme's own markup: `data-reveal`, with the stagger as a
 * custom property next to the element it times. Native Elementor widgets get the same
 * through a container with the class `frascella-reveal`.
 */
function frascella_reveal(float $delay = 0.0): string
{
    return $delay > 0 ? sprintf('data-reveal style="--reveal-delay:%ss"', rtrim(rtrim(number_format($delay, 2, '.', ''), '0'), '.')) : 'data-reveal';
}

/**
 * The mark: the EF monogram with its vermilion square (Sketch, page Logo). Decorative
 * wherever it is printed: the link around it carries the name.
 */
function frascella_logo_svg(): string
{
    return '<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false">'
        . '<path class="logo-paper" d="M80.928 22.8718C96.9442 28.9201 107.794 43.4431 109.665 59.8326L98.1755 56.751C96.5179 50.0425 92.8522 43.9552 87.6777 39.3544L81.2455 63.3829L109.595 70.9865L106.805 81.4107L78.455 73.8071L68.1458 112.319L57.7316 109.526L80.928 22.8718Z"/>'
        . '<path class="logo-square" d="M96.7848 120L86.3706 117.207L89.161 106.783L99.5752 109.576L96.7848 120Z"/>'
        . '<path class="logo-paper" d="M63.2076 47.3724L52.7934 44.5792L57.3279 27.6399L40.8388 23.2174L33.5138 50.5809L60.4171 57.7966L57.6266 68.2208L31.0879 61.1029C29.4431 75.5617 37.2165 89.5095 50.2575 95.7492L47.4304 106.31C27.1331 97.6967 15.7579 75.2138 21.6269 53.2894L33.2151 10L70.5326 20.0088L63.2076 47.3724Z"/>'
        . '</svg>';
}

/**
 * The menu's links, in this reader's language: the menu in the «Primary» position, which
 * Polylang swaps for the language's own. The header, the drawer and the footer's index all
 * read it, so there is one list of links to keep.
 *
 * @return list<array{url: string, title: string}>
 */
function frascella_menu_links(): array
{
    $locations = get_nav_menu_locations();
    $menu = (int) ($locations['primary'] ?? 0);
    $items = $menu > 0 ? wp_get_nav_menu_items($menu) : false;
    if (!is_array($items)) {
        return [];
    }
    $out = [];
    foreach ($items as $item) {
        if ((int) $item->menu_item_parent === 0) {
            $out[] = ['url' => (string) $item->url, 'title' => (string) $item->title];
        }
    }

    return $out;
}

/** The call to action's address: the contact section of this language's home page. */
function frascella_cta_url(): string
{
    return frascella_home_url() . frascella_s('nav.ctaAnchor');
}

/**
 * The element a part opens with: its own landmark (`header`, `footer`) when the theme
 * prints it, a `div` when a Theme Builder document does — Elementor Pro wraps that document
 * in the landmark already, and a landmark inside its namesake is two of them.
 */
function frascella_part_tag(array $args, string $own): string
{
    return in_array($args['tag'] ?? $own, ['header', 'footer', 'div'], true) ? (string) ($args['tag'] ?? $own) : $own;
}

/** Whether Elementor's editor is drawing this (its preview, or a widget it re-renders). */
function frascella_is_editing(): bool
{
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- which view this is; nothing is changed.
    if (isset($_GET['elementor-preview'])) {
        return true;
    }

    return class_exists('\Elementor\Plugin') && isset(\Elementor\Plugin::$instance->editor) && \Elementor\Plugin::$instance->editor->is_edit_mode();
}
