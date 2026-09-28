<?php
/**
 * A page — the front page too: a page built in Elementor prints its layout, any other
 * page prints its title and its text in the theme's document style.
 */

defined('ABSPATH') || exit;

get_header();
the_post();
?>
<main id="content">
    <?php frascella_document('single', 'page-body'); ?>
</main>
<?php
get_footer();
