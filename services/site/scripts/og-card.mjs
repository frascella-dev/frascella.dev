/**
 * Renders `scripts/og-card.html` into `public/og-card.png` at exactly
 * 1200×630 — the size every link preview crops to.
 *
 *     node scripts/og-card.mjs
 *
 * Deliberately not wired into `npm run build`. The card changes about as
 * often as the name on it does, and a headless browser in the build would
 * cost every deploy to redraw a PNG that did not change. Run it by hand when
 * the palette or the wording moves, and commit the result.
 *
 * Playwright is not a dependency of this package — it is heavy, and this is
 * the only thing that wants it. `npx playwright@1.62.1` fetches it on demand;
 * if the browser binary is missing, `npx playwright install chromium`.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "og-card.html");
const out = join(here, "..", "public", "og-card.png");

const browser = await chromium.launch();
const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    // The card is a fixed-size image, so it renders at 1× regardless of the
    // machine drawing it. Twice the pixels would only cost bytes in a preview
    // that is displayed no larger than this.
    deviceScaleFactor: 1,
});

await page.goto(`file://${source}`, { waitUntil: "networkidle" });
// The two woff2 files are loaded over file://, so wait for the faces rather
// than the network — a screenshot taken a frame early ships the fallback.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(150);

await page.screenshot({ path: out, type: "png" });
await browser.close();

console.log(`og-card.png written — ${out}`);
