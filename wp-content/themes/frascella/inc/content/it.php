<?php

/**
 * Italian: the default language, and so the complete tree.
 *
 * Every other language's file `array_replace`s over this one. The replace is **shallow**:
 * a top-level key a translation overrides replaces its whole subtree, so a translated
 * section reproduces every key of its Italian one.
 *
 * Closures take the facts (`frascella_who()`) and interpolate with braces: `{$who['name']}`.
 *
 * The words are the owner's (COPY.md, the order of the page). The page's own sections are
 * typed in Elementor, not here; this tree is what the theme says by itself and what the
 * plugin's widgets start from.
 */

declare(strict_types=1);

return [
    'htmlLang' => 'it-IT',
    'ogLocale' => 'it_IT',
    'endonym' => 'Italiano',

    'meta' => [
        'title' => 'Emanuele Frascella · siti WordPress, app e microservizi · Taranto',
        // TODO(owner): COPY.md leaves the description «da scrivere»; this one is put
        // together from the opening's own words until it is written.
        'description' => fn (array $who): string => "Sono {$who['name']}, software engineer freelance a Taranto: siti WordPress, app e microservizi, dal repository al deploy.",
    ],

    'schema' => [
        'jobTitle' => 'Software engineer',
    ],

    'nav' => [
        'skip' => 'Vai al contenuto',
        'menu' => 'principale',
        'drawer' => 'menu',
        'languages' => 'Lingua',
        'logo' => 'frascella.dev, torna all’inizio',
        'brand' => 'frascella.dev',
        'sound' => 'audio',
        'soundOn' => 'on',
        'soundOff' => 'off',
        'soundLabel' => ', fruscio del vinile',
        'cta' => 'scrivimi',
        'ctaAnchor' => '#contatti',
        'open' => 'menu',
        'close' => 'chiudi',
    ],

    // The intermezzo: no visible words, only what a screen reader and a keyboard meet.
    'desk' => [
        'label' => 'la scrivania',
        'group' => 'oggetti della scrivania',
        'controls' => 'oggetti della scrivania',
        'cue' => 'scorri',
        'hs' => [
            'lamp' => 'Lampada: tre intensità di luce',
            'turntable' => 'Giradischi: avvia e ferma il fruscio',
            'mug' => 'Tazza: ondeggia se la tocchi',
            'ipad' => 'Tablet: ci si può disegnare',
            'phone' => 'Telefono: lo schermo si incrina',
            'plant' => 'Pianta: manda qualche scintilla',
        ],
        'lamp' => 'luce della lampada:',
        'lampFull' => 'piena',
        'turntable' => 'giradischi: fruscio del vinile',
        'turntableShort' => 'giradischi',
        'plant' => 'pianta: fai scintillare',
        'plantShort' => 'pianta',
        'phone' => 'telefono: incrina lo schermo',
        'phoneShort' => 'telefono',
        'pad' => 'tablet: disegna',
        'padShort' => 'tablet',
        'padHint' => 'Disegna sullo schermo del tablet. «fatto» o Esc per tornare.',
    ],

    'works' => [
        // Only in Elementor's editor, where an empty widget must still say what it is.
        'empty' => 'Nessun progetto ancora: si aggiungono da Progetti, nel pannello.',
    ],

    'footer' => [
        'role' => fn (array $who): string => $who['city'] !== '' ? "Software engineer · {$who['city']}, CET" : 'Software engineer · CET',
        'legal' => fn (array $who): string => '© ' . gmdate('Y') . " {$who['name']}" . ($who['vat'] !== '' ? " · P. IVA {$who['vat']}" : ''),
        'index' => 'Indice',
        'elsewhere' => 'Altrove',
        'github' => 'github',
        'linkedin' => 'linkedin',
        'legalHeading' => 'Legale',
        'privacy' => 'privacy',
        'cookie' => 'cookie',
        'cookieAnchor' => 'cookie',
    ],

    'notFound' => [
        'title' => 'Questa pagina non c’è',
        'back' => 'Torna alla home',
    ],
];
