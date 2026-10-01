<?php
/**
 * A cut-out word: one of the giant Gloock words through which the desk is seen.
 *
 * Printed by the plugin's «Cut-out word» widget. The word is plain text in the page; on a
 * page with the desk lib/sheet.ts breaks it into lines, fits it to its column and cuts it
 * out of the sheet (the text itself stays transparent). Elsewhere it is simply set in Paper.
 *
 * The word itself is `aria-hidden`: it repeats what the band under it says. When it is the
 * section's heading (`tag` h1/h2), a visually hidden copy carries it for screen readers.
 *
 * Its look is its wrapper's: `cut-l` (the opening's smaller step), `cut-r` (set right).
 *
 * @var array $args word, lines (breaks above 760 px, "|" between lines), lines_n (below
 *                  760 px), tag (span, h1, h2), label (what a screen reader hears; the word
 *                  by default)
 */

defined('ABSPATH') || exit;

// A soft hyphen typed as an entity is a break point the fitter knows (it breaks there
// without a hyphen, as a poster would).
$shy = static fn (string $s): string => str_replace(['&shy;', '&amp;shy;'], "\u{00AD}", trim($s));
$word = $shy((string) ($args['word'] ?? ''));
if ($word === '') {
    return;
}
$tag = in_array($args['tag'] ?? '', ['h1', 'h2', 'h3'], true) ? (string) $args['tag'] : '';
$lines = $shy((string) ($args['lines'] ?? ''));
$linesN = $shy((string) ($args['lines_n'] ?? ''));
$label = trim((string) ($args['label'] ?? '')) ?: str_replace("\u{00AD}", '', $word);

$cut = sprintf(
    '<span class="cut" aria-hidden="true"%s%s>%s</span>',
    $lines !== '' ? ' data-lines="' . esc_attr($lines) . '"' : '',
    $linesN !== '' ? ' data-lines-n="' . esc_attr($linesN) . '"' : '',
    esc_html($word),
);
?>
<?php if ($tag !== '') : ?>
    <<?= $tag ?> class="cut-h"><span class="sr"><?= frascella_e($label) ?></span><?= $cut // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?></<?= $tag ?>>
<?php else : ?>
    <?= $cut // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>
<?php endif; ?>
