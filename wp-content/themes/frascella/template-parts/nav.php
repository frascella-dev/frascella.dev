<?php
/**
 * The header: the name, the menu (Appearance → Menus, one per language with Polylang),
 * and the languages. No JavaScript: a menu of a few links is a list of links.
 */

defined('ABSPATH') || exit;

$languages = frascella_alternates();
?>
<header class="site-header">
    <div class="site-header-inner">
        <a class="site-name" href="<?= esc_url(frascella_home_url()) ?>"><?= frascella_e(frascella_who()['name']) ?></a>
        <?php if (has_nav_menu('primary')) : ?>
            <nav class="site-nav" aria-label="<?= esc_attr(frascella_s('nav.menu')) ?>">
                <?php wp_nav_menu(['theme_location' => 'primary', 'container' => false, 'menu_class' => 'site-nav-list', 'depth' => 1, 'fallback_cb' => false]); ?>
            </nav>
        <?php endif; ?>
        <?php if (count($languages) > 1) : ?>
            <nav class="site-languages" aria-label="<?= esc_attr(frascella_s('nav.languages')) ?>">
                <ul>
                    <?php foreach ($languages as $language) : ?>
                        <li>
                            <a href="<?= esc_url($language['url']) ?>" hreflang="<?= esc_attr($language['hreflang']) ?>" lang="<?= esc_attr($language['hreflang']) ?>"<?= $language['current'] ? ' aria-current="true"' : '' ?>>
                                <?= frascella_e(strtoupper($language['locale'])) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </nav>
        <?php endif; ?>
    </div>
</header>
