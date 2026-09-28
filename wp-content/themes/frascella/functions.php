<?php

/**
 * The theme: the look, and nothing else.
 *
 * Content lives in the frascella.dev plugin, so that changing theme never takes the site's
 * content with it. This file holds no logic of its own on purpose: it is the list of
 * what the theme does, one file per job, in dependency order.
 *
 * Every call into the plugin is guarded (`function_exists`): with the plugin deactivated
 * the theme still renders, with its defaults.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

define('FRASCELLA_THEME_VERSION', wp_get_theme()->get('Version') ?: '0.0.0');
define('FRASCELLA_THEME_DIR', get_template_directory());
define('FRASCELLA_THEME_URI', get_template_directory_uri());

require FRASCELLA_THEME_DIR . '/inc/tokens.php';    // tokens.json: the palette and the type, once
require FRASCELLA_THEME_DIR . '/inc/setup.php';     // supports, menus, the email look for other plugins
require FRASCELLA_THEME_DIR . '/inc/content.php';   // every word the theme says, per language
require FRASCELLA_THEME_DIR . '/inc/assets.php';    // the Vite manifest, one bundle per kind of page
require FRASCELLA_THEME_DIR . '/inc/head.php';      // title, description, canonical, hreflang, noindex, boot script
require FRASCELLA_THEME_DIR . '/inc/schema.php';    // structured data, only what the page shows
require FRASCELLA_THEME_DIR . '/inc/sitemap.php';   // WordPress's sitemap, told what is not a document
require FRASCELLA_THEME_DIR . '/inc/cleanup.php';   // what WordPress prints and this site does not
require FRASCELLA_THEME_DIR . '/inc/template.php';  // the helpers the templates call
