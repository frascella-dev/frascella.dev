<?php
/**
 * The confirmation, in the form's place. Overrides Agenda's templates/done.php @version 0.2.0
 * for the form `contatti`. The summary is shown once: a reload finds the draft gone.
 *
 * @var Agenda_View $agenda
 */

defined('ABSPATH') || exit;
?>
<div class="agenda contact-done" data-agenda="<?php echo esc_attr($agenda->form_key()); ?>" data-agenda-done tabindex="-1">
    <h3 class="contact-done-title"><?php echo $agenda->done_title(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- kses'd. ?></h3>
    <p class="contact-done-body"><?php echo $agenda->done_body(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- kses'd. ?></p>
    <?php if ($agenda->summary()) : ?>
        <dl class="summary">
            <?php foreach ($agenda->summary() as $agenda_row) : ?>
                <dt><?php echo esc_html($agenda_row['label']); ?></dt>
                <dd><?php echo nl2br(esc_html($agenda_row['value'])); ?></dd>
            <?php endforeach ?>
        </dl>
    <?php endif ?>
</div>
