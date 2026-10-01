<?php

/**
 * Dynamic tags: the business's facts inside Elementor's own widgets — a heading with the
 * address, a button that calls, a text with the email — so a section built by hand says
 * what Portfolio → Settings says, and follows it.
 *
 * Two shapes cover almost everything: a text fact, and a link. Add a fact to
 * frascella_fact_fields() (inc/facts.php) and it is a choice in both.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

// phpcs:disable PSR1.Methods.CamelCapsMethodName, Generic.Files.OneObjectStructurePerFile.MultipleFound -- Elementor's method names; two small tags.

/** A fact as text: the full address is the one composed value. */
function frascella_tag_fact(string $key): string
{
    $facts = frascella_facts();
    if ($key === 'address') {
        $place = trim($facts['postcode'] . ' ' . $facts['city'] . ($facts['region'] !== '' ? ' (' . $facts['region'] . ')' : ''));

        return implode(', ', array_filter([$facts['street'], $place]));
    }

    return (string) ($facts[$key] ?? '');
}

class Frascella_Tag_Fact extends \Elementor\Core\DynamicTags\Tag
{
    public function get_name(): string
    {
        return 'frascella-fact';
    }

    public function get_title(): string
    {
        return __('Fact', 'frascella');
    }

    public function get_group(): string
    {
        return 'frascella';
    }

    public function get_categories(): array
    {
        return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY];
    }

    protected function register_controls(): void
    {
        $this->add_control('field', [
            'label' => __('Which', 'frascella'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => ['address' => __('Full address', 'frascella')] + frascella_fact_fields(),
            'default' => 'name',
        ]);
    }

    public function render(): void
    {
        echo esc_html(frascella_tag_fact((string) $this->get_settings('field')));
    }
}

class Frascella_Tag_Link extends \Elementor\Core\DynamicTags\Data_Tag
{
    public function get_name(): string
    {
        return 'frascella-link';
    }

    public function get_title(): string
    {
        return __('Contact link', 'frascella');
    }

    public function get_group(): string
    {
        return 'frascella';
    }

    public function get_categories(): array
    {
        return [\Elementor\Modules\DynamicTags\Module::URL_CATEGORY];
    }

    protected function register_controls(): void
    {
        $this->add_control('target', [
            'label' => __('Where it leads', 'frascella'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => ['phone' => __('Call', 'frascella'), 'email' => __('Write', 'frascella'), 'map' => __('The map', 'frascella')],
            'default' => 'phone',
        ]);
    }

    public function get_value(array $options = []): string
    {
        $facts = frascella_facts();

        return match ((string) $this->get_settings('target')) {
            'phone' => $facts['phone'] !== '' ? 'tel:' . preg_replace('/[^0-9+]/', '', $facts['phone']) : '',
            'email' => $facts['email'] !== '' ? 'mailto:' . $facts['email'] : '',
            'map' => frascella_tag_fact('address') !== '' ? 'https://www.openstreetmap.org/search?query=' . rawurlencode(frascella_tag_fact('address')) : '',
            default => '',
        };
    }
}
