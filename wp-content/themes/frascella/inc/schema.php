<?php

/**
 * Structured data: one JSON-LD graph per page, built from the facts in Portfolio → Settings.
 *
 * The business is a person: Emanuele Frascella, a freelance software engineer, with his VAT
 * number, his city and his profiles — what the footer shows. Hence `Person`, not
 * `Organization` or a `LocalBusiness`, which would ask for an address and opening hours
 * the site does not have.
 *
 * Three rules.
 * - **Nothing declared to machines that the page does not show.** A fact in the graph is a
 *   fact a person can read on the site; an empty fact is an absent key, never "".
 * - **No ratings of your own.** Search engines treat a business's own reviews marked up as
 *   `Review` / `AggregateRating` as self-serving; leave them out.
 * - **JSON_HEX_TAG** is load-bearing: it turns every `<` into `<`, so a string holding
 *   `</script>` cannot close the block early.
 *
 * Change `@type` to the most specific type the business is (`LocalBusiness`, `Dentist`,
 * `LegalService`, …) through the `frascella_schema_type` filter or here.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/**
 * The site's own address, the same in every language: what the graph's identifiers hang
 * from. home_url() will not do — on an English page Polylang rewrites it to `/en/`, and the
 * business would be a different node in each language.
 */
function frascella_schema_root(): string
{
    return trailingslashit((string) get_option('home'));
}

/** @return array<string, mixed> */
function frascella_schema_business(): array
{
    $facts = function_exists('frascella_facts') ? frascella_facts() : [];
    $who = frascella_who();
    $address = array_filter([
        '@type' => 'PostalAddress',
        'streetAddress' => (string) ($facts['street'] ?? ''),
        'postalCode' => (string) ($facts['postcode'] ?? ''),
        'addressLocality' => (string) ($facts['city'] ?? ''),
        'addressRegion' => (string) ($facts['region'] ?? ''),
        'addressCountry' => (string) ($facts['country'] ?? ''),
    ]);

    // The profiles the footer links to: the same person elsewhere.
    $same = array_values(array_filter([(string) ($facts['github'] ?? ''), (string) ($facts['linkedin'] ?? '')]));

    return array_filter([
        '@type' => (string) apply_filters('frascella_schema_type', 'Person'),
        '@id' => frascella_schema_root() . '#business',
        'name' => $who['name'],
        'jobTitle' => frascella_s('schema.jobTitle'),
        'url' => home_url('/'),
        'telephone' => $who['phone'],
        'email' => $who['email'],
        'address' => count($address) > 1 ? $address : null,
        'vatID' => (string) ($facts['vat'] ?? ''),
        'sameAs' => $same !== [] ? $same : null,
    ], static fn ($v): bool => $v !== '' && $v !== null);
}

/** @return list<array<string, mixed>> */
function frascella_schema_graph(): array
{
    $graph = [frascella_schema_business()];
    $graph[] = [
        '@type' => 'WebSite',
        '@id' => frascella_schema_root() . '#website',
        'url' => home_url('/'),
        'name' => frascella_who()['name'],
        'inLanguage' => frascella_html_lang(),
        'publisher' => ['@id' => frascella_schema_root() . '#business'],
    ];
    if (is_singular()) {
        $graph[] = [
            '@type' => 'WebPage',
            '@id' => frascella_canonical() . '#webpage',
            'url' => frascella_canonical(),
            'name' => wp_get_document_title(),
            'inLanguage' => frascella_html_lang(),
            'isPartOf' => ['@id' => frascella_schema_root() . '#website'],
        ];
    }

    return (array) apply_filters('frascella_schema_graph', $graph);
}

add_action('wp_head', static function (): void {
    if (frascella_is_noindex()) {
        return;
    }
    $json = wp_json_encode(
        ['@context' => 'https://schema.org', '@graph' => frascella_schema_graph()],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG,
    );
    if (is_string($json)) {
        echo '<script type="application/ld+json">' . $json . '</script>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON_HEX_TAG, see above.
    }
}, 8);
