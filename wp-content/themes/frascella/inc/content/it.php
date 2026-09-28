<?php

/**
 * Italian: the default language, and so the complete tree.
 *
 * Every other language's file `array_replace`s over this one. The replace is **shallow**:
 * a top-level key a translation overrides replaces its whole subtree, so a translated
 * section reproduces every key of its Italian one.
 *
 * Closures take the facts (`frascella_who()`) and interpolate with braces: `{$who['name']}`.
 */

declare(strict_types=1);

return [
    'htmlLang' => 'it-IT',
    'ogLocale' => 'it_IT',
    'endonym' => 'Italiano',

    'meta' => [
        'title' => fn (array $who): string => $who['city'] !== '' ? "{$who['name']} - {$who['city']}" : $who['name'],
        'description' => fn (array $who): string => "Il sito di {$who['name']}.",
    ],

    'nav' => [
        'skip' => 'Vai al contenuto',
        'menu' => 'Menu principale',
        'languages' => 'Lingua',
    ],

    // The example widget's words (plugin: inc/elementor/sections.php, «contact»). Each
    // one is also a field of the widget, and starts from what is written here.
    'contact' => [
        'eyebrow' => 'Contatti',
        'heading' => fn (array $who): string => "Scrivi a {$who['name']}",
        'lede' => 'Rispondiamo entro un giorno lavorativo.',
        'call' => 'Chiama',
        'write' => 'Scrivi',
    ],

    'footer' => [
        'privacy' => 'Privacy',
        'rights' => fn (array $who): string => '© ' . gmdate('Y') . " {$who['name']}",
    ],

    'notFound' => [
        'title' => 'Questa pagina non c’è',
        'back' => 'Torna alla home',
    ],
];
