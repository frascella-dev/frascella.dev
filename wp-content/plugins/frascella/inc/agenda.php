<?php

/**
 * Agenda (requests): where a request's email goes.
 *
 * The contact form is Agenda's form `contatti` (tools/agenda/contatti.json), hosted by the
 * home page; the theme draws it. What the plugin decides is the destination: the
 * business's own address in Settings → frascella.dev, the one fact every part of the site
 * reads. Agenda's own setting, then the site admin's address, answer only while that fact
 * is empty.
 *
 * Without Agenda the filter is never applied.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

add_filter('agenda_notify_to', static function (string $to): string {
    $own = function_exists('frascella_facts') ? frascella_facts()['email'] : '';

    return $own !== '' ? $own : $to;
});

/**
 * The form's addresses on the front page: `/?agenda_step=inviato`, `/en/?agenda_step=inviato`.
 *
 * Agenda gives a form hosted by the front page addresses with a query, the front page
 * having no path of its own. But WordPress maps `/` to the front page only while the query
 * is empty: with `agenda_step` in it, `/` becomes the list of posts, and the form's
 * confirmation a 404. So a request for a language's root that carries only Agenda's step
 * (and the language) is the front page, in that language.
 */
add_filter('request', static function (array $vars): array {
    if (!isset($vars['agenda_step']) || array_diff(array_keys($vars), ['agenda_step', 'lang']) !== [] || get_option('show_on_front') !== 'page') {
        return $vars;
    }
    $front = (int) get_option('page_on_front');
    if ($front > 0 && !empty($vars['lang']) && function_exists('pll_get_post')) {
        $front = (int) (pll_get_post($front, (string) $vars['lang']) ?: $front);
    }
    if ($front > 0) {
        $vars['page_id'] = $front;
    }

    return $vars;
});
