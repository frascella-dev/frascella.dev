<?php

/**
 * The widgets: one base class with all the behaviour, and one subclass per spec holding a
 * single constant.
 *
 * **It has to be a class each.** Elementor does not keep the instance that was registered:
 * when it renders a document it reads the element's `widgetType`, looks up the registered
 * widget and does `new $class($element_data, $args)`. A single class parameterised through
 * its constructor is rebuilt without its parameters — a TypeError on the first render, and
 * nothing at all in the editor. Everything that varies is data, in sections.php.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

abstract class Frascella_Section extends \Elementor\Widget_Base
{
    /** The key into frascella_elementor_sections(). */
    protected const SECTION = '';

    /** @return array<string, mixed> */
    protected function spec(): array
    {
        return frascella_elementor_sections()[static::SECTION] ?? [];
    }

    public function get_name(): string
    {
        return 'frascella-' . static::SECTION;
    }

    public function get_title(): string
    {
        return (string) ($this->spec()['title'] ?? static::SECTION);
    }

    public function get_icon(): string
    {
        return (string) ($this->spec()['icon'] ?? 'eicon-text');
    }

    public function get_categories(): array
    {
        return ['frascella'];
    }

    public function get_keywords(): array
    {
        return array_merge(['frascella'], (array) ($this->spec()['keywords'] ?? []));
    }

    /**
     * No stylesheet of its own: the section's rules are in the page's bundle, and a
     * dependency here would make Elementor load a second copy.
     */
    public function get_style_depends(): array
    {
        return [];
    }

    protected function register_controls(): void
    {
        $spec = $this->spec();
        $controls = (array) ($spec['controls'] ?? []);
        $texts = (array) ($spec['texts'] ?? []);

        if ($controls !== []) {
            $this->start_controls_section('frascella_content', ['label' => __('Content', 'frascella')]);
            // A widget with no Texts section says what it is here instead.
            if ($texts === [] && !empty($spec['note'])) {
                $this->add_control('frascella_content_note', [
                    'type' => \Elementor\Controls_Manager::RAW_HTML,
                    'raw' => '<p class="elementor-descriptor">' . esc_html((string) $spec['note']) . '</p>',
                ]);
            }
            foreach ($controls as $name => $control) {
                // A select's options can be a list that exists only at runtime (the posts of
                // a type, say), so they may arrive as a callable.
                if (isset($control['options']) && is_callable($control['options'])) {
                    $control['options'] = ($control['options'])();
                }
                $this->add_control($name, $control);
            }
            $this->end_controls_section();
        }

        if ($texts !== []) {
            $this->start_controls_section('frascella_texts', ['label' => __('Texts', 'frascella')]);
            $this->add_control('frascella_texts_note', [
                'type' => \Elementor\Controls_Manager::RAW_HTML,
                'raw' => '<p class="elementor-descriptor">' . esc_html((string) ($spec['note'] ?? __('Each field starts from the site’s words in this language; empty, it says them. {name}, {city}, {street}, {phone} and {email} become the facts in Settings → frascella.dev.', 'frascella'))) . '</p>',
            ]);
            foreach ($texts as $path => [$label, $type]) {
                frascella_elementor_text_control($this, (string) $path, (string) $label, (string) $type);
            }
            $this->end_controls_section();
        }

        if ($controls === [] && $texts === []) {
            // A widget with nothing to choose still gets a panel, so nobody wonders whether
            // the click registered.
            $this->start_controls_section('frascella_about', ['label' => __('Section', 'frascella')]);
            $this->add_control('frascella_note', [
                'type' => \Elementor\Controls_Manager::RAW_HTML,
                'raw' => '<p>' . esc_html((string) ($spec['note'] ?? __('Nothing to set here: the content comes from the site.', 'frascella'))) . '</p>',
            ]);
            $this->end_controls_section();
        }
    }

    /**
     * The part exactly as the theme prints it, with this widget's words over the site's:
     * they sit on the theme's text stack while the part renders (frascella_t()).
     */
    protected function render(): void
    {
        $settings = $this->get_settings_for_display();
        $words = frascella_elementor_texts((array) ($this->spec()['texts'] ?? []), $settings);
        $push = function_exists('frascella_text_push') && $words !== [];
        if ($push) {
            frascella_text_push($words);
        }
        $args = array_merge($settings, (array) ($this->spec()['args'] ?? []));
        get_template_part('template-parts/' . (string) ($this->spec()['part'] ?? static::SECTION), null, $args);
        if ($push) {
            frascella_text_pop();
        }
    }

    /**
     * Nothing renders in the browser. Elementor can draw a widget client-side from a JS
     * template, which would be a second implementation of every part in another language.
     * There is not one, so the editor asks the server — slower to drag, and correct.
     */
    protected function content_template(): void
    {
    }
}

class Frascella_Section_Cut extends Frascella_Section
{
    protected const SECTION = 'cut';
}

class Frascella_Section_Desk extends Frascella_Section
{
    protected const SECTION = 'desk';
}

class Frascella_Section_Works extends Frascella_Section
{
    protected const SECTION = 'works';
}

class Frascella_Section_Header extends Frascella_Section
{
    protected const SECTION = 'header';
}

class Frascella_Section_Footer extends Frascella_Section
{
    protected const SECTION = 'footer';
}
