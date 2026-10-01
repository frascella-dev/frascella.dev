<?php
/**
 * The fallback for every kind of page the theme has no template of its own for: the
 * Theme Builder's archive or single document when there is one, a plain list otherwise.
 */

defined('ABSPATH') || exit;

get_header();
?>
<main id="content" class="doc-main">
    <?php if (!frascella_location(is_singular() ? 'single' : 'archive')) : ?>
        <div class="doc">
            <div class="doc-inner prose">
                <?php if (have_posts()) : ?>
                    <?php while (have_posts()) : the_post(); ?>
                        <article <?php post_class(); ?>>
                            <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                            <?php the_excerpt(); ?>
                        </article>
                    <?php endwhile; ?>
                    <?php the_posts_pagination(); ?>
                <?php else : ?>
                    <?php get_template_part('template-parts/not-found'); ?>
                <?php endif; ?>
            </div>
        </div>
    <?php endif; ?>
</main>
<?php
get_footer();
