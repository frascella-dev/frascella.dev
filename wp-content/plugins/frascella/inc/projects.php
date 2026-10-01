<?php

/**
 * Projects: the work the home page shows, one card each (the «Works» widget).
 *
 * One row is one project in one language (inc/schema.php); its languages share a `tgroup`,
 * and share what is the same in every language — the address, the screenshot, the place in
 * the order. Each language has its own name, role, text, stack, state and its own status:
 * a project shows on a language's page once that language is published.
 *
 * Edited in Portfolio → Projects (inc/admin-app.php, the API in inc/rest-admin.php).
 * Not public: a project has no page of its own, so no address and no sitemap entry.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** The fields one language of a project has: name => max length (0 = text). */
const FRASCELLA_PROJECT_TEXT = ['title' => 200, 'role' => 120, 'body' => 0, 'stack' => 200, 'state' => 120];

/** The fields every language shares. */
const FRASCELLA_PROJECT_SHARED = ['slug', 'url', 'image_id', 'sort'];

/* Languages ---------------------------------------------------------------------------------- */

/** The site's languages (Polylang's), the default first. @return list<string> */
function frascella_languages(): array
{
    $list = function_exists('pll_languages_list') ? array_values(array_map('strval', (array) pll_languages_list(['fields' => 'slug']))) : [];
    if ($list === []) {
        $list = [substr((string) get_locale(), 0, 2) ?: 'it'];
    }
    $main = frascella_default_language();
    if (in_array($main, $list, true)) {
        $list = array_values(array_unique([$main, ...$list]));
    }

    return $list;
}

function frascella_default_language(): string
{
    $lang = function_exists('pll_default_language') ? (string) pll_default_language('slug') : '';

    return $lang !== '' ? $lang : (substr((string) get_locale(), 0, 2) ?: 'it');
}

/** 22 random URL-safe characters: a project's `tgroup`. */
function frascella_uid(): string
{
    return rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');
}

/* Reading ------------------------------------------------------------------------------------ */

/**
 * The published projects in a language (this request's by default), in their order, in the
 * shape the theme's template part reads.
 *
 * @return list<array{id: int, slug: string, title: string, text: string, role: string, stack: string, status: string, url: string, image: int}>
 */
function frascella_projects(int $count = 0, string $lang = ''): array
{
    global $wpdb;
    if ($lang === '') {
        $lang = function_exists('frascella_elementor_locale') ? frascella_elementor_locale() : '';
    }
    $lang = $lang !== '' ? $lang : frascella_default_language();
    $t = frascella_table('projects');
    $sql = $wpdb->prepare("SELECT * FROM $t WHERE lang = %s AND status = 'published' ORDER BY sort, id", $lang); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- fixed table name.
    $rows = (array) $wpdb->get_results($count > 0 ? $sql . $wpdb->prepare(' LIMIT %d', $count) : $sql, ARRAY_A); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- prepared above.

    return array_map(static fn (array $r): array => [
        'id' => (int) $r['id'],
        'slug' => (string) $r['slug'],
        'title' => (string) $r['title'],
        'text' => (string) $r['body'],
        'role' => (string) $r['role'],
        'stack' => (string) $r['stack'],
        'status' => (string) $r['state'],
        'url' => (string) $r['url'],
        'image' => (int) $r['image_id'],
    ], $rows);
}

/** Every language of a project, by language. @return array<string, array<string, mixed>> */
function frascella_project_languages(string $tgroup): array
{
    global $wpdb;
    $t = frascella_table('projects');
    $out = [];
    foreach ((array) $wpdb->get_results($wpdb->prepare("SELECT * FROM $t WHERE tgroup = %s", $tgroup), ARRAY_A) as $row) { // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- fixed table name.
        $out[(string) $row['lang']] = frascella_project_row($row);
    }

    return $out;
}

/** A row as the API gives it. @return array<string, mixed> */
function frascella_project_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'tgroup' => (string) $row['tgroup'],
        'lang' => (string) $row['lang'],
        'status' => (string) $row['status'],
        'slug' => (string) $row['slug'],
        'title' => (string) $row['title'],
        'role' => (string) $row['role'],
        'body' => (string) $row['body'],
        'stack' => (string) $row['stack'],
        'state' => (string) $row['state'],
        'url' => (string) $row['url'],
        'image_id' => (int) $row['image_id'],
        'sort' => (int) $row['sort'],
        'updated_at' => strtotime((string) $row['updated_at'] . ' UTC') ?: 0,
    ];
}

/* Writing ------------------------------------------------------------------------------------ */

/**
 * Clean what was sent, by field. An address that is not https is refused, not "fixed"; a
 * screenshot must be an image in the media library.
 *
 * @return array<string, mixed>|WP_Error
 */
function frascella_project_clean(array $in, bool $partial = false): array|WP_Error
{
    $out = [];
    $errors = [];
    foreach (FRASCELLA_PROJECT_TEXT as $key => $max) {
        if (!array_key_exists($key, $in)) {
            continue;
        }
        $value = $key === 'body' ? sanitize_textarea_field((string) $in[$key]) : sanitize_text_field((string) $in[$key]);
        $out[$key] = $max > 0 ? mb_substr($value, 0, $max) : $value;
    }
    if (!$partial && trim((string) ($out['title'] ?? '')) === '') {
        $errors['title'] = __('A project needs a name.', 'frascella');
    }
    if ($partial && array_key_exists('title', $out) && trim((string) $out['title']) === '') {
        $errors['title'] = __('A project needs a name.', 'frascella');
    }
    if (array_key_exists('status', $in)) {
        $out['status'] = $in['status'] === 'published' ? 'published' : 'draft';
    }
    if (array_key_exists('url', $in)) {
        $url = trim((string) $in['url']);
        if ($url !== '' && !str_starts_with($url, 'https://')) {
            $errors['url'] = __('The address must start with https://, or stay empty.', 'frascella');
        }
        $out['url'] = $url === '' ? '' : esc_url_raw($url, ['https']);
    }
    if (array_key_exists('image_id', $in)) {
        $image = (int) $in['image_id'];
        if ($image > 0 && !wp_attachment_is_image($image)) {
            $errors['image_id'] = __('The screenshot must be an image from the media library.', 'frascella');
        }
        $out['image_id'] = max(0, $image);
    }
    if (array_key_exists('slug', $in)) {
        $out['slug'] = sanitize_title((string) $in['slug']);
    }
    if (array_key_exists('sort', $in)) {
        $out['sort'] = (int) $in['sort'];
    }
    if (array_key_exists('legacy_ref', $in)) {
        $out['legacy_ref'] = (string) $in['legacy_ref'];
    }

    return $errors !== [] ? new WP_Error('frascella_invalid', __('Check the highlighted fields.', 'frascella'), ['status' => 400, 'errors' => $errors]) : $out;
}

/**
 * Store a project in one language. With `$tgroup` it is another language of that project
 * and takes its shared fields; without, a new project at the end of the order.
 *
 * @return array<string, mixed>|WP_Error the row
 */
function frascella_project_save(array $in, ?string $tgroup = null): array|WP_Error
{
    global $wpdb;
    $t = frascella_table('projects');
    $lang = (string) ($in['lang'] ?? '');
    if (!in_array($lang, frascella_languages(), true)) {
        return new WP_Error('frascella_lang', __('Unknown language.', 'frascella'), ['status' => 400]);
    }
    $clean = frascella_project_clean($in);
    if (is_wp_error($clean)) {
        return $clean;
    }
    // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- fixed table name; values prepared.
    if ($tgroup !== null) {
        $sibling = $wpdb->get_row($wpdb->prepare("SELECT slug, url, image_id, sort FROM $t WHERE tgroup = %s LIMIT 1", $tgroup), ARRAY_A);
        if (!$sibling) {
            return new WP_Error('frascella_not_found', __('That project does not exist.', 'frascella'), ['status' => 404]);
        }
        if ($wpdb->get_var($wpdb->prepare("SELECT id FROM $t WHERE tgroup = %s AND lang = %s", $tgroup, $lang))) {
            return new WP_Error('frascella_exists', __('This language of the project exists already.', 'frascella'), ['status' => 409]);
        }
        // What every language shares comes from the project, unless this call sets it.
        foreach (FRASCELLA_PROJECT_SHARED as $key) {
            $clean[$key] ??= $sibling[$key];
        }
    } else {
        $clean['sort'] ??= (int) $wpdb->get_var("SELECT COALESCE(MAX(sort), 0) + 1 FROM $t");
        $clean['slug'] = ($clean['slug'] ?? '') !== '' ? $clean['slug'] : sanitize_title((string) $clean['title']);
    }
    // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $now = current_time('mysql', true);
    $row = array_merge(['role' => '', 'body' => '', 'stack' => '', 'state' => '', 'url' => '', 'image_id' => 0, 'slug' => '', 'sort' => 0, 'status' => 'draft'], $clean, [
        'tgroup' => $tgroup ?? frascella_uid(),
        'lang' => $lang,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    if ($wpdb->insert($t, $row) === false) {
        return new WP_Error('frascella_db', __('The project could not be saved.', 'frascella'), ['status' => 500]);
    }

    return frascella_project_get((int) $wpdb->insert_id);
}

/** @return array<string, mixed>|WP_Error */
function frascella_project_get(int $id): array|WP_Error
{
    global $wpdb;
    $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . frascella_table('projects') . ' WHERE id = %d', $id), ARRAY_A); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- fixed table name.

    return $row ? frascella_project_row($row) : new WP_Error('frascella_not_found', __('That project does not exist.', 'frascella'), ['status' => 404]);
}

/**
 * Change one language of a project. The shared fields, when sent, change in every language.
 *
 * @return array<string, mixed>|WP_Error the row
 */
function frascella_project_update(int $id, array $in): array|WP_Error
{
    global $wpdb;
    $current = frascella_project_get($id);
    if (is_wp_error($current)) {
        return $current;
    }
    $clean = frascella_project_clean($in, true);
    if (is_wp_error($clean)) {
        return $clean;
    }
    unset($clean['legacy_ref']);
    $t = frascella_table('projects');
    $now = current_time('mysql', true);
    $shared = array_intersect_key($clean, array_flip(FRASCELLA_PROJECT_SHARED));
    $own = array_diff_key($clean, $shared);
    if ($shared !== []) {
        $wpdb->update($t, $shared + ['updated_at' => $now], ['tgroup' => $current['tgroup']]);
    }
    if ($own !== []) {
        $wpdb->update($t, $own + ['updated_at' => $now], ['id' => $id]);
    }

    return frascella_project_get($id);
}

/** Delete one language of a project, or (`$all`) every language. */
function frascella_project_delete(int $id, bool $all = false): bool
{
    global $wpdb;
    $current = frascella_project_get($id);
    if (is_wp_error($current)) {
        return false;
    }

    return $all
        ? $wpdb->delete(frascella_table('projects'), ['tgroup' => $current['tgroup']]) !== false
        : $wpdb->delete(frascella_table('projects'), ['id' => $id]) !== false;
}

/**
 * The order of the projects, as a list of `tgroup`s: every language follows. Only the rows
 * whose place changed are written.
 *
 * @param list<string> $tgroups
 */
function frascella_projects_reorder(array $tgroups): void
{
    global $wpdb;
    $t = frascella_table('projects');
    $current = [];
    foreach ((array) $wpdb->get_results("SELECT tgroup, MIN(sort) sort FROM $t GROUP BY tgroup", ARRAY_A) as $row) { // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- fixed table name, no input.
        $current[(string) $row['tgroup']] = (int) $row['sort'];
    }
    foreach (array_values($tgroups) as $i => $tgroup) {
        if (isset($current[$tgroup]) && $current[$tgroup] !== $i + 1) {
            $wpdb->update($t, ['sort' => $i + 1], ['tgroup' => $tgroup]);
        }
    }
}
