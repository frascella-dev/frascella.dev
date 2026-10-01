<?php

/**
 * The desk's stations, as a choice on any container: Advanced → Desk.
 *
 * The 3D desk moves its camera from one station to the next as the page scrolls; a station
 * is an element with `data-stop` (the theme's assets/src/desk/CONTRACT.md §3). The opening,
 * each service, each project and the contact are native containers, so the station is set
 * on the container — a short list to choose from, not an attribute typed by hand.
 *
 * Elementor Pro's Custom Attributes could carry it too, but they disappear the day the
 * licence does, and the scene would lose its stations without a word.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** @return array<string, string> value => label: the stations the scene knows, in page order */
function frascella_desk_stations(): array
{
    return [
        '' => __('None', 'frascella'),
        'hero' => __('The opening', 'frascella'),
        's1' => __('Service 1', 'frascella'),
        's2' => __('Service 2', 'frascella'),
        's3' => __('Service 3', 'frascella'),
        'w0' => __('The work’s title', 'frascella'),
        'bio' => __('The bio', 'frascella'),
        'contact' => __('The contact', 'frascella'),
    ];
}

add_action('elementor/element/container/section_layout/after_section_end', static function ($element): void {
    $element->start_controls_section('frascella_station', [
        'label' => __('Desk', 'frascella'),
        'tab' => \Elementor\Controls_Manager::TAB_ADVANCED,
    ]);
    $element->add_control('frascella_stop', [
        'label' => __('Camera station', 'frascella'),
        'type' => \Elementor\Controls_Manager::SELECT,
        'options' => frascella_desk_stations(),
        'default' => '',
        'description' => __('Where the desk’s camera stands while this container is in the middle of the screen. The intermezzo and the projects have their own; the rest, once each, in page order.', 'frascella'),
    ]);
    $element->end_controls_section();
});

add_action('elementor/frontend/container/before_render', static function ($element): void {
    $stop = (string) $element->get_settings('frascella_stop');
    if ($stop !== '' && array_key_exists($stop, frascella_desk_stations())) {
        $element->add_render_attribute('_wrapper', 'data-stop', $stop);
    }
});
