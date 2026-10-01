<?php
/**
 * The header: the mark, the menu, the record's switch, the other language, «scrivimi»;
 * on a phone, «menu» and the drawer it opens (lib/header.ts).
 *
 * Printed by header.php when there is no Theme Builder header, and by the plugin's «Header»
 * widget inside one — the same markup either way. The menu is Appearance → Menus («Primary»,
 * one per language); the words are the tree's, or the widget's fields.
 *
 * On a page with the desk (inc/desk.php) it also holds the record's switch `#snd-btn` and
 * the desk's switches for the keyboard (`.scene-ctl`), which the scene drives
 * (assets/src/desk/CONTRACT.md §3).
 *
 * @var array $args tag: the element it opens with (header, or div inside a Theme Builder header)
 */

defined('ABSPATH') || exit;

$tag = frascella_part_tag($args ?? [], 'header');
$links = frascella_menu_links();
$others = array_values(array_filter(frascella_alternates(), static fn (array $l): bool => !$l['current']));
$desk = function_exists('frascella_has_desk') && frascella_has_desk();
$home = frascella_home_url();
?>
<<?= $tag ?> class="top">
    <a class="logo" href="<?= esc_url($home) ?>" aria-label="<?= esc_attr(frascella_s('nav.logo')) ?>">
        <?= frascella_logo_svg() // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- a fixed SVG. ?>
        <span><?= frascella_e(frascella_s('nav.brand')) ?></span>
    </a>

    <nav class="top-nav" aria-label="<?= esc_attr(frascella_s('nav.menu')) ?>">
        <?php if ($links !== []) : ?>
            <ul>
                <?php foreach ($links as $link) : ?>
                    <li><a href="<?= esc_url($link['url']) ?>"><?= frascella_e($link['title']) ?></a></li>
                <?php endforeach; ?>
            </ul>
            <span class="top-divider" aria-hidden="true"></span>
        <?php endif; ?>
        <?php if ($desk) : ?>
            <?php /* Named by its label, which starts with the visible word; on/off is aria-pressed. */ ?>
            <button class="top-sound" id="snd-btn" type="button" aria-pressed="true" aria-label="<?= esc_attr(frascella_s('nav.soundLabel')) ?>">
                <?= frascella_e(frascella_s('nav.sound')) ?>
                <span class="on" aria-hidden="true"><?= frascella_e(frascella_s('nav.soundOn')) ?></span><span class="off" aria-hidden="true"><?= frascella_e(frascella_s('nav.soundOff')) ?></span>
            </button>
        <?php endif; ?>
        <?php foreach ($others as $language) : ?>
            <span class="top-lang"><a href="<?= esc_url($language['url']) ?>" lang="<?= esc_attr($language['hreflang']) ?>" hreflang="<?= esc_attr($language['hreflang']) ?>"><?= frascella_e($language['locale']) ?></a></span>
        <?php endforeach; ?>
        <a class="btn top-cta" href="<?= esc_url(frascella_cta_url()) ?>"><?= frascella_e(frascella_s('nav.cta')) ?></a>
    </nav>

    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-drawer" hidden>
        <span class="open"><?= frascella_e(frascella_s('nav.open')) ?></span><span class="close"><?= frascella_e(frascella_s('nav.close')) ?></span>
    </button>

    <?php if ($desk) : ?>
        <?php /* The desk's switches: off screen until a keyboard reaches them (the mouse uses the desk itself). */ ?>
        <div class="scene-ctl" role="group" aria-label="<?= esc_attr(frascella_s('desk.controls')) ?>">
            <button class="lampbtn" id="lamp-btn" type="button" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 20h8"/><path d="M9 20V12l7-5"/><path d="M13.5 5.2l5 3.4-1 1.5-5-3.4z"/><path class="ray" d="M16.2 12.4l1 2.2M19 11l1.9 1.4"/></svg><span class="sr"><?= frascella_e(frascella_s('desk.lamp')) ?> </span><span class="st" id="lamp-state"><?= frascella_e(frascella_s('desk.lampFull')) ?></span></button>
            <button class="lampbtn" id="tt-btn" type="button" aria-pressed="false" aria-label="<?= esc_attr(frascella_s('desk.turntable')) ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="12" r="7"/><circle cx="10" cy="12" r="1.6"/><path class="ray" d="M19.5 4.5v9l-3 3"/></svg><span class="st" aria-hidden="true"><?= frascella_e(frascella_s('desk.turntableShort')) ?></span></button>
            <button class="lampbtn" id="mug-btn" type="button" aria-label="<?= esc_attr(frascella_s('desk.mug')) ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path class="ray" d="M9 3.5c-.8 1 .8 1.8 0 3M12.5 3.5c-.8 1 .8 1.8 0 3"/></svg><span class="st" aria-hidden="true"><?= frascella_e(frascella_s('desk.mugShort')) ?></span></button>
            <button class="lampbtn" id="plant-btn" type="button" aria-label="<?= esc_attr(frascella_s('desk.plant')) ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 15h11l-1.4 5.5H7.9z"/><path d="M12 15c-1.6-1.8-1.6-4.2 0-6.2 1.6 2 1.6 4.4 0 6.2z"/><path d="M12 15c-2.8 0-4.9-1.5-5.6-4 2.8-.2 4.8 1.3 5.6 4zM12 15c2.8 0 4.9-1.5 5.6-4-2.8-.2-4.8 1.3-5.6 4z"/><path class="ray" d="M17.5 4.5v1.6M16.7 5.3h1.6"/></svg><span class="st" aria-hidden="true"><?= frascella_e(frascella_s('desk.plantShort')) ?></span></button>
            <button class="lampbtn" id="phone-btn" type="button" aria-label="<?= esc_attr(frascella_s('desk.phone')) ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M10.8 5.4h2.4"/><path class="ray" d="M10 11l2 2-1.2 1.6 2.2 2"/></svg><span class="st" aria-hidden="true"><?= frascella_e(frascella_s('desk.phoneShort')) ?></span></button>
            <button class="lampbtn" id="pad-btn" type="button" aria-label="<?= esc_attr(frascella_s('desk.pad')) ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.5 4.5l4 4L9 19H5v-4z"/><path d="M13 7l4 4"/></svg><span class="st" aria-hidden="true"><?= frascella_e(frascella_s('desk.padShort')) ?></span></button>
        </div>
    <?php endif; ?>

    <div class="drawer" id="site-drawer" hidden>
        <nav aria-label="<?= esc_attr(frascella_s('nav.drawer')) ?>">
            <ul class="drawer-list">
                <?php foreach ($links as $link) : ?>
                    <li><a href="<?= esc_url($link['url']) ?>"><?= frascella_e($link['title']) ?></a></li>
                <?php endforeach; ?>
                <li><a href="<?= esc_url(frascella_cta_url()) ?>"><?= frascella_e(frascella_s('nav.cta')) ?></a></li>
            </ul>
            <div class="drawer-row">
                <?php if ($desk) : ?>
                    <button class="top-sound" type="button" aria-pressed="true" aria-label="<?= esc_attr(frascella_s('nav.soundLabel')) ?>" data-sound-mirror>
                        <?= frascella_e(frascella_s('nav.sound')) ?>
                        <span class="on" aria-hidden="true"><?= frascella_e(frascella_s('nav.soundOn')) ?></span><span class="off" aria-hidden="true"><?= frascella_e(frascella_s('nav.soundOff')) ?></span>
                    </button>
                    <span class="top-divider" aria-hidden="true"></span>
                <?php endif; ?>
                <?php foreach ($others as $language) : ?>
                    <a href="<?= esc_url($language['url']) ?>" lang="<?= esc_attr($language['hreflang']) ?>" hreflang="<?= esc_attr($language['hreflang']) ?>"><?= frascella_e($language['locale']) ?></a>
                <?php endforeach; ?>
            </div>
        </nav>
        <div class="drawer-legal">
            <p><?= frascella_e(frascella_s('footer.role')) ?></p>
            <p><?= frascella_e(frascella_s('footer.legal')) ?></p>
        </div>
    </div>
</<?= $tag ?>>
