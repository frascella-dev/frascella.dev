<?php
/**
 * Everything above the page, on every page. The `<head>` itself is inc/head.php, on wp_head.
 */

defined('ABSPATH') || exit;
?>
<!doctype html>
<html lang="<?= esc_attr(frascella_html_lang()) ?>">
    <head>
        <meta charset="<?php bloginfo('charset'); ?>" />
        <?php /* No maximum-scale, no user-scalable=no: refusing zoom fails WCAG 1.4.4. */ ?>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <?php wp_head(); ?>
    </head>
    <body <?php body_class(); ?>>
        <?php wp_body_open(); ?>
        <a class="skip-link" href="#content"><?= frascella_e(frascella_s('nav.skip')) ?></a>
        <?php
        // The Theme Builder's header where the site has built one, the theme's otherwise.
        if (!frascella_location('header')) {
            get_template_part('template-parts/header');
        }
        ?>
