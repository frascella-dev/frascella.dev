/**
 * Portfolio, the dashboard: the projects, end to end.
 *
 * - The API refuses a visitor; an editor has the projects.
 * - The list shows every project with its languages, in the home page's order; the arrows
 *   change that order, and the home page follows.
 * - The editor: a word changed in one language shows on that language's page only; a
 *   refused address says why under its field; a new project starts as a draft, off the
 *   home page, and can be deleted in every language.
 * - There is one way in: no menu of the old post type, and no settings (0.3.0 dropped them).
 * - axe on the app, on every screen.
 *
 * Everything it changes is put back (the projects through the API, the user deleted).
 *
 *   npm run test:admin
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BASE, check, finish, launch, login, php, phpValue, text } from './_harness.mjs';

const AXE = readFileSync( path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../node_modules/axe-core/axe.min.js' ), 'utf8' );
async function auditApp( page, name ) {
	await page.addScriptTag( { content: AXE } );
	const result = await page.evaluate( async () => window.axe.run( { include: [ '#frascella-app' ] }, { runOnly: [ 'wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice' ] } ) );
	const bad = result.violations.filter( ( v ) => [ 'serious', 'critical' ].includes( v.impact ) );
	check( `a11y: ${ name }`, bad.length === 0, bad.map( ( v ) => `${ v.id }: ${ v.nodes[ 0 ].target.join( ' ' ) }` ).join( ' | ' ) );
}

const table = php( 'global $wpdb; echo $wpdb->prefix . "frascella_projects";' );
const saved = php( `global $wpdb; echo base64_encode(wp_json_encode($wpdb->get_results("SELECT id, role, sort FROM ${ table }", ARRAY_A)));` );
const restore = () => php( `global $wpdb; foreach (json_decode(base64_decode('${ saved }'), true) as $r) { $wpdb->update('${ table }', ['role' => $r['role'], 'sort' => (int) $r['sort']], ['id' => (int) $r['id']]); } $wpdb->query("DELETE FROM ${ table } WHERE title = 'Progetto di prova'"); echo 'ok';` );
const editorLogin = `e2e-editor-${ Date.now() }`;
const editorPass = php( 'echo wp_generate_password(24, false);' );

// The API, without a session.
const anonymous = await fetch( `${ BASE }/wp-json/frascella/v1/admin/projects` );
check( 'API: a visitor is refused', anonymous.status === 401 || anonymous.status === 403, String( anonymous.status ) );

const browser = await launch();
try {
	const page = await login( browser, { width: 1440, height: 900 } );

	// One way in.
	await page.goto( `${ BASE }/wp-admin/`, { waitUntil: 'load' } );
	const menu = await page.evaluate( () => ( {
		portfolio: !! document.querySelector( '#adminmenu a[href="admin.php?page=frascella"]' ),
		cpt: !! document.querySelector( '#adminmenu a[href*="post_type=frascella_project"]' ),
		oldSettings: !! document.querySelector( '#adminmenu a[href="options-general.php?page=frascella"], #adminmenu a[href="admin.php?page=frascella-settings"]' ),
	} ) );
	check( 'menu: Portfolio, and neither the old post type nor any settings page', menu.portfolio && ! menu.cpt && ! menu.oldSettings, JSON.stringify( menu ) );
	check( 'upgrade: the settings’ option and capability are gone', php( "echo (get_option('frascella_facts') === false && !get_role('administrator')->has_cap('frascella_manage')) ? 'ok' : 'no';" ) === 'ok' );

	// The list.
	await page.goto( `${ BASE }/wp-admin/admin.php?page=frascella`, { waitUntil: 'load' } );
	await page.waitForSelector( '.frascella-table--projects tbody tr' );
	const rows = await page.$$eval( '.frascella-table--projects tbody tr', ( trs ) => trs.map( ( tr ) => ( {
		title: tr.querySelector( '.frascella-table__primary' ).textContent.trim(),
		langs: [ ...tr.querySelectorAll( '.frascella-lang.is-published' ) ].map( ( l ) => l.firstChild.textContent.trim() ).join( ',' ),
	} ) ) );
	check( 'list: every project, in the home page’s order, published in both languages', rows.map( ( r ) => r.title ).join( '|' ) === 'seveninktattoo.it|skeda.fit|vitrine' && rows.every( ( r ) => r.langs === 'IT,EN' ), JSON.stringify( rows ) );
	await auditApp( page, 'Projects, the list' );

	// The order: the first project one place down, and the home page follows.
	await page.click( 'button[aria-label*="seveninktattoo.it"][aria-label*="giù"], button[aria-label*="seveninktattoo.it"][aria-label*="down"]' );
	await page.waitForTimeout( 1200 );
	const order = [ ...( await text( '/' ) ).matchAll( /id="project-([a-z0-9-]+)"/g ) ].map( ( m ) => m[ 1 ] ).join( ' ' );
	check( 'order: the arrows move a project, and the home page follows', order === 'skeda-fit seveninktattoo-it vitrine', order );

	// The editor: one language only.
	const tgroup = php( `global $wpdb; echo $wpdb->get_var("SELECT tgroup FROM ${ table } WHERE slug = 'vitrine' LIMIT 1");` );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=frascella&project=${ tgroup }&lang=en`, { waitUntil: 'load' } );
	const role = page.getByLabel( /^(Ruolo|Role)$/ );
	await role.waitFor();
	await auditApp( page, 'Projects, the editor' );
	await role.fill( 'e2e role' );
	await page.getByRole( 'button', { name: /^(Salva|Save)$/ } ).click();
	await page.waitForSelector( '.frascella-notice' );
	check( 'editor: a word changed in English shows on the English page only', ( await text( '/en/' ) ).includes( 'e2e role' ) && ! ( await text( '/' ) ).includes( 'e2e role' ) );

	// A refused address.
	await page.getByLabel( /^(Indirizzo|Address)$/ ).fill( 'http://example.com' );
	await page.getByRole( 'button', { name: /^(Salva|Save)$/ } ).click();
	await page.waitForSelector( '.has-error .components-base-control__help' );
	const why = await page.textContent( '.has-error .components-base-control__help' );
	check( 'editor: a refused address says why, under its field', /https:\/\//.test( why ), why );

	// A new project: a draft, off the home page, then deleted in every language.
	await page.goto( `${ BASE }/wp-admin/admin.php?page=frascella&new=1`, { waitUntil: 'load' } );
	await page.getByLabel( /^(Nome|Name)$/ ).fill( 'Progetto di prova' );
	await page.getByRole( 'button', { name: /^(Salva come bozza|Save as draft)$/ } ).click();
	await page.waitForURL( /project=/ );
	const created = php( `global $wpdb; echo $wpdb->get_var("SELECT status FROM ${ table } WHERE title = 'Progetto di prova'");` );
	check( 'new: saved as a draft, and not on the home page', created === 'draft' && ! ( await text( '/' ) ).includes( 'Progetto di prova' ), created );
	// The confirmation is accepted by the harness's login() (it accepts every dialog).
	await page.getByRole( 'button', { name: /^(Elimina in tutte le lingue|Delete in every language)$/ } ).click();
	await page.waitForSelector( '.frascella-table--projects' );
	check( 'new: deleted', php( `global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM ${ table } WHERE title = 'Progetto di prova'");` ) === '0' );

	// An editor: the projects.
	php( `wp_insert_user(['user_login' => ${ phpValue( editorLogin ) }, 'user_pass' => ${ phpValue( editorPass ) }, 'user_email' => ${ phpValue( editorLogin + '@example.com' ) }, 'role' => 'editor']); echo 'ok';` );
	const ed = await ( await browser.newContext() ).newPage();
	await ed.goto( `${ BASE }/wp-login.php` );
	await ed.fill( '#user_login', editorLogin );
	await ed.fill( '#user_pass', editorPass );
	await ed.click( '#wp-submit' );
	await ed.waitForURL( /wp-admin/ );
	await ed.goto( `${ BASE }/wp-admin/admin.php?page=frascella`, { waitUntil: 'load' } );
	await ed.waitForSelector( '.frascella-table--projects' );
	const tabs = await ed.$$eval( '.frascella-tab', ( t ) => t.length );
	check( 'editor role: the projects, and one view, so no tabs', tabs === 0, `${ tabs } tab(s)` );
} finally {
	await browser.close();
	restore();
	php( `$u = get_user_by('login', ${ phpValue( editorLogin ) }); if ($u) { require_once ABSPATH . 'wp-admin/includes/user.php'; wp_delete_user($u->ID); } echo 'ok';` );
}
check( 'restored', ! ( await text( '/en/' ) ).includes( 'e2e role' ) && [ ...( await text( '/' ) ).matchAll( /id="project-([a-z0-9-]+)"/g ) ].map( ( m ) => m[ 1 ] ).join( ' ' ) === 'seveninktattoo-it skeda-fit vitrine' );
finish();
