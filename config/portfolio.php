<?php

/*
|--------------------------------------------------------------------------
| Portfolio content
|--------------------------------------------------------------------------
|
| Hard-coded source of truth for the public Portfolio page (timeline +
| projects). Both lists were previously stored in the database; rather
| than maintain admin CRUD for content that turns over rarely, we keep
| them here in version control.
|
| Edit, deploy. The Portfolio controller consumes these arrays as-is —
| just append new entries to the bottom and they'll show up.
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Timeline
    |--------------------------------------------------------------------------
    | Each entry shape:
    |   [
    |       'year'  => 2024,
    |       'kind'  => 'work',          // life | code | work | now | study | travel
    |       'title' => 'Headline…',
    |       'body'  => 'Longer copy…',
    |       'pictures' => [             // optional
    |           ['url' => '/img/x.jpg', 'alt' => '…', 'width' => 800, 'height' => 600],
    |       ],
    |   ],
    |
    | Order is significant — the page renders entries in the order they appear
    | here. The controller computes a `fraction` for each entry to drive the
    | spline placement; you don't need to set it manually.
    */
    'timeline' => [
        // append entries here
    ],

    /*
    |--------------------------------------------------------------------------
    | Projects
    |--------------------------------------------------------------------------
    | Each project shape:
    |   [
    |       'slug'    => 'unique-slug',
    |       'title'   => 'Project title',
    |       'tagline' => 'One-liner for the Work card',
    |       'year'    => 2024,
    |       'client'  => 'Acme Co.',
    |       'role'    => 'Lead engineer',
    |       'tone'    => 'paper',       // ink | paper | accent | outline
    |       'stack'   => ['Laravel', 'React', 'PostgreSQL'],
    |       'metric'  => ['n' => '3.2×', 'l' => 'checkout completion'],
    |       'preview' => [
    |           'url'    => '/img/preview.jpg',
    |           'alt'    => '…',
    |           'width'  => 1200,
    |           'height' => 800,
    |       ],
    |   ],
    |
    | The Work grid shows the first {@see PortfolioController::PROJECT_LIMIT}
    | entries — order matters.
    */
    'projects' => [
        // append projects here
    ],
];
