/**
 * Bottega's banner and icon, from their SVG sources in design/ to the PNGs the README
 * shows (.github/assets/). Run after changing a source:
 *
 *   node bin/export-assets.mjs
 *
 * Uses the Playwright installed for the plugin's tests (cd wp-content/plugins/frascella && npm install).
 * The project's own mark, drawn from the Sketch file.
 */
import { chromium } from '../wp-content/plugins/frascella/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const jobs = [
	[ 'icon.svg', 'icon-512.png', 512, 512 ],
	[ 'banner-light.svg', 'banner-light.png', 2560, 640 ],
	[ 'banner-dark.svg', 'banner-dark.png', 2560, 640 ],
];

const browser = await chromium.launch();
try {
	for ( const [ source, target, width, height ] of jobs ) {
		const page = await browser.newPage( { viewport: { width, height } } );
		const svg = readFileSync( path.join( root, 'design', source ), 'utf8' );
		await page.setContent( `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${ svg }` );
		await page.screenshot( { path: path.join( root, '.github/assets', target ), omitBackground: true } );
		console.log( `✓ ${ target }` );
		await page.close();
	}
} finally {
	await browser.close();
}
