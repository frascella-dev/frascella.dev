<?php
/**
 * The contact card: the example of a widget with data. The plugin's «Contact card»
 * widget prints this part (with its settings as $args), and so can any template.
 *
 * Every word comes from frascella_s(): the widget's fields when they are filled, the tree in
 * the page's language when they are not. The facts come from Settings → frascella.dev — never typed
 * into the page, so they change in one place.
 *
 * @var array $args the widget's settings: show_phone, show_email
 */

defined('ABSPATH') || exit;

$who = frascella_who();
$showPhone = ($args['show_phone'] ?? 'yes') === 'yes' && $who['phone'] !== '';
$showEmail = ($args['show_email'] ?? 'yes') === 'yes' && $who['email'] !== '';
?>
<section class="sheet contact">
    <div class="measure">
        <p class="eyebrow" <?= frascella_reveal() ?>><?= frascella_e(frascella_s('contact.eyebrow')) ?></p>
        <h2 class="display contact-heading" <?= frascella_reveal(0.08) ?>><?= frascella_html(frascella_s('contact.heading')) ?></h2>
        <p class="contact-lede" <?= frascella_reveal(0.16) ?>><?= frascella_e(frascella_s('contact.lede')) ?></p>
        <?php if ($showPhone || $showEmail) : ?>
            <p class="contact-actions" <?= frascella_reveal(0.24) ?>>
                <?php if ($showPhone) : ?>
                    <a class="btn btn--solid" href="tel:<?= esc_attr((string) preg_replace('/[^0-9+]/', '', $who['phone'])) ?>">
                        <?= frascella_e(frascella_s('contact.call')) ?> <span class="contact-value"><?= frascella_e($who['phone']) ?></span>
                    </a>
                <?php endif; ?>
                <?php if ($showEmail) : ?>
                    <a class="btn btn--quiet" href="mailto:<?= esc_attr($who['email']) ?>">
                        <?= frascella_e(frascella_s('contact.write')) ?> <span class="contact-value"><?= frascella_e($who['email']) ?></span>
                    </a>
                <?php endif; ?>
            </p>
        <?php endif; ?>
    </div>
</section>
