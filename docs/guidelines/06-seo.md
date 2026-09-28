# 6 · SEO

The rule: **declare only what the page shows.** Search engines reward a site whose metadata
agrees with its pages, and eventually punish one where it does not.

## The head (`inc/head.php`)

- **Title:**
  - on the front page, the tree's `meta.title`;
  - elsewhere, "Page - Name" (`document_title_parts`, `document_title_separator`).
- **Description:**
  - one a page states for itself (`frascella_description` filter);
  - otherwise the excerpt;
  - otherwise the tree's `meta.description`, in the page's language.
- **Canonical:**
  - written by the theme; WordPress's `rel_canonical` is removed, because it answers from
    the query rather than from the address;
  - page two of a list is its own canonical;
  - a page that wants another canonical says so through `frascella_canonical_url`.
- **`hreflang`:**
  - one link per language, from Polylang, plus `x-default` (the default language's
    address);
  - a language's front page is its root (`pll_home_url($lang)`);
  - omitted on noindex pages.
- **Open Graph:**
  - the page's featured image, then the front page's, then nothing — no card is better
    than a wrong one;
  - the image URL carries its modification time, because scrapers cache a card by URL for
    days.

## Robots

- **noindex goes through `wp_robots`, WordPress's own mechanism**, never a hand-written
  meta tag.
- **Pages that are nobody's document are noindex:** 404, search, receipts, confirmations,
  private pages, an empty list. They join through the `frascella_noindex` filter, or by id
  through `frascella_noindex_ids`.
- **The sitemap reads the same `frascella_noindex_ids` list.** A page is either in both the
  index and the sitemap, or in neither.

## The sitemap (`inc/sitemap.php`)

- **WordPress's own sitemap is used**, never a plugin's. Core generates, paginates and
  updates it; the theme only filters it.
- **Leave out:**
  - author archives on a single-author site;
  - taxonomies the site does not use;
  - the noindex ids.
- **Archive pages of a post type are not in core's sitemap.** Add them through a provider
  if they matter.
- **Submit `wp-sitemap.xml` to Search Console once.** It is an index of sub-sitemaps, one
  per type and language, and Google reads them on its own.

## Structured data (`inc/schema.php`)

- **One JSON-LD `@graph` per page:** the business (the most specific schema.org type it
  is), the WebSite and the WebPage.
- **Built from the facts.** An empty fact is an absent key.
- **Stable `@id`s**, derived from `get_option('home')` and never from `home_url()` (see
  [05](05-words-and-languages.md#pitfalls-met-in-real-projects)).
- **`JSON_HEX_TAG` is load-bearing.** It turns `<` into `<`, so a string containing
  `</script>` cannot close the block.
- **No `Review` or `AggregateRating` for the business's own reviews.** Search engines
  treat it as self-serving.

## Cleanup (`inc/cleanup.php`)

A feature the site does not have is not advertised in its head. The theme removes:
- the generator tag, shortlinks and RSD/WLW;
- emoji;
- oEmbed where nothing embeds;
- the block library's CSS on a classic theme.

Each removal says why.

## After a launch

- Submit the sitemap.
- Request indexing for the home page of each language.
- Check that the redirects from the old site's addresses land (301) on their new ones.
- Crawl the site once for broken links.
