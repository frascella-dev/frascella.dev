<?php
/**
 * The intermezzo: two screens of bare desk, with a dot on each thing that can be touched.
 *
 * Printed by the plugin's «Desk» widget, whose presence is also what puts the scene on the
 * page (inc/desk.php). The two holds keep the camera at the same station for a screen; the
 * scene moves each hotspot onto its object and shows it once the sheet has lifted
 * (assets/src/desk/CONTRACT.md §3). What each one does is in its accessible name.
 *
 * The scroll cue and the tablet's bar sit here too: fixed on screen, and in the reading
 * order right after the opening, which is where they are used.
 */

defined('ABSPATH') || exit;

$spots = ['lamp' => 'desk.hs.lamp', 'turntable' => 'desk.hs.turntable', 'mug' => 'desk.hs.mug', 'ipad' => 'desk.hs.ipad', 'phone' => 'desk.hs.phone', 'plant' => 'desk.hs.plant'];
?>
<button class="cue" id="cue" type="button" aria-label="<?= esc_attr(frascella_s('desk.cue')) ?>"><span aria-hidden="true"><?= frascella_e(frascella_s('desk.cue')) ?></span><svg viewBox="0 0 16 50" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path class="sh" pathLength="1" d="M8 1v47"/><path d="M3 43l5 5 5-5"/></svg></button>
<section class="desk-int" id="scrivania" aria-label="<?= esc_attr(frascella_s('desk.label')) ?>">
    <div class="hold" data-stop="desk"></div>
    <div class="hold" data-stop="desk"></div>
    <div class="hotspots" id="hotspots" role="group" aria-label="<?= esc_attr(frascella_s('desk.group')) ?>">
        <?php foreach ($spots as $key => $path) : ?>
            <button class="hs" type="button" data-hs="<?= esc_attr($key) ?>" aria-label="<?= esc_attr(frascella_s($path)) ?>"><span class="dot"></span></button>
        <?php endforeach; ?>
    </div>
</section>
<div class="pad-ui" id="pad-ui" hidden>
    <p class="pad-hint" role="status"><?= frascella_e(frascella_s('desk.padHint')) ?></p>
</div>
