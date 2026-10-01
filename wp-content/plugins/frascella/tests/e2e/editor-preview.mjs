/**
 * A page built from native widgets: what a visitor gets, and what the editor shows.
 *
 * - A visitor with motion: the widgets of an `frascella-reveal` container start held back and
 *   come in as they are scrolled to; with reduced motion nothing is ever held back.
 * - The editor: every section is visible in the preview (nothing waits for a scroll that
 *   Elementor's redraws would never trigger), and a word changed in a native Heading shows
 *   in the preview at once and not on the published page until saved. Nothing is saved.
 *
 *   npm run test:editor
 */
import { BASE, check, finish, homes, launch, login, openEditor, text } from './_harness.mjs';

const { it } = homes();
/**
 * Every section on the page has height, and nothing in it is held at opacity 0. In the
 * editor Elementor puts a `.elementor-section-wrap` between the document and its sections.
 */
const SECTIONS = '[data-elementor-type="wp-page"] > .elementor-element, [data-elementor-type="wp-page"] > .elementor-section-wrap > .elementor-element';
const visible = ( frame ) => frame.evaluate( ( selector ) => [ ...document.querySelectorAll( selector ) ].map( ( s ) => {
	const hidden = [ ...s.querySelectorAll( '.elementor-element' ) ].filter( ( w ) => getComputedStyle( w ).opacity === '0' ).length;
	return s.getBoundingClientRect().height > 40 && hidden === 0;
} ), SECTIONS );

const browser = await launch();
try {
	// A short window, so the revealed section starts below the fold.
	const visitor = await ( await browser.newContext( { viewport: { width: 1280, height: 480 } } ) ).newPage();
	await visitor.goto( `${ BASE }/`, { waitUntil: 'networkidle' } );
	const before = await visitor.evaluate( () => getComputedStyle( document.querySelector( '.frascella-reveal > .e-con-inner > .elementor-element, .frascella-reveal > .elementor-element' ) ).opacity );
	for ( let y = 0; y < 12000; y += 300 ) {
		await visitor.mouse.wheel( 0, 300 );
		await visitor.waitForTimeout( 80 );
	}
	await visitor.waitForTimeout( 1200 );
	const after = await visible( visitor );
	check( 'visitor: a container marked frascella-reveal holds its widgets back, then brings them in', before === '0' && after.length > 0 && after.every( Boolean ), `${ before } → ${ JSON.stringify( after ) }` );

	const calm = await ( await browser.newContext( { reducedMotion: 'reduce' } ) ).newPage();
	await calm.goto( `${ BASE }/`, { waitUntil: 'networkidle' } );
	check( 'reduced motion: nothing held back', ( await visible( calm ) ).every( Boolean ) );

	const page = await login( browser );
	const frame = await openEditor( page, it );
	const shown = await visible( frame );
	check( 'editor: every section visible in the preview', shown.length > 0 && shown.every( Boolean ), JSON.stringify( shown ) );
	check( 'editor: the preview is marked as editing', await frame.evaluate( () => document.documentElement.classList.contains( 'editing' ) ) );

	await page.evaluate( () => {
		const find = ( c ) => ( c.model?.get?.( 'widgetType' ) === 'heading' && ( c.model.get( 'settings' ).get( '_css_classes' ) || '' ).includes( 'hero-rest' ) ) ? c : ( c.children || [] ).map( find ).find( Boolean );
		window.$e.run( 'document/elements/settings', { container: find( window.elementor.getPreviewContainer() ), settings: { title: 'Dall’editor' } } );
	} );
	await page.waitForTimeout( 1200 );
	check( 'editor: the preview follows the panel', ( await frame.locator( '.hero-rest' ).first().textContent() ).includes( 'Dall’editor' ) );
	check( 'editor: no desk and no sheet over the page being written', await frame.evaluate( () => ! document.querySelector( '#desk, #sheet' ) && ! document.documentElement.classList.contains( 'cutting' ) ) );
} finally {
	await browser.close();
}
check( 'nothing saved from the editor', ! ( await text( '/' ) ).includes( 'Dall’editor' ) );
finish();
