<?php
/**
 * The stage under the page: the scene's canvas and the Ink sheet with the words cut out of it.
 *
 * Printed first in `<body>` on a page with the desk (inc/desk.php). The canvas is the
 * scene's (assets/src/desk/CONTRACT.md §3); the sheet is the page's, drawn by lib/sheet.ts.
 * The mask is luminance: white keeps the sheet, black cuts through it. `#scrwin` and
 * `#scrrim` are the scene's to write (the window cut to the laptop's screen at each
 * project).
 */

defined('ABSPATH') || exit;
?>
<canvas id="desk" aria-hidden="true"></canvas>
<svg class="sheet" id="sheet" aria-hidden="true" focusable="false">
    <defs>
        <mask id="knock" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <g id="holes"></g>
            <path id="scrwin" d="" fill="white" stroke="white" stroke-width="10" stroke-linejoin="round" />
            <rect id="iris" x="0" y="0" width="0" height="0" rx="24" fill="black" />
            <rect id="headcover" x="0" y="0" width="100%" height="68" fill="white" />
        </mask>
        <clipPath id="belowhead"><rect id="headclip" x="0" y="68" width="100%" height="100%" /></clipPath>
    </defs>
    <rect class="sheet-ink" x="0" y="0" width="100%" height="100%" mask="url(#knock)" />
    <?php /* Inside each word a faint Paper wash and round it a hairline, so a word still reads where the desk behind it is dark. */ ?>
    <g clip-path="url(#belowhead)">
        <g id="wash"></g>
        <g id="rims" fill="none" stroke-width="1.25"></g>
        <path id="scrrim" d="" fill="none" stroke-width="1" stroke-opacity="0" stroke-linejoin="round" />
    </g>
</svg>
