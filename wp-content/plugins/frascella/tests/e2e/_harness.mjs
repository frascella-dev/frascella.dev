/**
 * What every e2e test here shares: WP-CLI on the local site, a check that counts, the
 * login, the Elementor editor's preview, axe, and putting back what a test changed.
 *
 * The tests run against the local Docker site (bin/setup), never against production: they
 * write to the database and put it back, and a form they submit sends email — which on
 * this machine only ever reaches Mailpit (wp-content/mu-plugins/local-mail.php).
 *
 *   BASE=http://localhost:8110 WP_USER=admin WP_PASS=admin node tests/e2e/<test>.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname( fileURLToPath( import.meta.url ) );
export const ROOT = path.resolve( here, '../../../../..' );
export const BASE = process.env.BASE || 'http://localhost:8110';
const USER = process.env.WP_USER || 'admin';
const PASS = process.env.WP_PASS || 'admin';

/** PHP through WP-CLI, in the site's container; Docker's own chatter filtered out. */
export const php = ( code ) =>
	execFileSync( path.join( ROOT, 'bin/wp' ), [ 'eval', code ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ], cwd: ROOT } )
		.split( '\n' )
		.filter( ( l ) => l && ! /^\s*Container /.test( l ) )
		.join( '\n' )
		.trim();

/** A value handed to php() safely: base64 JSON, decoded on the other side. */
export const phpValue = ( value ) => `json_decode(base64_decode('${ Buffer.from( JSON.stringify( value ) ).toString( 'base64' ) }'), true)`;

let failures = 0;
export const check = ( name, ok, detail = '' ) => {
	console.log( `${ ok ? '✓' : '✗' } ${ name }${ detail ? ' — ' + detail : '' }` );
	if ( ! ok ) {
		failures++;
	}
};
export const finish = () => {
	console.log( failures ? `\n${ failures } failed` : '\nall passed' );
	process.exit( failures ? 1 : 0 );
};

export const text = ( url ) => fetch( BASE + url ).then( ( r ) => r.text() );

/** The front page's id, and its English translation's. */
export const homes = () => {
	const it = Number( php( "echo (int) get_option('page_on_front');" ) );
	const en = Number( php( `echo function_exists('pll_get_post') ? (int) pll_get_post(${ it }, 'en') : 0;` ) );
	return { it, en };
};

/**
 * A document's Elementor layout, saved so it can be put back: every test that edits a page
 * does it inside try { … } finally { restore() }.
 */
export const snapshot = ( id ) => {
	const saved = php( `echo base64_encode((string) get_post_meta(${ id }, '_elementor_data', true));` );
	return () => php( `update_post_meta(${ id }, '_elementor_data', wp_slash(base64_decode('${ saved }'))); \\Elementor\\Plugin::$instance->files_manager->clear_cache();` );
};

/** Merge settings into every widget of a type in a document. */
export const setWidget = ( id, widgetType, settings ) => php( `$d = json_decode(get_post_meta(${ id }, '_elementor_data', true), true);
$walk = function (array &$els) use (&$walk) { foreach ($els as &$e) { if (($e['widgetType'] ?? '') === '${ widgetType }') { $e['settings'] = array_merge($e['settings'] ?? [], ${ phpValue( settings ) }); } if (!empty($e['elements'])) { $walk($e['elements']); } } };
$walk($d); update_post_meta(${ id }, '_elementor_data', wp_slash(wp_json_encode($d))); \\Elementor\\Plugin::$instance->files_manager->clear_cache(); echo 'ok';` );

/** A logged-in page. Leaving the editor with an unsaved change asks first: yes, nothing is saved. */
export async function login( browser, viewport = { width: 1600, height: 1000 } ) {
	const page = await ( await browser.newContext( { viewport } ) ).newPage();
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', USER );
	await page.fill( '#user_pass', PASS );
	await page.click( '#wp-submit' );
	await page.waitForURL( /wp-admin/ );
	page.on( 'dialog', ( d ) => d.accept() );
	return page;
}

/** Open a document in Elementor and return its preview frame, once it has drawn. */
export async function openEditor( page, id ) {
	await page.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=elementor`, { waitUntil: 'domcontentloaded' } );
	await page.waitForFunction( () => window.elementor?.getPreviewContainer?.()?.children?.length, null, { timeout: 90000 } );
	await page.waitForTimeout( 1500 );
	return page.frames().find( ( f ) => f.url().includes( 'elementor-preview' ) );
}

/** axe on a page: WCAG 2.1 AA and best practice; serious and critical violations fail. */
const AXE = readFileSync( path.resolve( here, '../../node_modules/axe-core/axe.min.js' ), 'utf8' );
export async function audit( page, name ) {
	await page.addScriptTag( { content: AXE } );
	const result = await page.evaluate( async () => window.axe.run( document, { runOnly: [ 'wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice' ] } ) );
	const bad = result.violations.filter( ( v ) => [ 'serious', 'critical' ].includes( v.impact ) );
	check( `a11y: ${ name }`, bad.length === 0, bad.map( ( v ) => `${ v.id }: ${ v.nodes[ 0 ].target.join( ' ' ) }` ).join( ' | ' ) );
}
