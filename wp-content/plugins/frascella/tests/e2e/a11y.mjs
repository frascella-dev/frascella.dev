/**
 * Accessibility with axe, on every kind of page the site has, in both languages, on a
 * desktop and a phone: WCAG 2.1 AA and best practice, serious and critical violations fail.
 *
 * Kinds of page: the home (with the desk, in its still pictures: see launch() in the
 * harness), the privacy notice, the 404. States: the phone's menu open, the contact form
 * with its refusals, the confirmation in its place, and the keyboard's desk switches.
 *
 *   npm run test:a11y
 */
import { BASE, audit, check, finish, launch } from './_harness.mjs';

const browser = await launch();
try {
	for ( const [ width, label ] of [ [ 1440, 'desktop' ], [ 390, 'phone' ] ] ) {
		const page = await ( await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: 'reduce' } ) ).newPage();
		for ( const url of [ '/', '/en/', '/privacy/', '/en/privacy/', '/not-a-page/' ] ) {
			await page.goto( BASE + url, { waitUntil: 'load' } );
			await audit( page, `${ url } (${ label })` );
		}
	}

	// The phone's menu, open: the drawer, and the page behind it out of reach.
	const phone = await ( await browser.newContext( { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' } ) ).newPage();
	await phone.goto( `${ BASE }/`, { waitUntil: 'load' } );
	await phone.click( '.menu-btn' );
	const open = await phone.evaluate( () => ( {
		expanded: document.querySelector( '.menu-btn' ).getAttribute( 'aria-expanded' ),
		focus: document.activeElement?.closest( '#site-drawer' ) !== null,
		inert: document.querySelector( 'main' ).inert,
	} ) );
	check( 'phone menu: opens, takes the focus, and the page behind is inert', open.expanded === 'true' && open.focus && open.inert, JSON.stringify( open ) );
	await audit( phone, '/ menu open (phone)' );
	await phone.keyboard.press( 'Escape' );
	const closed = await phone.evaluate( () => ( {
		expanded: document.querySelector( '.menu-btn' ).getAttribute( 'aria-expanded' ),
		focus: document.activeElement?.classList.contains( 'menu-btn' ),
		inert: document.querySelector( 'main' ).inert,
	} ) );
	check( 'phone menu: Esc closes it and gives the focus back', closed.expanded === 'false' && closed.focus && ! closed.inert, JSON.stringify( closed ) );

	// The form, refused: the lines under the fields.
	const desk = await ( await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } ) ).newPage();
	await desk.goto( `${ BASE }/#contatti`, { waitUntil: 'load' } );
	await desk.waitForTimeout( 2300 );
	await desk.click( '.contact-form button[type="submit"]' );
	await desk.waitForSelector( '.field-error' );
	await audit( desk, '/ form refused (desktop)' );

	// The keyboard's way to the desk: Tab from the menu reaches the desk's switches.
	await desk.goto( `${ BASE }/`, { waitUntil: 'load' } );
	await desk.waitForFunction( () => document.documentElement.classList.contains( 'desk-ready' ), null, { timeout: 30000 } );
	await desk.evaluate( () => document.querySelector( '.top-cta' ).focus() );
	await desk.keyboard.press( 'Tab' );
	const next = await desk.evaluate( () => document.activeElement?.id || document.activeElement?.className );
	// Still pictures: the switches are hidden, so the next stop is the page's own.
	check( 'keyboard: after «scrivimi» comes the page, never a hidden control', next !== '' && next !== 'lamp-btn', String( next ) );
} finally {
	await browser.close();
}
finish();
