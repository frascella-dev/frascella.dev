<?php

/**
 * The widgets, as data: what each one prints and the few things it lets the editor choose.
 *
 * Deliberately few. Every control here answers "which content", never "how should it
 * look" — the second question is the stylesheet's, and a widget that offered it would be a
 * second way to style something already styled. A section that is only words and pictures
 * is not here at all: it is built from Elementor's own widgets (docs/guidelines/04-elementor.md).
 *
 * A spec:
 *   'title'    the name in the panel
 *   'icon'     an eicon
 *   'part'     the theme's template part it prints (template-parts/{part}.php)
 *   'entry'    the theme's Vite entry a page holding it needs (inc/assets.php)
 *   'keywords' what the panel search finds it by
 *   'controls' Elementor controls, name => definition; `options` may be a callable. Control
 *              types as strings ('switcher', 'select', 'media'…), not Controls_Manager
 *              constants: the theme reads the spec on every page, Elementor loaded or not
 *   'texts'    tree path => [label, type]: every sentence the part prints, as a field
 *              t = one line, no markup · h = one line, <em>/<strong>/<br> allowed
 *              a = a few lines · p = paragraphs, a blank line between them
 *   'note'     what the Texts panel says
 *
 * Adding a widget: a spec here, a one-line class in widgets.php, the part in the theme,
 * the words in the theme's inc/content/*.php. The .claude/skills/elementor-widget skill
 * walks through it.
 *
 * @return array<string, array<string, mixed>>
 */
function frascella_elementor_sections(): array
{
    return [
        'contact' => [
            'title' => __('Contact card', 'frascella'),
            'icon' => 'eicon-call-to-action',
            'part' => 'contact',
            'entry' => 'site',
            'keywords' => ['contact', 'phone', 'email'],
            'controls' => [
                'show_phone' => [
                    'label' => __('Show the telephone', 'frascella'),
                    'type' => 'switcher',
                    'return_value' => 'yes',
                    'default' => 'yes',
                ],
                'show_email' => [
                    'label' => __('Show the email', 'frascella'),
                    'type' => 'switcher',
                    'return_value' => 'yes',
                    'default' => 'yes',
                ],
            ],
            'texts' => [
                'contact.eyebrow' => [__('Eyebrow', 'frascella'), 't'],
                'contact.heading' => [__('Heading', 'frascella'), 'h'],
                'contact.lede' => [__('Sentence under it', 'frascella'), 'a'],
                'contact.call' => [__('Telephone button', 'frascella'), 't'],
                'contact.write' => [__('Email button', 'frascella'), 't'],
            ],
        ],
    ];
}

/**
 * The widget classes, in the order of the panel: one per spec, named after its key
 * (`contact` → Frascella_Section_Contact, `opening-hours` → Frascella_Section_OpeningHours).
 *
 * @return list<class-string>
 */
function frascella_elementor_widgets(): array
{
    return array_map(
        static fn (string $key): string => 'Frascella_Section_' . str_replace(' ', '', ucwords(str_replace('-', ' ', $key))),
        array_keys(frascella_elementor_sections()),
    );
}

/* The words, as fields ------------------------------------------------------------------ */

/** A tree path as a control's name: `contact.heading` → `t__contact__heading`. */
function frascella_elementor_text_key(string $path): string
{
    return 't__' . str_replace('.', '__', $path);
}

/**
 * The language a field's words start from: the document being edited in Elementor, or
 * the page being read.
 */
function frascella_elementor_locale(): string
{
    // phpcs:disable WordPress.Security.NonceVerification -- which document is open; nothing is changed.
    $id = (int) ($_GET['post'] ?? $_GET['elementor-preview'] ?? $_POST['editor_post_id'] ?? $_POST['initial_document_id'] ?? 0);
    // phpcs:enable WordPress.Security.NonceVerification
    // A Theme Builder document says its language itself (languages.php).
    $own = $id > 0 ? (string) get_post_meta($id, '_frascella_lang', true) : '';
    if ($own !== '') {
        return $own;
    }
    if ($id > 0 && function_exists('pll_get_post_language')) {
        $lang = (string) pll_get_post_language($id);
        if ($lang !== '') {
            return $lang;
        }
    }

    return function_exists('frascella_locale') ? frascella_locale() : '';
}

/** The site's own words for a path, as the field shows them. */
function frascella_elementor_text_default(string $path): string
{
    if (!function_exists('frascella_tree')) {
        return '';
    }
    $node = frascella_tree(frascella_elementor_locale() ?: null);
    foreach (explode('.', $path) as $key) {
        if (!is_array($node) || !array_key_exists($key, $node)) {
            return '';
        }
        $node = $node[$key];
    }
    if ($node instanceof Closure) {
        $node = $node(frascella_who());
    }
    if (is_array($node) && array_is_list($node)) {
        return implode("\n\n", array_map('strval', $node));
    }

    return is_string($node) ? $node : '';
}

/** One field on a widget. */
function frascella_elementor_text_control(\Elementor\Widget_Base $widget, string $path, string $label, string $type): void
{
    $widget->add_control(frascella_elementor_text_key($path), [
        'label' => $label,
        'type' => in_array($type, ['t', 'h'], true) ? \Elementor\Controls_Manager::TEXT : \Elementor\Controls_Manager::TEXTAREA,
        'rows' => $type === 'p' ? 8 : 3,
        'default' => frascella_elementor_text_default($path),
        'label_block' => true,
        'description' => $type === 'p' ? __('A blank line between one paragraph and the next.', 'frascella') : '',
    ]);
}

/**
 * A widget's fields as tree paths and values, cleaned. An empty field is left out, so the
 * tree answers for it in the page's language.
 *
 * @return array<string, string>
 */
function frascella_elementor_texts(array $texts, array $settings): array
{
    $inline = ['em' => [], 'strong' => [], 'br' => [], 'a' => ['href' => true]];
    $out = [];
    foreach ($texts as $path => [$label, $type]) {
        $value = (string) ($settings[frascella_elementor_text_key((string) $path)] ?? '');
        if (trim($value) !== '') {
            $out[(string) $path] = wp_kses($value, $type === 't' ? [] : $inline);
        }
    }

    return $out;
}
