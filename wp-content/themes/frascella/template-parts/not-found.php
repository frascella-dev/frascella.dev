<?php
/**
 * The 404's body: what it says, and the way home. Printed by 404.php and by index.php
 * when a list is empty.
 */

defined('ABSPATH') || exit;
?>
<section class="doc not-found">
    <div class="doc-inner">
        <p class="rh">404</p>
        <h1 class="page-title"><?= frascella_e(frascella_s('notFound.title')) ?></h1>
        <p><a href="<?= esc_url(frascella_home_url()) ?>"><?= frascella_e(frascella_s('notFound.back')) ?></a></p>
    </div>
</section>
