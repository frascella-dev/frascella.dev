<?php

/**
 * Every word the theme says, per language.
 *
 * `inc/content/{locale}.php`, one PHP array per language. The default language's file is
 * complete; every other one `array_replace`s over it, so a key a translation omits falls
 * back instead of printing nothing. The languages are Polylang's: a file per language
 * the site has, and the default language's when a file is missing.
 *
 * **Why a PHP tree and not a .po file.** These sentences are versioned with the markup that
 * arranges them, nobody edits them from a dashboard, and some of them are closures around
 * the business's own facts (`fn (array $who) => "Welcome to {$who['name']}"`), which a
 * gettext string cannot be. Words the site's editors change are Elementor widgets or
 * posts, not this tree; a plugin widget's text field starts from this tree and overrides it
 * (see "Words from Elementor" below).
 *
 * **Interpolate with braces.** PHP identifiers may contain bytes ≥ 0x80, so in "«$title»"
 * the closing guillemet is read as part of the variable's name: the string comes out
 * truncated, with a warning in the log and nothing on screen. `{$title}`, always.
 * To check:  grep -rnP '\$[A-Za-z_]\w*[\x80-\xFF]' inc/
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** The language the default content file is written in. */
const FRASCELLA_CONTENT_DEFAULT = 'it';

/** This request's language: Polylang's, then the site's locale, then the default. */
function frascella_locale(): string
{
    $lang = function_exists('pll_current_language') ? (string) pll_current_language('slug') : '';
    if ($lang === '') {
        $lang = substr((string) get_locale(), 0, 2);
    }

    return is_file(FRASCELLA_THEME_DIR . "/inc/content/$lang.php") ? $lang : FRASCELLA_CONTENT_DEFAULT;
}

/**
 * The tree for a language, loaded once.
 *
 * @return array<string, mixed>
 */
function frascella_tree(?string $locale = null): array
{
    static $trees = [];
    $locale ??= frascella_locale();
    if (!is_file(FRASCELLA_THEME_DIR . "/inc/content/$locale.php")) {
        $locale = FRASCELLA_CONTENT_DEFAULT;
    }
    if (!isset($trees[$locale])) {
        $tree = require FRASCELLA_THEME_DIR . "/inc/content/$locale.php";
        $trees[$locale] = is_array($tree) ? $tree : [];
    }

    return $trees[$locale];
}

/**
 * One entry of the tree, raw: a string, a list, or a closure. A path is dotted:
 * `contact.heading`.
 */
function frascella_t(string $path, mixed $fallback = ''): mixed
{
    $node = frascella_tree();
    $found = true;
    foreach (explode('.', $path) as $key) {
        if (!is_array($node) || !array_key_exists($key, $node)) {
            $found = false;
            break;
        }
        $node = $node[$key];
    }

    // What the Elementor widget rendering now has typed, over the tree.
    $over = frascella_text_overrides();
    if ($over !== []) {
        if (array_key_exists($path, $over)) {
            return frascella_text_adapt($found ? $node : null, $over[$path]);
        }
        $prefix = $path . '.';
        foreach ($over as $p => $value) {
            if ($found && is_array($node) && str_starts_with($p, $prefix)) {
                $node = frascella_text_set($node, explode('.', substr($p, strlen($prefix))), $value);
            }
        }
    }

    return $found ? $node : $fallback;
}

/** One entry as a string: a closure is called with the business's facts (frascella_who()). */
function frascella_s(string $path, string $fallback = ''): string
{
    $value = frascella_t($path, $fallback);
    if ($value instanceof Closure) {
        $value = $value(frascella_who());
    }

    return is_string($value) ? $value : $fallback;
}

/**
 * The facts a sentence may wrap itself around: the plugin's (Settings → frascella.dev), or the
 * site's name alone when the plugin is off. Every closure in the tree takes this shape,
 * so a sentence naming the business names whichever business this install belongs to.
 *
 * @return array<string, string>
 */
function frascella_who(): array
{
    $facts = function_exists('frascella_facts') ? frascella_facts() : [];

    return [
        'name' => (string) ($facts['name'] ?? '') ?: wp_specialchars_decode((string) get_bloginfo('name'), ENT_QUOTES),
        'city' => (string) ($facts['city'] ?? ''),
        'street' => (string) ($facts['street'] ?? ''),
        'phone' => (string) ($facts['phone'] ?? ''),
        'email' => (string) ($facts['email'] ?? ''),
        'vat' => (string) ($facts['vat'] ?? ''),
    ];
}

/** The `<html lang>` of this language, from its own tree. */
function frascella_html_lang(): string
{
    return (string) (frascella_tree()['htmlLang'] ?? 'it-IT');
}

/*
 * Words from Elementor.
 *
 * Every sentence a plugin widget prints is a field of it. While the widget renders, what
 * was typed sits on a stack, keyed by the tree path it replaces (`contact.heading`), and
 * frascella_t() answers from it before the tree. An empty field is not on the stack, so it says
 * what the tree says in the page's language — which is also what the field shows.
 *
 * A typed sentence takes placeholders for the facts: {name}, {city}, {street}, {phone},
 * {email}. A list of paragraphs takes a blank line between them.
 */

/** @param array<string, mixed> $texts path => value */
function frascella_text_push(array $texts): void
{
    $GLOBALS['frascella_text_stack'][] = $texts;
}

function frascella_text_pop(): void
{
    array_pop($GLOBALS['frascella_text_stack']);
}

/** @return array<string, mixed> the texts of the widgets rendering now, the innermost last */
function frascella_text_overrides(): array
{
    $stack = $GLOBALS['frascella_text_stack'] ?? [];

    return $stack === [] ? [] : array_merge(...$stack);
}

/** A typed sentence with the facts put in. */
function frascella_text_fill(string $text): string
{
    $pairs = [];
    foreach (frascella_who() as $key => $value) {
        $pairs['{' . $key . '}'] = $value;
    }

    return strtr($text, $pairs);
}

/** Paragraphs: a blank line between them. @return list<string> */
function frascella_text_paragraphs(string $text): array
{
    return array_values(array_filter(array_map('trim', preg_split('/\R\s*\R/', frascella_text_fill($text)) ?: []), static fn (string $p): bool => $p !== ''));
}

/** A typed value in the shape the template expects from the tree. */
function frascella_text_adapt(mixed $original, mixed $value): mixed
{
    if (!is_string($value)) {
        return $value;
    }
    if ($original instanceof Closure) {
        $returns = (string) (new ReflectionFunction($original))->getReturnType();

        return $returns === 'array'
            ? static fn (mixed ...$args): array => frascella_text_paragraphs($value)
            : static fn (mixed ...$args): string => frascella_text_fill($value);
    }
    if (is_array($original) && array_is_list($original)) {
        return frascella_text_paragraphs($value);
    }

    return frascella_text_fill($value);
}

/** @param list<string> $keys */
function frascella_text_set(array $node, array $keys, mixed $value): array
{
    $key = array_shift($keys);
    if ($keys === []) {
        $node[$key] = frascella_text_adapt($node[$key] ?? null, $value);
    } elseif (isset($node[$key]) && is_array($node[$key])) {
        $node[$key] = frascella_text_set($node[$key], $keys, $value);
    }

    return $node;
}
