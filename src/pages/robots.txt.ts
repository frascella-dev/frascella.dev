/** Everything may be read; where the sitemap is. */
export function GET(): Response {
    return new Response("User-agent: *\nAllow: /\n\nSitemap: https://www.frascella.dev/sitemap.xml\n", { headers: { "Content-Type": "text/plain" } });
}
