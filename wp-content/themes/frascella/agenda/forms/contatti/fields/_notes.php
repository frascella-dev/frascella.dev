<?php
/**
 * Help and refusal lines under a field (shared by the field templates). Overrides Agenda's
 * templates/fields/_notes.php for the form `contatti`: the same ids, the site's classes.
 *
 * @var Agenda_View $agenda
 * @var array       $field
 */

defined('ABSPATH') || exit;
?>
<?php if ($agenda->help($field) !== '') : ?>
    <p class="form-note" id="<?php echo esc_attr($agenda->id($field, 'help')); ?>"><?php echo $agenda->help($field); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- kses'd. ?></p>
<?php endif ?>
<?php if ($agenda->error((string) $field['key']) !== '') : ?>
    <p class="field-error" id="<?php echo esc_attr($agenda->id($field, 'error')); ?>"><?php echo esc_html($agenda->error((string) $field['key'])); ?></p>
<?php endif ?>
