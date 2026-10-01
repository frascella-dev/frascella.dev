<?php

/**
 * The plugin's own tables, and bringing them up to date.
 *
 * Projects live in a table of their own, like the questions of Chiaro and the requests of
 * Agenda: one row per project per language, the languages of a project sharing a `tgroup`.
 * They used to be a post type (`frascella_project`); the 0.2.0 migration copies those posts
 * here, keeping their languages (Polylang) and their order, and deletes them.
 *
 * `frascella_schema_sql()` is the whole schema for dbDelta; changes dbDelta cannot make are
 * steps in `frascella_migrations()`, keyed by the version that introduces them.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

const FRASCELLA_DB_VERSION = '0.2.0';

function frascella_table(string $name): string
{
    global $wpdb;

    return $wpdb->prefix . 'frascella_' . $name;
}

/** @return list<string> */
function frascella_schema_sql(): array
{
    global $wpdb;
    $c = $wpdb->get_charset_collate();
    $t = frascella_table('projects');

    // dbDelta is picky: one column per line, two spaces after PRIMARY KEY, KEY not INDEX.
    return [
        "CREATE TABLE $t (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  tgroup char(22) NOT NULL,
  lang varchar(12) NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'draft',
  slug varchar(120) NOT NULL DEFAULT '',
  title varchar(200) NOT NULL,
  role varchar(120) NOT NULL DEFAULT '',
  body text NOT NULL,
  stack varchar(200) NOT NULL DEFAULT '',
  state varchar(120) NOT NULL DEFAULT '',
  url varchar(500) NOT NULL DEFAULT '',
  image_id bigint(20) unsigned NOT NULL DEFAULT 0,
  sort int(11) NOT NULL DEFAULT 0,
  legacy_ref varchar(64) DEFAULT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY tgroup_lang (tgroup,lang),
  UNIQUE KEY legacy_ref (legacy_ref),
  KEY lang_status_sort (lang,status,sort)
) $c;",
    ];
}

/** @return array<string, callable> version => step */
function frascella_migrations(): array
{
    return [
        '0.2.0' => 'frascella_migrate_project_posts',
    ];
}

/** Bring this site's tables to FRASCELLA_DB_VERSION (a short lock avoids double runs). */
function frascella_upgrade(): void
{
    $installed = (string) get_option('frascella_db_version', '');
    if ($installed === FRASCELLA_DB_VERSION || get_transient('frascella_upgrading')) {
        return;
    }
    set_transient('frascella_upgrading', 1, 5 * MINUTE_IN_SECONDS);
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta(frascella_schema_sql());
    foreach (frascella_migrations() as $version => $step) {
        if (version_compare($installed === '' ? '0' : $installed, (string) $version, '<') && version_compare((string) $version, FRASCELLA_DB_VERSION, '<=')) {
            $step();
        }
    }
    frascella_add_capabilities();
    update_option('frascella_db_version', FRASCELLA_DB_VERSION, false);
    delete_transient('frascella_upgrading');
}

add_action('plugins_loaded', 'frascella_upgrade', 5);

/**
 * 0.2.0: the projects that were posts (`frascella_project`) become rows. Each Polylang
 * translation group becomes a `tgroup`; the post's id is kept as `legacy_ref`, so a second
 * run finds the row and skips it. The posts and their fields are deleted afterwards — the
 * screenshots (attachments) stay, and the rows point to them.
 */
function frascella_migrate_project_posts(): void
{
    global $wpdb;
    // The post type is no longer registered: read the table, not WP_Query.
    $ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare("SELECT ID FROM {$wpdb->posts} WHERE post_type = %s ORDER BY menu_order, ID", 'frascella_project')));
    if ($ids === []) {
        return;
    }
    $groups = [];
    foreach ($ids as $id) {
        $lang = function_exists('pll_get_post_language') ? (string) pll_get_post_language($id) : '';
        $lang = $lang !== '' ? $lang : frascella_default_language();
        $translations = function_exists('pll_get_post_translations') ? array_map('intval', (array) pll_get_post_translations($id)) : [];
        $key = $translations !== [] ? min($translations) : $id;
        $groups[$key][$lang] = $id;
    }
    foreach ($groups as $members) {
        $tgroup = '';
        foreach ($members as $lang => $id) {
            $ref = 'post:' . $id;
            $found = $wpdb->get_row($wpdb->prepare('SELECT tgroup FROM ' . frascella_table('projects') . ' WHERE legacy_ref = %s', $ref), ARRAY_A); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- fixed table name.
            if ($found) {
                $tgroup = (string) $found['tgroup'];
                continue;
            }
            $post = get_post($id);
            $meta = static fn (string $k): string => trim((string) get_post_meta($id, '_frascella_' . $k, true));
            $saved = frascella_project_save([
                'lang' => (string) $lang,
                'status' => $post->post_status === 'publish' ? 'published' : 'draft',
                'slug' => (string) $post->post_name,
                'title' => (string) $post->post_title,
                'role' => $meta('role'),
                'body' => trim((string) $post->post_content),
                'stack' => $meta('stack'),
                'state' => $meta('status'),
                'url' => $meta('url'),
                'image_id' => (int) get_post_thumbnail_id($id),
                'sort' => (int) $post->menu_order,
                'legacy_ref' => $ref,
            ], $tgroup !== '' ? $tgroup : null);
            if (!is_wp_error($saved)) {
                $tgroup = (string) $saved['tgroup'];
            }
        }
    }
    foreach ($ids as $id) {
        wp_delete_post($id, true);
    }
}
