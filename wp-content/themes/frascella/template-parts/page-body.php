<?php
/**
 * A page not built in Elementor (the privacy notice): its title and its text, as a document.
 */

defined('ABSPATH') || exit;
?>
<article class="doc">
    <div class="doc-inner">
        <h1 class="page-title"><?php the_title(); ?></h1>
        <div class="prose"><?php the_content(); ?></div>
    </div>
</article>
