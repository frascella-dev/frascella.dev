<?php
/**
 * The footer: the business's facts and the legal links.
 */

defined('ABSPATH') || exit;

$who = frascella_who();
$privacy = frascella_privacy_url();
?>
<footer class="site-footer on-dark">
    <div class="site-footer-inner">
        <p class="site-footer-name"><?= frascella_e($who['name']) ?></p>
        <?php if ($who['street'] !== '' || $who['city'] !== '') : ?>
            <p><?= frascella_e(trim($who['street'] . ', ' . $who['city'], ', ')) ?></p>
        <?php endif; ?>
        <p class="site-footer-legal">
            <span><?= frascella_e(frascella_s('footer.rights')) ?></span>
            <?php if ($privacy !== '') : ?>
                <a href="<?= esc_url($privacy) ?>"><?= frascella_e(frascella_s('footer.privacy')) ?></a>
            <?php endif; ?>
        </p>
    </div>
</footer>
