<?php

/**
 * The API behind the dashboard: `/wp-json/frascella/v1/admin/…`.
 *
 *   GET     projects                 every project, one entry per project with its languages; ?status= &q=
 *   POST    projects                 {lang, title, role, body, stack, state, url, image_id, status, translation_of?}
 *   POST    projects/order           {tgroups: [...]}: every language follows
 *   GET     projects/{tgroup}        a project in every language
 *   PATCH   projects/{id}            one language (the shared fields change in every language)
 *   DELETE  projects/{id}            one language (?all=1: every language)
 *   GET     settings · POST settings the business's facts
 *
 * Every route checks a capability (inc/capabilities.php); `wp.apiFetch` adds the REST nonce.
 * The list is small (a portfolio), so it is answered whole rather than paged.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

add_action('rest_api_init', static function (): void {
    $ns = 'frascella/v1';
    $edit = static fn (): bool => current_user_can('frascella_edit');
    $manage = static fn (): bool => current_user_can('frascella_manage');
    register_rest_route($ns, '/admin/projects', [
        ['methods' => 'GET', 'callback' => 'frascella_admin_projects', 'permission_callback' => $edit],
        ['methods' => 'POST', 'callback' => 'frascella_admin_project_create', 'permission_callback' => $edit],
    ]);
    register_rest_route($ns, '/admin/projects/order', ['methods' => 'POST', 'callback' => static function (WP_REST_Request $r): WP_REST_Response {
        frascella_projects_reorder(array_values(array_map('strval', (array) $r->get_param('tgroups'))));

        return frascella_admin_projects(new WP_REST_Request('GET'));
    }, 'permission_callback' => $edit]);
    register_rest_route($ns, '/admin/projects/(?P<tgroup>[A-Za-z0-9_-]{22})', ['methods' => 'GET', 'callback' => 'frascella_admin_project_get', 'permission_callback' => $edit]);
    register_rest_route($ns, '/admin/projects/(?P<id>\d+)', [
        ['methods' => 'PATCH', 'callback' => 'frascella_admin_project_patch', 'permission_callback' => $edit],
        ['methods' => 'DELETE', 'callback' => static function (WP_REST_Request $r): WP_REST_Response {
            return frascella_project_delete((int) $r['id'], (bool) $r->get_param('all'))
                ? new WP_REST_Response(['deleted' => true])
                : frascella_rest_error(__('That project does not exist.', 'frascella'), 404);
        }, 'permission_callback' => $edit],
    ]);
    register_rest_route($ns, '/admin/settings', [
        ['methods' => 'GET', 'callback' => 'frascella_admin_settings', 'permission_callback' => $manage],
        ['methods' => 'POST', 'callback' => static function (WP_REST_Request $r): WP_REST_Response {
            update_option(FRASCELLA_OPTION_FACTS, frascella_sanitize_facts((array) $r->get_json_params()));

            return frascella_admin_settings();
        }, 'permission_callback' => $manage],
    ]);
});

function frascella_rest_error(string $message, int $status = 400, array $errors = []): WP_REST_Response
{
    return new WP_REST_Response(['message' => $message, 'errors' => $errors], $status);
}

/** A WP_Error as the dashboard reads it: a sentence, and the fields it is about. */
function frascella_rest_from_error(WP_Error $error): WP_REST_Response
{
    $data = (array) $error->get_error_data();

    return frascella_rest_error($error->get_error_message(), (int) ($data['status'] ?? 400), (array) ($data['errors'] ?? []));
}

/** The screenshot as the dashboard shows it. @return array{id: int, url: string, alt: string}|null */
function frascella_admin_image(int $id): ?array
{
    $src = $id > 0 ? wp_get_attachment_image_src($id, 'medium') : false;

    return is_array($src) ? ['id' => $id, 'url' => (string) $src[0], 'alt' => (string) get_post_meta($id, '_wp_attachment_image_alt', true)] : null;
}

function frascella_admin_projects(WP_REST_Request $r): WP_REST_Response
{
    global $wpdb;
    $t = frascella_table('projects');
    $main = frascella_default_language();
    $rows = (array) $wpdb->get_results("SELECT * FROM $t ORDER BY sort, id", ARRAY_A); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- fixed table name, no input.
    $projects = [];
    foreach ($rows as $row) {
        $p = &$projects[(string) $row['tgroup']];
        $p['languages'][(string) $row['lang']] = ['id' => (int) $row['id'], 'status' => (string) $row['status'], 'title' => (string) $row['title']];
        $p['rows'][(string) $row['lang']] = $row;
        unset($p);
    }
    $status = (string) $r->get_param('status');
    $q = mb_strtolower(trim((string) $r->get_param('q')));
    $items = [];
    $counts = ['published' => 0, 'draft' => 0];
    foreach ($projects as $tgroup => $p) {
        // The project as the default language has it, or its first language.
        $row = $p['rows'][$main] ?? reset($p['rows']);
        $counts[(string) $row['status']] = ($counts[(string) $row['status']] ?? 0) + 1;
        if ($status !== '' && $row['status'] !== $status) {
            continue;
        }
        if ($q !== '' && !str_contains(mb_strtolower($row['title'] . ' ' . $row['role'] . ' ' . $row['stack']), $q)) {
            continue;
        }
        $items[] = [
            'tgroup' => (string) $tgroup,
            'title' => (string) $row['title'],
            'role' => (string) $row['role'],
            'state' => (string) $row['state'],
            'status' => (string) $row['status'],
            'url' => (string) $row['url'],
            'image' => frascella_admin_image((int) $row['image_id']),
            'languages' => $p['languages'],
            'updated_at' => strtotime((string) $row['updated_at'] . ' UTC') ?: 0,
        ];
    }

    return new WP_REST_Response(['items' => $items, 'counts' => $counts, 'total' => count($projects)]);
}

function frascella_admin_project_get(WP_REST_Request $r): WP_REST_Response
{
    $languages = frascella_project_languages((string) $r['tgroup']);
    if ($languages === []) {
        return frascella_rest_error(__('That project does not exist.', 'frascella'), 404);
    }
    $any = reset($languages);

    return new WP_REST_Response(['tgroup' => (string) $r['tgroup'], 'languages' => $languages, 'image' => frascella_admin_image((int) $any['image_id'])]);
}

function frascella_admin_project_create(WP_REST_Request $r): WP_REST_Response
{
    $in = (array) $r->get_json_params();
    $of = (string) ($in['translation_of'] ?? '');
    $saved = frascella_project_save($in, $of !== '' ? $of : null);

    return is_wp_error($saved) ? frascella_rest_from_error($saved) : new WP_REST_Response($saved, 201);
}

function frascella_admin_project_patch(WP_REST_Request $r): WP_REST_Response
{
    $in = array_intersect_key((array) $r->get_json_params(), array_flip([...array_keys(FRASCELLA_PROJECT_TEXT), ...FRASCELLA_PROJECT_SHARED, 'status']));
    $saved = frascella_project_update((int) $r['id'], $in);

    return is_wp_error($saved) ? frascella_rest_from_error($saved) : new WP_REST_Response($saved);
}

function frascella_admin_settings(): WP_REST_Response
{
    $fields = [];
    foreach (frascella_fact_fields() as $key => $label) {
        $fields[] = [
            'key' => $key,
            'label' => $label,
            'type' => $key === 'email' ? 'email' : (in_array($key, FRASCELLA_FACT_URLS, true) ? 'url' : 'text'),
        ];
    }

    return new WP_REST_Response(['settings' => frascella_facts(), 'fields' => $fields]);
}
