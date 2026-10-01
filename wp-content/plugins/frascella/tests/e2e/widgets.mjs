/**
 * The plugin's widgets, end to end.
 *
 * - The desk (texts): a sentence typed into a field is what the page says, in that page's
 *   language only; an empty field says the site's words; markup a field does not allow
 *   is dropped.
 * - The cut-out word (controls): the word, its fixed lines and, as a heading, the words a
 *   screen reader hears.
 * - The works (data): one card per project of the page's language, in their order, each a
 *   station of the desk with its screenshot; the count control.
 * - The stations: a container's «Camera station» is its data-stop.
 * - The header and footer (Theme Builder, one copy per language): a word typed in the
 *   English copy shows under /en/ only; {name} becomes the fact.
 * - The editor: a field starts from the page's own words, in its language.
 *
 * Everything it changes is put back.
 *
 *   npm run test:widgets
 */
import { check, finish, homes, launch, login, openEditor, php, phpValue, setWidget, snapshot, text } from './_harness.mjs';

const { it, en } = homes();
const restoreIt = snapshot( it );
const restoreEn = snapshot( en );

const count = ( html, needle ) => html.split( needle ).length - 1;

try {
	// The desk's words.
	setWidget( it, 'frascella-desk', { t__desk__cue: 'Scendi di prova', t__desk__label: 'Ciao <script>alert(1)</script><em>scrivania</em>' } );
	const itPage = await text( '/' );
	check( 'desk: a typed field is what the page says', itPage.includes( 'aria-label="Scendi di prova"' ) );
	check( 'desk: the other language keeps its own words', ! ( await text( '/en/' ) ).includes( 'Scendi di prova' ) );
	check( 'desk: no markup in a one-line field', ! itPage.includes( '<script>alert(1)' ) && ! itPage.includes( '&lt;script' ) && itPage.includes( 'aria-label="Ciao alert(1)scrivania"' ) );
	setWidget( it, 'frascella-desk', { t__desk__cue: '', t__desk__label: '' } );
	const fallback = await text( '/' );
	check( 'desk: an empty field says the site’s words', fallback.includes( 'id="cue" type="button" aria-label="scorri"' ) );
	check( 'desk: the dots are decorative, the keyboard has the switches', fallback.includes( 'id="hotspots" aria-hidden="true"' ) && count( fallback, 'class="hs" type="button"' ) === 6 && count( fallback, 'tabindex="-1"><span class="dot">' ) === 6 && fallback.includes( 'id="mug-btn"' ) );

	// The cut-out word.
	const page = await text( '/' );
	check( 'cut: the opening is the page’s one h1, with its words for screen readers', count( page, '<h1' ) === 1 && /<h1 class="cut-h"><span class="sr">piattaforme, app e integrazioni<\/span>/.test( page ) );
	check( 'cut: the word is hidden from screen readers, with its fixed lines', page.includes( 'class="cut" aria-hidden="true" data-lines="piattaforme, app|e integrazioni" data-lines-n="piattaforme,|app e|integrazioni"' ) );
	check( 'cut: a soft hyphen typed as an entity becomes a break point', ( () => {
		setWidget( it, 'frascella-cut', { word: 'piatta&shy;forme', tag: '', lines: '', lines_n: '' } );
		return true;
	} )() && ( await text( '/' ) ).includes( 'piatta\u00ADforme' ) );
	restoreIt();

	// The works.
	const works = await text( '/' );
	const stops = [ ...works.matchAll( /data-stop="(w\d)" data-screen="(\d)"/g ) ].map( ( m ) => m[ 1 ] + m[ 2 ] );
	check( 'works: one card per project, a station each, in order', JSON.stringify( stops ) === '["w10","w21","w32"]', JSON.stringify( stops ) );
	check( 'works: each card carries its screenshot for the scene', count( works, 'data-screen-src="' ) === 3 );
	check( 'works: a project with no stack has no stack line', /skeda\.fit<\/a>[\s\S]*?<p class="meta">\s*in sviluppo\s*<\/p>/.test( works ) );
	check( 'works: the name links to the project', works.includes( 'href="https://seveninktattoo.it"' ) && works.includes( 'href="https://github.com/manuto276/vitrine"' ) );
	setWidget( it, 'frascella-works', { count: 2 } );
	check( 'works: «How many» shows that many', count( await text( '/' ), 'class="card plate"' ) === 2 );
	restoreIt();
	// A project's English copy is the English page's.
	const project = Number( php( `foreach (get_posts(['post_type' => 'frascella_project', 'name' => 'vitrine', 'lang' => '', 'numberposts' => -1, 'fields' => 'ids']) as $p) { if (pll_get_post_language($p) === 'en') { echo $p; } }` ) );
	const status = php( `echo get_post_meta(${ project }, '_frascella_status', true);` );
	php( `update_post_meta(${ project }, '_frascella_status', 'public code on GitHub');` );
	check( 'works: a project’s copy speaks only on its language’s page', ( await text( '/en/' ) ).includes( 'public code on GitHub' ) && ! ( await text( '/' ) ).includes( 'public code on GitHub' ) );
	php( `update_post_meta(${ project }, '_frascella_status', ${ phpValue( status ) });` );

	// The stations.
	const stations = [ ...( await text( '/' ) ).matchAll( /data-stop="([a-z0-9]+)"/g ) ].map( ( m ) => m[ 1 ] );
	check( 'stations: every station of the scene, in page order', stations.join( ' ' ) === 'hero desk desk s1 s2 s3 w0 w1 w2 w3 bio contact', stations.join( ' ' ) );
} finally {
	restoreIt();
	restoreEn();
}

// The header and footer, one Theme Builder document per language.
if ( php( "echo defined('ELEMENTOR_PRO_VERSION') ? 'pro' : 'free';" ) === 'pro' ) {
	const footer = Number( php( `$f = get_posts(['post_type' => 'elementor_library', 'meta_key' => '_frascella_seed', 'meta_value' => 'footer', 'fields' => 'ids', 'numberposts' => 1, 'lang' => '']); echo (int) ($f[0] ?? 0);` ) );
	const copy = Number( php( `echo frascella_template_translation(${ footer }, 'en');` ) );
	const restoreCopy = snapshot( copy );
	try {
		setWidget( copy, 'frascella-footer', { t__footer__role: 'Engineer {name}, test' } );
		const enPage = await text( '/en/' );
		check( 'footer: the English copy speaks English', ( await text( '/en/' ) ).includes( 'VAT no. 03462650734' ) && ( await text( '/' ) ).includes( 'P. IVA 03462650734' ) );
	check( 'footer: a word typed in the English copy shows under /en/, {name} filled', enPage.includes( 'Engineer Emanuele Frascella, test' ) );
		check( 'footer: … and not on the Italian pages', ! ( await text( '/' ) ).includes( 'Engineer Emanuele Frascella, test' ) );
	} finally {
		restoreCopy();
	}
	const home = await text( '/' );
	check( 'header and footer: one landmark each, the Theme Builder’s', count( home, '<header' ) === 1 && count( home, '<footer' ) === 1 && home.includes( 'elementor-location-header' ) && home.includes( 'elementor-location-footer' ) );
	check( 'footer: the facts — VAT number and profiles from the settings', home.includes( 'P. IVA 03462650734' ) && home.includes( 'href="https://github.com/manuto276"' ) && home.includes( 'href="https://www.linkedin.com/in/efrascella256/"' ) );
}
check( 'restored', ( await text( '/' ) ).includes( 'id="cue" type="button" aria-label="scorri"' ) );

// The editor: the fields start from the page's own words, in its language.
const browser = await launch();
try {
	const page = await login( browser );
	for ( const [ id, lang, expected ] of [ [ it, 'it', 'scorri' ], [ en, 'en', 'scroll' ] ] ) {
		if ( ! id ) {
			continue;
		}
		await openEditor( page, id );
		const value = await page.evaluate( () => {
			const find = ( c ) => ( c.model?.get?.( 'widgetType' ) === 'frascella-desk' ? c : ( c.children || [] ).map( find ).find( Boolean ) );
			return find( window.elementor.getPreviewContainer() )?.settings?.get( 't__desk__cue' );
		} );
		check( `editor (${ lang }): the field starts from the page's words`, value === expected, String( value ) );
	}
} finally {
	await browser.close();
}
finish();
