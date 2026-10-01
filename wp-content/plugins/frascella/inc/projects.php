<?php

/**
 * Projects: the work the home page shows, one card each (the «Works» widget).
 *
 * A project is a post of its own type, one per language through Polylang (declared
 * translatable here, so a fresh install needs no box ticked):
 * - the title is its name ("seveninktattoo.it");
 * - the text is the paragraph about it;
 * - the role, the stack, the status and the address are fields under the editor;
 * - the featured image is the screenshot (1440 × 900), which the desk shows on the laptop.
 * Their order is the «Order» box (menu_order), lowest first.
 *
 * Not public: a project has no page of its own, so no address, no archive and no entry
 * in the sitemap — it is read where it is shown.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

const FRASCELLA_PROJECT = 'frascella_project';

/** @return array<string, string> meta key => label */
function frascella_project_fields(): array
{
    return [
        'role' => __('Role («cliente», «cofondatore», «mio»)', 'frascella'),
        'stack' => __('Stack («WordPress · Elementor Pro»)', 'frascella'),
        'status' => __('Status («online», «in sviluppo»)', 'frascella'),
        'url' => __('Address (https://…, optional)', 'frascella'),
    ];
}

add_action('init', static function (): void {
    register_post_type(FRASCELLA_PROJECT, [
        'labels' => [
            'name' => __('Projects', 'frascella'),
            'singular_name' => __('Project', 'frascella'),
            'add_new_item' => __('Add a project', 'frascella'),
            'edit_item' => __('Edit the project', 'frascella'),
            'featured_image' => __('Screenshot (1440 × 900)', 'frascella'),
            'set_featured_image' => __('Set the screenshot', 'frascella'),
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_nav_menus' => false,
        'show_in_rest' => false,
        'exclude_from_search' => true,
        'publicly_queryable' => false,
        'has_archive' => false,
        'rewrite' => false,
        'menu_icon' => 'dashicons-portfolio',
        'menu_position' => 21,
        'supports' => ['title', 'editor', 'thumbnail', 'page-attributes'],
    ]);
    foreach (array_keys(frascella_project_fields()) as $key) {
        register_post_meta(FRASCELLA_PROJECT, '_frascella_' . $key, [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => false,
            'sanitize_callback' => $key === 'url'
                ? static fn ($v): string => str_starts_with((string) $v, 'https://') ? esc_url_raw((string) $v, ['https']) : ''
                : static fn ($v): string => sanitize_text_field((string) $v),
            'auth_callback' => static fn (): bool => current_user_can('edit_posts'),
        ]);
    }
});

// One project per language, linked by Polylang (inc/polylang.php).
add_filter('frascella_translatable_post_types', static fn (array $types): array => [...$types, FRASCELLA_PROJECT]);

/* The fields under the editor --------------------------------------------------------------- */

add_action('add_meta_boxes_' . FRASCELLA_PROJECT, static function (): void {
    add_meta_box('frascella-project', __('The card', 'frascella'), static function (WP_Post $post): void {
        wp_nonce_field('frascella_project', 'frascella_project_nonce');
        echo '<table class="form-table" role="presentation"><tbody>';
        foreach (frascella_project_fields() as $key => $label) {
            printf(
                '<tr><th scope="row"><label for="frascella-project-%1$s">%2$s</label></th><td><input type="%3$s" class="regular-text" id="frascella-project-%1$s" name="frascella_project[%1$s]" value="%4$s" /></td></tr>',
                esc_attr($key),
                esc_html($label),
                $key === 'url' ? 'url' : 'text',
                esc_attr((string) get_post_meta($post->ID, '_frascella_' . $key, true)),
            );
        }
        echo '</tbody></table>';
        echo '<p class="description">' . esc_html__('The text is the editor above; the screenshot is the featured image; the order is «Order» in Page Attributes.', 'frascella') . '</p>';
    }, null, 'normal', 'high');
});

add_action('save_post_' . FRASCELLA_PROJECT, static function (int $id): void {
    if (
        !isset($_POST['frascella_project_nonce'])
        || !wp_verify_nonce(sanitize_text_field(wp_unslash((string) $_POST['frascella_project_nonce'])), 'frascella_project')
        || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
        || !current_user_can('edit_post', $id)
    ) {
        return;
    }
    $input = isset($_POST['frascella_project']) && is_array($_POST['frascella_project']) ? wp_unslash($_POST['frascella_project']) : []; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitised by the registered meta's callback.
    foreach (array_keys(frascella_project_fields()) as $key) {
        // update_post_meta() runs the sanitize_callback registered above.
        update_post_meta($id, '_frascella_' . $key, (string) ($input[$key] ?? ''));
    }
});

/* Reading them -------------------------------------------------------------------------------- */

/**
 * The projects in a language (this request's by default), in their order.
 *
 * The language is checked on each result rather than passed to the query: under WP-CLI,
 * and on some admin requests (Elementor's editor re-rendering a widget), Polylang's query
 * filter does not run and a `lang` argument is silently ignored.
 *
 * @return list<array{id: int, slug: string, title: string, text: string, role: string, stack: string, status: string, url: string, image: int}>
 */
function frascella_projects(int $count = 0, string $lang = ''): array
{
    if ($lang === '') {
        $lang = function_exists('frascella_elementor_locale') ? frascella_elementor_locale() : '';
    }
    $posts = get_posts([
        'post_type' => FRASCELLA_PROJECT,
        'post_status' => 'publish',
        'numberposts' => -1,
        'orderby' => ['menu_order' => 'ASC', 'date' => 'DESC'],
        'lang' => '',
        'suppress_filters' => true,
    ]);
    $out = [];
    foreach ($posts as $post) {
        if ($lang !== '' && function_exists('pll_get_post_language') && (string) pll_get_post_language($post->ID) !== $lang) {
            continue;
        }
        $meta = static fn (string $key): string => trim((string) get_post_meta($post->ID, '_frascella_' . $key, true));
        $out[] = [
            'id' => (int) $post->ID,
            'slug' => (string) $post->post_name,
            'title' => (string) get_the_title($post),
            'text' => trim((string) $post->post_content),
            'role' => $meta('role'),
            'stack' => $meta('stack'),
            'status' => $meta('status'),
            'url' => $meta('url'),
            'image' => (int) get_post_thumbnail_id($post),
        ];
        if ($count > 0 && count($out) >= $count) {
            break;
        }
    }

    return $out;
}
