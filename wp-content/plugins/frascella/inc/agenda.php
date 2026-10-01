<?php

/**
 * Agenda (requests): the form's addresses on the front page.
 *
 * The contact form is Agenda's form `contatti` (tools/agenda/contatti.json), hosted by the
 * home page; the theme draws it. Where a request's email goes is Agenda's own business:
 * its setting, then the site admin's address.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

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
