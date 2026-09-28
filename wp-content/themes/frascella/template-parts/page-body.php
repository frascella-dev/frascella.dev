<?php
/**
 * A page not built in Elementor: its title and its text, as a document.
 */

defined('ABSPATH') || exit;
?>
<article class="sheet">
    <div class="measure">
        <h1 class="display page-title"><?php the_title(); ?></h1>
        <div class="prose"><?php the_content(); ?></div>
    </div>
</article>
