/**
 * The sitemap: every page, with its other language (hreflang), on the custom domain.
 */
import { langs, words } from "../i18n.ts";
import { canonical, inLang } from "../lib/url.ts";

const pages = ["", "privacy/"];

export function GET(): Response {
    const urls = pages.flatMap((page) =>
        langs.map((lang) => {
            const alternates = langs
                .map((l) => `    <xhtml:link rel="alternate" hreflang="${words[l].hreflang}" href="${canonical(inLang(l, page))}"/>`)
                .join("\n");
            return `  <url>\n    <loc>${canonical(inLang(lang, page))}</loc>\n${alternates}\n  </url>`;
        }),
    );
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
    return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
