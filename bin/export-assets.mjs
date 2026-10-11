/**
 * frascella.dev's banner and icons, from their SVG sources in design/:
 * - the PNGs the README shows (.github/assets/);
 * - the site's icons (public/): favicon.ico (16, 32, 48) and the Apple touch icon at the root,
 *   where browsers ask for them; favicon.svg and the web app manifest's 192, 512 (rounded,
 *   "any") and 512 maskable (full bleed) in public/icons/.
 *
 * Run after changing a source:
 *
 *   npm run export-assets
 *
 * The project's own mark, drawn from the Sketch file.
 */
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const readme = '.github/assets';
const icons = 'public/icons';
const jobs = [
	[ 'icon.svg', `${ readme }/icon-512.png`, 512, 512 ],
	[ 'banner-light.svg', `${ readme }/banner-light.png`, 2560, 640 ],
	[ 'banner-dark.svg', `${ readme }/banner-dark.png`, 2560, 640 ],
	[ 'icon.svg', `${ icons }/icon-192.png`, 192, 192 ],
	[ 'icon.svg', `${ icons }/icon-512.png`, 512, 512 ],
	[ 'icon-square.svg', `${ icons }/icon-maskable-512.png`, 512, 512 ],
	// iOS rounds the corners itself, and fills transparency with black.
	[ 'icon-square.svg', 'public/apple-touch-icon.png', 180, 180 ],
];
const ico = [ 16, 32, 48 ];

/** An .ico holding PNGs, one per size: what every browser since Vista reads. */
function icoFrom( pngs ) {
	const header = Buffer.alloc( 6 );
	header.writeUInt16LE( 1, 2 );
	header.writeUInt16LE( pngs.length, 4 );
	let offset = 6 + 16 * pngs.length;
	const entries = pngs.map( ( { size, data } ) => {
		const entry = Buffer.alloc( 16 );
		entry.writeUInt8( size, 0 );
		entry.writeUInt8( size, 1 );
		entry.writeUInt16LE( 1, 4 );
		entry.writeUInt16LE( 32, 6 );
		entry.writeUInt32LE( data.length, 8 );
		entry.writeUInt32LE( offset, 12 );
		offset += data.length;
		return entry;
	} );
	return Buffer.concat( [ header, ...entries, ...pngs.map( ( p ) => p.data ) ] );
}

async function render( browser, source, width, height ) {
	// Rendered at the target size, so the browser does the resampling from the vector.
	const page = await browser.newPage( { viewport: { width, height } } );
	const svg = readFileSync( path.join( root, 'design', source ), 'utf8' )
		.replace( /width="\d+" height="\d+"/, `width="${ width }" height="${ height }"` );
	await page.setContent( `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${ svg }` );
	await page.evaluate( () => document.fonts.ready );
	await page.waitForTimeout( 300 );
	const data = await page.screenshot( { omitBackground: true } );
	await page.close();
	return data;
}

mkdirSync( path.join( root, icons ), { recursive: true } );
const browser = await chromium.launch();
try {
	for ( const [ source, target, width, height ] of jobs ) {
		writeFileSync( path.join( root, target ), await render( browser, source, width, height ) );
		console.log( `✓ ${ target }` );
	}
	const pngs = [];
	for ( const size of ico ) {
		pngs.push( { size, data: await render( browser, 'icon.svg', size, size ) } );
	}
	writeFileSync( path.join( root, 'public/favicon.ico' ), icoFrom( pngs ) );
	console.log( '✓ public/favicon.ico' );
	copyFileSync( path.join( root, 'design/icon.svg' ), path.join( root, icons, 'favicon.svg' ) );
	console.log( `✓ ${ icons }/favicon.svg` );
} finally {
	await browser.close();
}
