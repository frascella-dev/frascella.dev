/**
 * Theme Builder documents, one per language (Elementor Pro + Polylang).
 *
 * A footer built in the Theme Builder, copied for English with `wp frascella translate-template`:
 * the Italian pages get the Italian copy, the English pages the English one, and a word
 * changed in the English copy shows only under /en/. Everything it creates is deleted.
 *
 * Without Elementor Pro there is no Theme Builder: the test says so and passes.
 *
 *   npm run test:languages
 */
import { check, finish, php, text } from './_harness.mjs';

if ( php( "echo defined('ELEMENTOR_PRO_VERSION') ? 'pro' : 'free';" ) !== 'pro' ) {
	console.log( '· Elementor Pro is not active: no Theme Builder to test. (ELEMENTOR_PRO_ZIP=… bin/setup installs it.)' );
	finish();
}

const created = [];
try {
	// A footer document on the front page, holding one Heading. On the front page only, so
	// that it wins over the site's own footer (shown everywhere): Elementor Pro serves the
	// document with the more specific condition.
	const footer = Number( php( `$id = wp_insert_post(['post_type' => 'elementor_library', 'post_status' => 'publish', 'post_title' => 'Test footer']);
update_post_meta($id, '_elementor_edit_mode', 'builder');
update_post_meta($id, '_elementor_template_type', 'footer');
wp_set_object_terms($id, 'footer', 'elementor_library_type');
update_post_meta($id, '_elementor_data', wp_slash(wp_json_encode([['id' => 'f00ter1', 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => ['title' => 'Piede italiano'], 'elements' => []]])));
update_post_meta($id, '_elementor_conditions', ['include/singular/front_page']);
$conditions = (array) get_option('elementor_pro_theme_builder_conditions', []);
$conditions['footer'][$id] = ['include/singular/front_page'];
update_option('elementor_pro_theme_builder_conditions', $conditions);
echo $id;` ) );
	created.push( footer );
	const copy = Number( php( `$c = frascella_translate_template(${ footer }, 'en'); echo is_wp_error($c) ? 0 : $c;` ) );
	created.push( copy );
	php( `$d = json_decode(get_post_meta(${ copy }, '_elementor_data', true), true); $d[0]['settings']['title'] = 'English footer'; update_post_meta(${ copy }, '_elementor_data', wp_slash(wp_json_encode($d))); \\Elementor\\Plugin::$instance->files_manager->clear_cache();` );

	check( 'the copy knows its language and its original', php( `echo get_post_meta(${ copy }, '_frascella_lang', true) . '/' . get_post_meta(${ copy }, '_frascella_translation_of', true);` ) === `en/${ footer }` );
	const itPage = await text( '/' );
	const enPage = await text( '/en/' );
	check( 'the Italian pages show the Italian footer', itPage.includes( 'Piede italiano' ) && ! itPage.includes( 'English footer' ) );
	check( 'the English pages show the English copy', enPage.includes( 'English footer' ) && ! enPage.includes( 'Piede italiano' ) );
} finally {
	for ( const id of created.filter( Boolean ) ) {
		php( `wp_delete_post(${ id }, true);` );
	}
	php( `$c = (array) get_option('elementor_pro_theme_builder_conditions', []); foreach (${ JSON.stringify( created ) } as $id) { unset($c['footer'][$id]); } update_option('elementor_pro_theme_builder_conditions', $c); \\Elementor\\Plugin::$instance->files_manager->clear_cache();` );
}
check( 'cleaned up', ! ( await text( '/' ) ).includes( 'Piede italiano' ) );
finish();
