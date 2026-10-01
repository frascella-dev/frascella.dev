<?php
/**
 * The colophon: the mark, who and where, four short lists, the small print.
 *
 * Printed by footer.php when there is no Theme Builder footer, and by the plugin's «Footer»
 * widget inside one. The facts (name, city, VAT number, the profiles) are Settings →
 * frascella.dev: an empty one leaves its line or its link out. The index is the «Primary»
 * menu, the same as the header's.
 *
 * @var array $args tag: the element it opens with (footer, or div inside a Theme Builder footer)
 */

defined('ABSPATH') || exit;

$tag = frascella_part_tag($args ?? [], 'footer');
$facts = function_exists('frascella_facts') ? frascella_facts() : [];
$elsewhere = array_filter([
    'github' => (string) ($facts['github'] ?? ''),
    'linkedin' => (string) ($facts['linkedin'] ?? ''),
]);
$privacy = frascella_privacy_url();
$languages = frascella_alternates();
$arrow = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.5 8.5l5-5M4.5 3.5h4v4"/></svg>';
?>
<<?= $tag ?> class="colophon">
    <div class="colophon-band">
        <div class="colophon-brand">
            <a class="logo" href="<?= esc_url(frascella_home_url()) ?>" aria-label="<?= esc_attr(frascella_s('nav.logo')) ?>">
                <?= frascella_logo_svg() // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- a fixed SVG. ?>
                <span><?= frascella_e(frascella_s('nav.brand')) ?></span>
            </a>
            <p class="colophon-role"><?= frascella_e(frascella_s('footer.role')) ?></p>
        </div>

        <nav class="colophon-list" aria-labelledby="colophon-index">
            <h2 class="colophon-h" id="colophon-index"><?= frascella_e(frascella_s('footer.index')) ?></h2>
            <ul>
                <?php foreach (frascella_menu_links() as $link) : ?>
                    <li><a href="<?= esc_url($link['url']) ?>"><?= frascella_e($link['title']) ?></a></li>
                <?php endforeach; ?>
                <li><a href="<?= esc_url(frascella_cta_url()) ?>"><?= frascella_e(frascella_s('nav.cta')) ?></a></li>
            </ul>
        </nav>

        <?php if ($elsewhere !== []) : ?>
            <nav class="colophon-list" aria-labelledby="colophon-elsewhere">
                <h2 class="colophon-h" id="colophon-elsewhere"><?= frascella_e(frascella_s('footer.elsewhere')) ?></h2>
                <ul>
                    <?php foreach ($elsewhere as $key => $url) : ?>
                        <li><a href="<?= esc_url($url) ?>" rel="me noopener"><?= frascella_e(frascella_s('footer.' . $key)) ?><?= $arrow // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- a fixed SVG. ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </nav>
        <?php endif; ?>

        <?php if ($privacy !== '') : ?>
            <nav class="colophon-list" aria-labelledby="colophon-legal">
                <h2 class="colophon-h" id="colophon-legal"><?= frascella_e(frascella_s('footer.legalHeading')) ?></h2>
                <ul>
                    <li><a href="<?= esc_url($privacy) ?>"><?= frascella_e(frascella_s('footer.privacy')) ?></a></li>
                    <li><a href="<?= esc_url($privacy . '#' . frascella_s('footer.cookieAnchor')) ?>"><?= frascella_e(frascella_s('footer.cookie')) ?></a></li>
                </ul>
            </nav>
        <?php endif; ?>

        <?php if (count($languages) > 1) : ?>
            <nav class="colophon-list" aria-labelledby="colophon-languages">
                <h2 class="colophon-h" id="colophon-languages"><?= frascella_e(frascella_s('nav.languages')) ?></h2>
                <ul>
                    <?php foreach ($languages as $language) : ?>
                        <li><a href="<?= esc_url($language['url']) ?>" lang="<?= esc_attr($language['hreflang']) ?>" hreflang="<?= esc_attr($language['hreflang']) ?>"<?= $language['current'] ? ' aria-current="page"' : '' ?>><?= frascella_e($language['endonym']) ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </nav>
        <?php endif; ?>

        <p class="colophon-legal"><?= frascella_e(frascella_s('footer.legal')) ?></p>
    </div>
</<?= $tag ?>>
