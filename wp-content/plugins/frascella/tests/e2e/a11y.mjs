/**
 * Accessibility with axe, on every kind of page the demo has, in both languages and on a
 * phone: WCAG 2.1 AA and best practice, serious and critical violations fail.
 *
 *   npm run test:a11y
 */
import { chromium } from 'playwright';
import { BASE, audit, finish } from './_harness.mjs';

const browser = await chromium.launch();
try {
	for ( const [ width, label ] of [ [ 1440, 'desktop' ], [ 390, 'phone' ] ] ) {
		const page = await ( await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: 'reduce' } ) ).newPage();
		for ( const url of [ '/', '/en/', '/privacy/', '/en/privacy/', '/not-a-page/' ] ) {
			await page.goto( BASE + url, { waitUntil: 'networkidle' } );
			await audit( page, `${ url } (${ label })` );
		}
	}
} finally {
	await browser.close();
}
finish();
