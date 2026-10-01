<?php

/**
 * English, over the Italian tree.
 *
 * array_replace is shallow: each top-level key overridden here replaces the whole Italian
 * subtree, so every key of a section is reproduced.
 *
 * TODO(en): the English words are written separately from the Italian ones, once the
 * Italian copy (COPY.md) is approved — not translated word for word. Until then every
 * section below repeats the Italian words as placeholders, in the structure the English
 * will fill; only the language's own settings and the template's few English words are
 * final.
 */

declare(strict_types=1);

$base = require __DIR__ . '/it.php';

return array_replace($base, [
    'htmlLang' => 'en',
    'ogLocale' => 'en_GB',
    'endonym' => 'English',

    // TODO(en): placeholder, Italian.
    'meta' => [
        'title' => 'Emanuele Frascella · Software engineer freelance, Taranto',
        'description' => 'Software engineer freelance a Taranto. Piattaforme web, app e integrazioni con IA e agenti per aziende, agenzie e startup, anche da remoto.',
    ],

    'schema' => [
        'jobTitle' => 'Software engineer freelance',
    ],

    // TODO(en): placeholder, Italian (except the skip link, already English).
    'nav' => [
        'skip' => 'Skip to content',
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

    // TODO(en): placeholder, Italian.
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
        'empty' => 'No projects yet: they are added under Projects, in the dashboard.',
    ],

    // TODO(en): placeholder, Italian.
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
        'title' => 'This page is not here',
        'back' => 'Back to the home page',
    ],
]);
