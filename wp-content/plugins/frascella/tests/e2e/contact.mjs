/**
 * The contact form (Agenda's `contatti`, drawn by the theme), end to end, on this machine only:
 *
 * - refused: an empty form comes back with a line under each field, and the first refused
 *   field has the focus, without leaving the page;
 * - sent with the page's script: the confirmation replaces the form in place, and the
 *   business's copy reaches Mailpit with the name and the message in it;
 * - sent with no script at all: the browser posts, and lands on the confirmation at the
 *   contact poster (`#contatti`), out of the index;
 * - the English page's form answers in its own place too.
 *
 * Addresses are @example.com, unique per run (Agenda refuses a second request from one
 * address within 15 minutes). What it creates is erased afterwards: the requests and their
 * customers (Agenda's own eraser), and the messages in Mailpit.
 *
 *   npm run test:contact
 */
import { BASE, check, finish, launch, php } from './_harness.mjs';

const MAILPIT = process.env.MAILPIT || 'http://localhost:8135';
const run = Date.now().toString( 36 );
const people = [ `contatto-js-${ run }@example.com`, `contatto-nojs-${ run }@example.com`, `contatto-en-${ run }@example.com` ];

const mailpit = async ( query ) => ( await ( await fetch( `${ MAILPIT }/api/v1/search?query=${ encodeURIComponent( query ) }` ) ).json() ).messages || [];
const waitMail = async ( query ) => {
	for ( let i = 0; i < 30; i++ ) {
		const found = await mailpit( query );
		if ( found.length ) {
			return found;
		}
		await new Promise( ( r ) => setTimeout( r, 1000 ) );
	}
	return [];
};

/** Fill and send, past Agenda's time trap (a step answered in under 2 s is refused). */
async function send( page, name, email, message ) {
	await page.fill( 'input[name="name"]', name );
	await page.fill( 'input[name="email"]', email );
	await page.fill( 'textarea[name="message"]', message );
	await page.waitForTimeout( 2300 );
	await page.click( '.contact-form button[type="submit"]' );
}

// Agenda limits sends per connection (5 an hour), and every run comes from the same one:
// its counters (transients) are reset first, on this machine only.
const resetLimits = () => php( `global $wpdb; $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_agenda\\_rl\\_%' OR option_name LIKE '\\_transient\\_timeout\\_agenda\\_rl\\_%'"); echo 'ok';` );
resetLimits();

const browser = await launch();
try {
	// Refused, in place.
	const page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } ) ).newPage();
	await page.goto( `${ BASE }/#contatti`, { waitUntil: 'networkidle' } );
	await page.waitForTimeout( 2300 );
	await page.click( '.contact-form button[type="submit"]' );
	await page.waitForSelector( '.field-error', { timeout: 10000 } );
	const refused = await page.evaluate( () => ( {
		url: location.href,
		errors: [ ...document.querySelectorAll( '.field-error' ) ].map( ( e ) => e.textContent.trim() ),
		focus: document.activeElement?.getAttribute( 'name' ),
		described: document.querySelector( 'input[name="name"]' )?.getAttribute( 'aria-describedby' ) || '',
	} ) );
	check( 'refused: a line under each empty field, in the owner’s words', refused.errors.includes( 'Scrivi il tuo nome.' ) && refused.errors.includes( 'Scrivi due righe su cosa ti serve.' ), JSON.stringify( refused.errors ) );
	check( 'refused: the first refused field has the focus', refused.focus === 'name', String( refused.focus ) );
	check( 'refused: the field points to its refusal', refused.described.includes( 'error' ) );
	check( 'refused: still on the home page', ! refused.url.includes( 'agenda_step' ), refused.url );

	// Sent, with the script: the confirmation in the form's place.
	await send( page, 'Prova Script', people[ 0 ], 'Un sito in due lingue, per una prova automatica.' );
	await page.waitForSelector( '[data-agenda-done]', { timeout: 15000 } );
	const done = await page.evaluate( () => ( {
		url: location.href,
		title: document.querySelector( '.contact-done-title' )?.textContent.trim(),
		focused: document.activeElement?.hasAttribute( 'data-agenda-done' ),
	} ) );
	check( 'sent (script): the confirmation replaces the form, on the same page', done.title === 'Messaggio ricevuto.' && ! done.url.includes( 'agenda_step' ), JSON.stringify( done ) );
	check( 'sent (script): the confirmation has the focus', done.focused === true );
	const mail = await waitMail( `"Prova Script"` );
	check( 'sent (script): the business’s copy is in Mailpit', mail.length === 1, `${ mail.length } message(s)` );
	if ( mail[ 0 ] ) {
		const full = await ( await fetch( `${ MAILPIT }/api/v1/message/${ mail[ 0 ].ID }` ) ).json();
		check( 'the copy holds the message and is addressed to the site, not to the visitor', full.Text.includes( 'Un sito in due lingue' ) && ! full.To.some( ( t ) => t.Address === people[ 0 ] ), full.To.map( ( t ) => t.Address ).join( ', ' ) );
		check( 'the visitor gets no automatic email', ( await mailpit( `to:${ people[ 0 ] }` ) ).length === 0 );
	}

	// Sent, with no script: a plain post, landing on the contact poster.
	const plain = await ( await browser.newContext( { javaScriptEnabled: false, viewport: { width: 390, height: 844 } } ) ).newPage();
	await plain.goto( `${ BASE }/`, { waitUntil: 'load' } );
	await send( plain, 'Prova Senza Script', people[ 1 ], 'Senza JavaScript il modulo funziona lo stesso.' );
	await plain.waitForLoadState( 'load' );
	const landed = plain.url();
	const plainDone = await plain.locator( '.contact-done-title' ).textContent( { timeout: 5000 } ).catch( async () => 'not done: ' + ( await plain.locator( '.form-status, .field-error' ).allTextContents() ).join( ' / ' ) );
	check( 'sent (no script): the confirmation, at the contact poster', plainDone.trim() === 'Messaggio ricevuto.' && landed.includes( '#contatti' ), landed );
	check( 'sent (no script): the confirmation is out of the index', /noindex/.test( await plain.locator( 'meta[name="robots"]' ).getAttribute( 'content' ).catch( () => '' ) ) );
	check( 'sent (no script): the copy is in Mailpit', ( await waitMail( `"Prova Senza Script"` ) ).length === 1 );

	// The English page's form.
	const en = await ( await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } ) ).newPage();
	await en.goto( `${ BASE }/en/#contatti`, { waitUntil: 'networkidle' } );
	check( 'en: the form posts to the English page', ( await en.locator( '.contact-form form' ).getAttribute( 'action' ) ).includes( '/en/' ) );
	await send( en, 'Prova Inglese', people[ 2 ], 'The English page sends too.' );
	await en.waitForSelector( '[data-agenda-done]', { timeout: 15000 } );
	check( 'en: sent, and confirmed in place', ( await waitMail( `"Prova Inglese"` ) ).length === 1 );
} finally {
	await browser.close();
	// Put back: the requests and their customers, then the messages.
	for ( const email of people ) {
		php( `if (function_exists('agenda_erase_person')) { agenda_erase_person('${ email }'); }` );
	}
	const ids = [];
	for ( const q of [ '"Prova Script"', '"Prova Senza Script"', '"Prova Inglese"' ] ) {
		ids.push( ...( await mailpit( q ) ).map( ( m ) => m.ID ) );
	}
	if ( ids.length ) {
		await fetch( `${ MAILPIT }/api/v1/messages`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( { IDs: ids } ) } );
	}
}
check( 'cleaned up: no request left from this run', php( `global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}agenda_customers WHERE email LIKE 'contatto-%-${ run }@example.com'");` ) === '0' );
finish();
