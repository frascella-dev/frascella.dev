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
        'title' => 'Emanuele Frascella · Software engineer freelance, Taranto',
        'description' => 'Software engineer freelance a Taranto. Piattaforme web, app e integrazioni con IA e agenti per aziende, agenzie e startup, anche da remoto.',
    ],

    'schema' => [
        'jobTitle' => 'Software engineer freelance',
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
        'soundLabel' => 'audio: fruscio del vinile',
        'cta' => 'scrivimi',
        'ctaAnchor' => '#contatti',
        'open' => 'menu',
        'close' => 'chiudi',
    ],

    // The intermezzo: no visible words, only what a screen reader and a keyboard meet.
    'desk' => [
        'label' => 'la scrivania',
        'controls' => 'oggetti della scrivania',
        'cue' => 'scorri',
        'lamp' => 'luce della lampada:',
        'lampFull' => 'piena',
        'turntable' => 'giradischi: fruscio del vinile',
        'turntableShort' => 'giradischi',
        'mug' => 'tazza: fai ondeggiare',
        'mugShort' => 'tazza',
        'plant' => 'pianta: fai scintillare',
        'plantShort' => 'pianta',
        'phone' => 'telefono: incrina lo schermo',
        'phoneShort' => 'telefono',
        'pad' => 'tablet: disegna',
        'padShort' => 'tablet',
        'padHint' => 'Disegna sullo schermo del tablet. Premi «fatto» o Esc per tornare.',
    ],

    'works' => [
        // Only in Elementor's editor, where an empty widget must still say what it is.
        'empty' => 'Nessun progetto ancora: si aggiungono da Portfolio → Progetti.',
    ],

    'footer' => [
        'role' => fn (array $who): string => $who['city'] !== '' ? "Software engineer freelance · {$who['city']}, CET" : 'Software engineer freelance · CET',
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
