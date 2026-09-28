<?php
/**
 * The 404's body: what it says, and the way home. Printed by 404.php and by index.php
 * when a list is empty.
 */

defined('ABSPATH') || exit;
?>
<section class="sheet not-found">
    <div class="measure">
        <p class="eyebrow">404</p>
        <h1 class="display"><?= frascella_e(frascella_s('notFound.title')) ?></h1>
        <p><a class="link-cue" href="<?= esc_url(frascella_home_url()) ?>"><?= frascella_e(frascella_s('notFound.back')) ?></a></p>
    </div>
</section>
