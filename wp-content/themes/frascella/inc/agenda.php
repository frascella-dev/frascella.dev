<?php

/**
 * The contact form: Agenda's form `contatti`, hosted by the home page and drawn by the
 * theme (agenda/forms/contatti/*). Agenda runs the flow; this file only says where its
 * addresses land on the page, and that they are nobody's document.
 *
 * Without Agenda none of this runs: the filters are never applied.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** The form the theme draws. Its key is also the folder of the overrides. */
const FRASCELLA_CONTACT_FORM = 'contatti';

/**
 * The form is the home page's last poster: an address Agenda sends the visitor to (the
 * form again with its refusals, the confirmation) lands on it, not at the top of the page
 * — without a script that is a whole page load, and the reader would have to find the form
 * again.
 */
add_filter('agenda_step_url', static function (string $url, array $form): string {
    if (($form['form_key'] ?? '') !== FRASCELLA_CONTACT_FORM || str_contains($url, '#')) {
        return $url;
    }

    return $url . frascella_s('nav.ctaAnchor');
}, 10, 2);

/**
 * A step's address (`?agenda_step=…`) is the home page in the middle of a flow, not a
 * document: out of the index, and without alternates (inc/head.php). Agenda already marks
 * the confirmation noindex; this covers every step, and the head's hreflang with it.
 */
add_filter('frascella_noindex', static function (bool $noindex): bool {
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- which address this is; nothing is changed.
    return $noindex || isset($_GET['agenda_step']) || (string) get_query_var('agenda_step') !== '';
});
