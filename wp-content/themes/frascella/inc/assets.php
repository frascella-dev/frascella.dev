<?php

/**
 * The Vite manifest, and the enqueue: one bundle per kind of page.
 *
 * Each entry in assets/src/entries imports its own stylesheet; the CSS is enqueued as a
 * `<link>` independently of the `<script>`, so a page is styled whether or not the
 * JavaScript runs.
 *
 * **The manifest is required and fails loudly.** A silent fallback to an unhashed guess is
 * the failure mode where the site looks fine on the machine that built it and ships
 * without a stylesheet — so a missing manifest is an admin notice and a bare page, never
 * a half-styled one nobody notices.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

const FRASCELLA_DIST = '/assets/dist';
const FRASCELLA_MANIFEST = '/assets/dist/.vite/manifest.json';

/** @return array<string, array<string, mixed>> */
function frascella_manifest(): array
{
    static $manifest = null;
    if ($manifest === null) {
        $file = FRASCELLA_THEME_DIR . FRASCELLA_MANIFEST;
        $decoded = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
        $manifest = is_array($decoded) ? $decoded : [];
    }

    return $manifest;
}

/** @return array<string, mixed>|null */
function frascella_chunk(string $entry): ?array
{
    $chunk = frascella_manifest()['assets/src/entries/' . $entry . '.ts'] ?? null;

    return is_array($chunk) && isset($chunk['file']) ? $chunk : null;
}

function frascella_dist_url(string $file): string
{
    return FRASCELLA_THEME_URI . FRASCELLA_DIST . '/' . ltrim($file, '/');
}

/**
 * The stylesheets one entry needs, in Vite's order: the chunk's own CSS, then that of
 * everything it imports, depth-first.
 *
 * @return list<string>
 */
function frascella_entry_styles(string $entry): array
{
    $chunk = frascella_chunk($entry);
    if ($chunk === null) {
        return [];
    }
    $css = [];
    $walk = static function (array $node) use (&$walk, &$css): void {
        foreach ($node['css'] ?? [] as $file) {
            $css[] = $file;
        }
        foreach ($node['imports'] ?? [] as $key) {
            $imported = frascella_manifest()[$key] ?? null;
            if (is_array($imported)) {
                $walk($imported);
            }
        }
    };
    $walk($chunk);

    return array_values(array_unique($css));
}

/**
 * The shared chunks an entry imports, for `modulepreload`: without them the browser learns
 * about the second file only after parsing the first.
 *
 * @return list<string>
 */
function frascella_entry_preloads(string $entry): array
{
    $chunk = frascella_chunk($entry);
    if ($chunk === null) {
        return [];
    }
    $seen = [];
    $walk = static function (array $node) use (&$walk, &$seen): void {
        foreach ($node['imports'] ?? [] as $key) {
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $imported = frascella_manifest()[$key] ?? null;
                if (is_array($imported)) {
                    $walk($imported);
                }
            }
        }
    };
    $walk($chunk);

    return array_values(array_filter(array_map(
        static fn (string $key): string => (string) (frascella_manifest()[$key]['file'] ?? ''),
        array_keys($seen),
    )));
}

/**
 * Which entry this request is.
 *
 * One per kind of page, so each page downloads only what it needs. A page built in
 * Elementor with one of the plugin's widgets on it gets the entry that widget declares
 * (`'entry' => 'site'` in its spec): the list comes from the spec, never from a list of
 * names kept here, which is how such lists go stale.
 */
function frascella_entry(): string
{
    $entry = (string) apply_filters('frascella_entry', '');
    if ($entry !== '') {
        return $entry;
    }
    if (is_front_page()) {
        return 'site';
    }
    if (is_singular() || is_singular('elementor_library')) {
        $needed = frascella_entry_for_document((int) get_queried_object_id());
        if ($needed !== '') {
            return $needed;
        }
    }

    // Everything else is a document: a page of prose, the privacy notice, the 404.
    return 'doc';
}

/** The entry a document's widgets ask for, or '' when none of them asks. */
function frascella_entry_for_document(int $id): string
{
    if ($id <= 0 || !function_exists('frascella_elementor_sections')) {
        return '';
    }
    $data = (string) get_post_meta($id, '_elementor_data', true);
    if ($data === '') {
        return '';
    }
    foreach (frascella_elementor_sections() as $key => $spec) {
        if (!empty($spec['entry']) && str_contains($data, '"widgetType":"frascella-' . $key . '"')) {
            return (string) $spec['entry'];
        }
    }

    return '';
}

/**
 * The entries this request loads: the page's own, then any a page needs next to it — the
 * desk scene (`desk`) where the stage is printed (inc/desk.php). Its own entry, so a page
 * without the desk never downloads it.
 *
 * @return list<string>
 */
function frascella_entries(): array
{
    $entries = [frascella_entry()];
    if (function_exists('frascella_has_desk') && frascella_has_desk() && frascella_chunk('desk') !== null) {
        $entries[] = 'desk';
    }

    return $entries;
}

add_action('wp_enqueue_scripts', static function (): void {
    // After Elementor's stylesheets and the plugin's corrections to them (frascella-elementor),
    // so that a native widget carrying one of this theme's classes is dressed by the class.
    $after = wp_style_is('frascella-elementor', 'registered') ? ['frascella-elementor'] : [];
    foreach (frascella_entries() as $entry) {
        $chunk = frascella_chunk($entry);
        if ($chunk === null) {
            continue;
        }
        foreach (frascella_entry_styles($entry) as $i => $file) {
            wp_enqueue_style("frascella-$entry-$i", frascella_dist_url($file), $i === 0 ? $after : [], null);
        }
        wp_enqueue_script("frascella-$entry", frascella_dist_url((string) $chunk['file']), [], null, [
            'strategy' => 'defer',
            'in_footer' => true,
        ]);
    }
}, 10);

/**
 * `type="module"`, which wp_enqueue_script() has no flag for.
 *
 * Only the tag with a `src`: `$tag` also holds the inline scripts wp_add_inline_script()
 * puts before and after it, and rewriting the whole string would turn those into modules
 * too — they would run late, after the code that reads them.
 */
add_filter('script_loader_tag', static function (string $tag, string $handle): string {
    if (!str_starts_with($handle, 'frascella-')) {
        return $tag;
    }

    return (string) preg_replace('#<script(?![^>]*\btype=)(?=[^>]*\bsrc=)#', '<script type="module"', $tag, 1);
}, 10, 2);

add_action('wp_head', static function (): void {
    foreach (frascella_entry_preloads(frascella_entry()) as $file) {
        printf('<link rel="modulepreload" href="%s" />' . "\n", esc_url(frascella_dist_url($file)));
    }
    // The desk's scene chunks (three.js among them), which its entry imports after the first
    // paint: fetched early and at low priority, so they download while the page renders and
    // never compete with the stylesheet, the fonts or the text that is the LCP
    // (assets/src/desk/CONTRACT.md §1).
    if (in_array('desk', frascella_entries(), true)) {
        foreach (frascella_dynamic_preloads('desk') as $file) {
            printf('<link rel="modulepreload" href="%s" fetchpriority="low" />' . "\n", esc_url(frascella_dist_url($file)));
        }
    }
}, 6);

/**
 * The chunks an entry imports dynamically, and what those import in turn, depth-first.
 *
 * @return list<string>
 */
function frascella_dynamic_preloads(string $entry): array
{
    $chunk = frascella_chunk($entry);
    if ($chunk === null) {
        return [];
    }
    $seen = [];
    $walk = static function (string $key) use (&$walk, &$seen): void {
        if (isset($seen[$key])) {
            return;
        }
        $seen[$key] = true;
        foreach ((array) (frascella_manifest()[$key]['imports'] ?? []) as $next) {
            $walk((string) $next);
        }
    };
    foreach ((array) ($chunk['dynamicImports'] ?? []) as $key) {
        $walk((string) $key);
    }
    $own = array_flip(frascella_entry_preloads($entry));

    return array_values(array_filter(array_map(
        static fn (string $key): string => (string) (frascella_manifest()[$key]['file'] ?? ''),
        array_keys($seen),
    ), static fn (string $file): bool => $file !== '' && !isset($own[$file])));
}

/** A built theme is a built theme: say so where somebody can act on it. */
add_action('admin_notices', static function (): void {
    if (frascella_manifest() !== [] || !current_user_can('switch_themes')) {
        return;
    }
    printf(
        '<div class="notice notice-error"><p>%s</p></div>',
        esc_html__('The frascella.dev theme is not built: run `npm run build` in its folder. Without assets/dist the site has no stylesheet.', 'frascella'),
    );
});
