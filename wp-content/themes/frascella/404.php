<?php
/**
 * Not found: one screen, no footer. The masthead and the small print are furniture for a
 * reader who has arrived somewhere.
 */

defined('ABSPATH') || exit;

$GLOBALS['frascella_no_footer'] = true;
get_header();
?>
<main id="content" class="doc-main">
    <?php if (!frascella_location('single')) : ?>
        <?php get_template_part('template-parts/not-found'); ?>
    <?php endif; ?>
</main>
<?php
get_footer();
