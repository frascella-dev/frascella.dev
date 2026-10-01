<?php

/**
 * The business's facts: name, address, telephone, email, VAT number, the profiles elsewhere.
 *
 * One option, read on every request, edited in Portfolio → Settings (inc/admin-app.php). They are what the
 * dynamic tags print inside native widgets, what `{name}` and the other placeholders stand
 * for in the site's sentences, what the footer shows and what the structured data declares
 * — so a changed address changes everywhere at once, and is never typed into a page.
 *
 * **Never invent a fact.** An empty field is an absent fact: the footer leaves the line
 * out and the structured data leaves the key out.
 *
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

const FRASCELLA_OPTION_FACTS = 'frascella_facts';

/** @return array<string, string> key => label */
function frascella_fact_fields(): array
{
    return [
        'name' => __('Name', 'frascella'),
        'street' => __('Street and number', 'frascella'),
        'postcode' => __('Postcode', 'frascella'),
        'city' => __('City', 'frascella'),
        'region' => __('Province or region', 'frascella'),
        'country' => __('Country (two letters)', 'frascella'),
        'phone' => __('Telephone', 'frascella'),
        'email' => __('Email', 'frascella'),
        'vat' => __('VAT number', 'frascella'),
        'github' => __('GitHub profile (address)', 'frascella'),
        'linkedin' => __('LinkedIn profile (address)', 'frascella'),
    ];
}

/** The facts that are addresses: saved only when they are one, and typed as one. */
const FRASCELLA_FACT_URLS = ['github', 'linkedin'];

/** @return array<string, string> the facts, every key present (empty when unknown) */
function frascella_facts(): array
{
    $stored = get_option(FRASCELLA_OPTION_FACTS, []);
    $stored = is_array($stored) ? $stored : [];
    $out = [];
    foreach (array_keys(frascella_fact_fields()) as $key) {
        $out[$key] = trim((string) ($stored[$key] ?? ''));
    }
    if ($out['name'] === '') {
        $out['name'] = wp_specialchars_decode((string) get_bloginfo('name'), ENT_QUOTES);
    }

    return $out;
}

/**
 * The facts as they are saved: by type, never "fixed" — an email that is not one, or an
 * address that is not https, is saved as empty.
 *
 * @return array<string, string>
 */
function frascella_sanitize_facts(array $input): array
{
    $out = [];
    foreach (frascella_fact_fields() as $key => $label) {
        $value = sanitize_text_field((string) ($input[$key] ?? ''));
        $out[$key] = match (true) {
            $key === 'email' => is_email($value) ? $value : '',
            $key === 'country' => strtoupper(substr($value, 0, 2)),
            in_array($key, FRASCELLA_FACT_URLS, true) => str_starts_with($value, 'https://') ? esc_url_raw($value, ['https']) : '',
            default => $value,
        };
    }

    return $out;
}

// The option keeps its sanitising wherever it is written from (the Portfolio's settings,
// WP-CLI, tools/site.php).
add_action('init', static function (): void {
    register_setting('frascella_facts', FRASCELLA_OPTION_FACTS, [
        'type' => 'array',
        'show_in_rest' => false,
        'sanitize_callback' => static fn ($input): array => frascella_sanitize_facts(is_array($input) ? $input : []),
    ]);
});
