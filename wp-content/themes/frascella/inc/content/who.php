<?php

/**
 * Who the site belongs to: what the page titles, the sharing card, the structured data and
 * the sentences' placeholders ({name}, {city}, {vat}…) say. Typed here once, in code, the
 * one place a machine reads them from; what visitors read in the footer is typed in the
 * footer itself, in Elementor.
 *
 * **Never invent a fact.** An empty one is absent: the structured data leaves its key out.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

return [
    'name' => 'Emanuele Frascella',
    'city' => 'Taranto',
    'country' => 'IT',
    'street' => '',
    'phone' => '',
    'email' => 'emanuele@frascella.dev',
    'vat' => '03462650734',
    'github' => 'https://github.com/manuto276',
    'linkedin' => 'https://www.linkedin.com/in/efrascella256/',
];
