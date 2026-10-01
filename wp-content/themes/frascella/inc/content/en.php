<?php

/**
 * English, over the Italian tree.
 *
 * array_replace is shallow: each top-level key overridden here replaces the whole Italian
 * subtree, so every key of a section is reproduced.
 *
 * The words are the owner's (COPY.en.md), written separately from the Italian ones: a line
 * says the same thing, not the same words.
 */

declare(strict_types=1);

$base = require __DIR__ . '/it.php';

return array_replace($base, [
    'htmlLang' => 'en',
    'ogLocale' => 'en_GB',
    'endonym' => 'English',

    'meta' => [
        'title' => 'Emanuele Frascella · Freelance software engineer, Taranto',
        'description' => 'Freelance software engineer in Taranto, Italy, also working remotely. Web platforms, apps, and integrations with AI and agents for companies, agencies and startups.',
    ],

    'schema' => [
        'jobTitle' => 'Freelance software engineer',
    ],

    'nav' => [
        'skip' => 'Skip to content',
        'menu' => 'main',
        'drawer' => 'menu',
        'languages' => 'Language',
        'logo' => 'frascella.dev, back to top',
        'brand' => 'frascella.dev',
        'sound' => 'audio',
        'soundOn' => 'on',
        'soundOff' => 'off',
        'soundLabel' => 'audio: vinyl crackle',
        'cta' => 'contact',
        'ctaAnchor' => '#contact',
        'open' => 'menu',
        'close' => 'close',
    ],

    'desk' => [
        'label' => 'the desk',
        'controls' => 'desk objects',
        'cue' => 'scroll',
        'lamp' => 'lamp light:',
        'lampFull' => 'full',
        'turntable' => 'record player: vinyl crackle',
        'turntableShort' => 'record player',
        'mug' => 'mug: make it wobble',
        'mugShort' => 'mug',
        'plant' => 'plant: make it sparkle',
        'plantShort' => 'plant',
        'phone' => 'phone: crack the screen',
        'phoneShort' => 'phone',
        'pad' => 'tablet: draw',
        'padShort' => 'tablet',
        'padHint' => 'Draw on the tablet screen. Press "done" or Esc to go back.',
    ],

    'works' => [
        'empty' => 'No projects yet: they are added in Portfolio → Projects.',
    ],

    'footer' => [
        'role' => fn (array $who): string => $who['city'] !== '' ? "Freelance software engineer · {$who['city']}, CET" : 'Freelance software engineer · CET',
        'legal' => fn (array $who): string => '© ' . gmdate('Y') . " {$who['name']}" . ($who['vat'] !== '' ? " · VAT no. {$who['vat']}" : ''),
        'index' => 'Index',
        'elsewhere' => 'Elsewhere',
        'github' => 'github',
        'linkedin' => 'linkedin',
        'legalHeading' => 'Legal',
        'privacy' => 'privacy',
        'cookie' => 'cookies',
        'cookieAnchor' => 'cookies',
    ],

    'notFound' => [
        'title' => 'This page is not here',
        'back' => 'Back to the home page',
    ],
]);
