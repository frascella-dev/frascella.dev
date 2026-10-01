<?php
/**
 * The work: one card per project, each a station of the camera, which frames the laptop
 * and shows the project's screenshot on its screen (`.card[data-screen]`,
 * assets/src/desk/CONTRACT.md §3).
 *
 * Printed by the plugin's «Works» widget. The projects are the plugin's (Projects in the
 * admin, one per language through Polylang): title, role, text, stack, status, address and
 * a screenshot as the featured image. The screenshot is also in the card, for whoever does
 * not get the scene; while the scene shows it, it is not drawn twice (sections.css).
 *
 * No projects yet: nothing is printed, except in the editor, where the empty widget says so.
 *
 * @var array $args count: how many projects (0 = all)
 */

defined('ABSPATH') || exit;

$projects = function_exists('frascella_projects') ? frascella_projects((int) ($args['count'] ?? 0)) : [];
if ($projects === []) {
    if (frascella_is_editing()) {
        echo '<p class="rh">' . frascella_e(frascella_s('works.empty')) . '</p>';
    }

    return;
}
?>
<div class="works">
    <?php foreach ($projects as $i => $project) : ?>
        <?php
        $n = sprintf('%02d', $i + 1);
        $id = 'project-' . $project['slug'];
        $image = (int) $project['image'];
        $src = $image > 0 ? wp_get_attachment_image_src($image, 'full') : false;
        $alt = $image > 0 && function_exists('frascella_attachment_alt') ? frascella_attachment_alt($image) : '';
        ?>
        <article class="card plate" data-stop="w<?= (int) ($i + 1) ?>" data-screen="<?= (int) $i ?>"<?= is_array($src) ? ' data-screen-src="' . esc_url((string) $src[0]) . '"' : '' ?> aria-labelledby="<?= esc_attr($id) ?>">
            <div class="pl pane">
                <p class="rh"><span class="no"><?= frascella_e($n) ?></span><?php if ($project['role'] !== '') : ?> · <?= frascella_e($project['role']) ?><?php endif; ?></p>
                <h3 class="pname" id="<?= esc_attr($id) ?>">
                    <?php if ($project['url'] !== '') : ?>
                        <a href="<?= esc_url($project['url']) ?>"><?= frascella_e($project['title']) ?></a>
                    <?php else : ?>
                        <?= frascella_e($project['title']) ?>
                    <?php endif; ?>
                </h3>
                <?php if ($project['text'] !== '') : ?>
                    <div class="txt"><?= wp_kses_post(wpautop($project['text'])) ?></div>
                <?php endif; ?>
                <?php if ($project['stack'] !== '' || $project['status'] !== '') : ?>
                    <p class="meta">
                        <?= frascella_e($project['stack']) ?>
                        <?php if ($project['stack'] !== '' && $project['status'] !== '') : ?><br><?php endif; ?>
                        <?= frascella_e($project['status']) ?>
                    </p>
                <?php endif; ?>
            </div>
            <?php if (is_array($src)) : ?>
                <figure class="plate-shot">
                    <?= wp_get_attachment_image($image, 'large', false, ['alt' => $alt, 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => '(max-width: 900px) 100vw, 58vw']) ?>
                </figure>
            <?php endif; ?>
        </article>
    <?php endforeach; ?>
</div>
