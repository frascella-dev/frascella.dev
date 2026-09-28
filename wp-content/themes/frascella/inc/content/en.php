<?php

/**
 * English, over the Italian tree.
 *
 * array_replace is shallow: each top-level key overridden here replaces the whole Italian
 * subtree, so every key of a section is reproduced.
 */

declare(strict_types=1);

$base = require __DIR__ . '/it.php';

return array_replace($base, [
    'htmlLang' => 'en',
    'ogLocale' => 'en_GB',
    'endonym' => 'English',

    'meta' => [
        'title' => fn (array $who): string => $who['city'] !== '' ? "{$who['name']} - {$who['city']}" : $who['name'],
        'description' => fn (array $who): string => "The website of {$who['name']}.",
    ],

    'nav' => [
        'skip' => 'Skip to content',
        'menu' => 'Main menu',
        'languages' => 'Language',
    ],

    'contact' => [
        'eyebrow' => 'Contact',
        'heading' => fn (array $who): string => "Write to {$who['name']}",
        'lede' => 'We answer within one working day.',
        'call' => 'Call',
        'write' => 'Write',
    ],

    'footer' => [
        'privacy' => 'Privacy',
        'rights' => fn (array $who): string => '© ' . gmdate('Y') . " {$who['name']}",
    ],

    'notFound' => [
        'title' => 'This page is not here',
        'back' => 'Back to the home page',
    ],
]);
