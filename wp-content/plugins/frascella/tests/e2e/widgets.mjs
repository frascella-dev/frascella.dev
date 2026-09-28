/**
 * The plugin's widgets, end to end: a sentence typed into a field is what the page says,
 * in that page's language only; {name} becomes the business's name; an empty field says
 * the site's own words; markup a field does not allow is dropped. Then the editor: the
 * Texts section starts from the page's own words, in its language.
 *
 * Everything it changes is put back.
 *
 *   npm run test:widgets
 */
import { chromium } from 'playwright';
import { check, finish, homes, login, openEditor, php, setWidget, snapshot, text } from './_harness.mjs';

const { it, en } = homes();
const name = php( 'echo frascella_facts()["name"];' );
const restore = snapshot( it );

try {
	setWidget( it, 'frascella-contact', { t__contact__heading: 'Parla con {name}', t__contact__call: 'Telefonaci' } );
	const page = await text( '/' );
	check( 'a typed heading, placeholder filled', page.includes( `Parla con ${ name }` ) );
	check( 'a typed button', />\s*Telefonaci\s*</.test( page ) );
	check( 'the other language keeps its own words', ! ( await text( '/en/' ) ).includes( 'Parla con' ) );

	setWidget( it, 'frascella-contact', { t__contact__heading: '' } );
	check( 'an empty field says the site’s words', ( await text( '/' ) ).includes( `Scrivi a ${ name }` ) );

	setWidget( it, 'frascella-contact', { t__contact__heading: 'Ciao <script>alert(1)</script><em>mondo</em>' } );
	const safe = await text( '/' );
	check( 'no script from a field, allowed markup kept', ! safe.includes( '<script>alert(1)' ) && safe.includes( '<em>mondo</em>' ) );

	setWidget( it, 'frascella-contact', { show_phone: '' } );
	check( 'a control changes what is shown', ! ( await text( '/' ) ).includes( 'href="tel:' ) );
} finally {
	restore();
}
check( 'restored', ( await text( '/' ) ).includes( `Scrivi a ${ name }` ) );

const browser = await chromium.launch();
try {
	const page = await login( browser );
	for ( const [ id, lang, expected ] of [ [ it, 'it', `Scrivi a ${ name }` ], [ en, 'en', `Write to ${ name }` ] ] ) {
		if ( ! id ) {
			continue;
		}
		await openEditor( page, id );
		// Select the contact widget and read its heading field in the panel.
		const value = await page.evaluate( () => {
			const find = ( c ) => ( c.model?.get?.( 'widgetType' ) === 'frascella-contact' ? c : ( c.children || [] ).map( find ).find( Boolean ) );
			const container = find( window.elementor.getPreviewContainer() );
			return container?.settings?.get( 't__contact__heading' );
		} );
		check( `editor (${ lang }): the field starts from the page's words`, value === expected, String( value ) );
	}
} finally {
	await browser.close();
}
finish();
