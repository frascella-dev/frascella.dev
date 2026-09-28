---
name: seo-head
description: Titles, meta descriptions, canonical URLs, hreflang, Open Graph, JSON-LD structured data, robots/noindex and the sitemap for a Bottega site; also the checks after a launch and Search Console. Use when adding a kind of page, when something is indexed that should not be (or the reverse), or when auditing search visibility.
---

# The head, and what search engines are told

Answer in the user's language. The rules are in `docs/guidelines/06-seo.md`. The one rule
above all: **declare only what the page shows.**

## A new kind of page

1. **Title.** Does the tree need its own `meta` entry, or is "Page - Name" right? For your
   own title, add a case to `document_title_parts` in `inc/head.php`.
2. **Description:** `add_filter('frascella_description', …)` for the page, in its language.
3. **Canonical.** Only if the address and the content differ (a step of a flow, a fallback
   in another language): `frascella_canonical_url`.
4. **Indexed or not?** A receipt, a private page, a confirmation or an empty list is not
   indexed:
   - use `frascella_noindex`, or `frascella_noindex_ids`;
   - the sitemap follows `frascella_noindex_ids`.
5. **Structured data.**
   - Add a node through `frascella_schema_graph` only for things the page shows.
   - `@id`s hang from `frascella_schema_root()`.
   - No ratings of the business's own reviews.

## Checking a page

```sh
curl -s <url> | grep -o '<title>[^<]*\|<link rel="canonical"[^>]*>\|<link rel="alternate" hreflang[^>]*>\|<meta name="robots"[^>]*>'
```

- **One canonical**, absolute, in the page's own language.
- **`hreflang`:**
  - one per language, plus `x-default`;
  - the same set on every language's version;
  - on a front page, the language roots (`/`, `/en/`).
- **JSON-LD:**
  - valid (paste it into validator.schema.org);
  - no empty strings;
  - the same `@id` for the business in every language.
- **The sitemap:** `/wp-sitemap.xml` lists sub-sitemaps per type and language. None of the
  noindex pages are in them.

## After a launch

1. **Search Console:**
   - remove the old site's sitemap;
   - submit `wp-sitemap.xml`;
   - request indexing for each language's home.
2. **Redirects from the old site's addresses** answer 301 to their new ones.
3. **Crawl once:** every internal link answers 200, and every 404 is intentional.
4. **Open Graph:** share the home in a messenger preview tool and check the card.

## Pitfalls

- **`hreflang` all pointing to `/en/`:** built with `home_url()` on an English page. Use
  `pll_home_url($lang)`.
- **An English page whose canonical is the Italian one:** the same slug resolved to the
  wrong language. Check `inc/polylang.php`'s `pre_get_posts`.
- **Archive pages of a post type missing from the sitemap:** core does not list them. Add
  a provider if they matter.
