<?php

/**
 * The business's facts: name, address, telephone, email, VAT number, the profiles elsewhere.
 *
 * One option, one screen (Settings → frascella.dev), read on every request. They are what the
 * dynamic tags print inside native widgets, what `{name}` and the other placeholders stand
 * for in the site's sentences, what the footer shows and what the structured data declares
 * — so a changed address changes everywhere at once, and is never typed into a page.
 *
 * **Never invent a fact.** An empty field is an absent fact: the footer leaves the line
 * out and the structured data leaves the key out.
 *
 * A richer project replaces this screen with a panel of its own (a React app on the REST
 * API, as the workspace's plugins have); the option and frascella_facts() stay the same.
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

add_action('admin_init', static function (): void {
    register_setting('frascella_facts', FRASCELLA_OPTION_FACTS, [
        'type' => 'array',
        'sanitize_callback' => static function ($input): array {
            $out = [];
            foreach (frascella_fact_fields() as $key => $label) {
                $value = sanitize_text_field((string) ($input[$key] ?? ''));
                $out[$key] = match (true) {
                    $key === 'email' => is_email($value) ? $value : '',
                    $key === 'country' => strtoupper(substr($value, 0, 2)),
                    // An address that is not an https one is saved as empty, never "fixed".
                    in_array($key, FRASCELLA_FACT_URLS, true) => str_starts_with($value, 'https://') ? esc_url_raw($value, ['https']) : '',
                    default => $value,
                };
            }

            return $out;
        },
    ]);
    add_settings_section('frascella_facts_main', '', '__return_false', 'frascella');
    foreach (frascella_fact_fields() as $key => $label) {
        add_settings_field($key, $label, static function () use ($key): void {
            printf(
                '<input type="%1$s" class="regular-text" id="frascella-fact-%2$s" name="%3$s[%2$s]" value="%4$s" />',
                $key === 'email' ? 'email' : (in_array($key, FRASCELLA_FACT_URLS, true) ? 'url' : 'text'),
                esc_attr($key),
                esc_attr(FRASCELLA_OPTION_FACTS),
                esc_attr(frascella_facts()[$key] ?? ''),
            );
        }, 'frascella', 'frascella_facts_main', ['label_for' => 'frascella-fact-' . $key]);
    }
});

add_action('admin_menu', static function (): void {
    add_options_page(__('frascella.dev', 'frascella'), __('frascella.dev', 'frascella'), 'manage_options', 'frascella', static function (): void {
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('frascella.dev — the facts', 'frascella'); ?></h1>
            <p><?php esc_html_e('What the site says about the business, in one place: the footer, the contact card, the dynamic tags and the structured data read it from here. Leave a field empty rather than guess.', 'frascella'); ?></p>
            <form method="post" action="options.php">
                <?php
                settings_fields('frascella_facts');
                do_settings_sections('frascella');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    });
});
