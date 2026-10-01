<?php
/**
 * The fields of the step. Overrides Agenda's templates/step.php @version 0.2.0 for the form
 * `contatti`. Every field is printed, with Agenda's own rule for which are visible; the
 * legend is kept for screen readers (the contact poster's cut-out word is its heading).
 *
 * @var Agenda_View $agenda
 */

defined('ABSPATH') || exit;

$agenda_step = $agenda->step();
$agenda_visible = array_map(static fn (array $f): string => (string) $f['key'], $agenda->fields());
$agenda_here = array_map(static fn (array $f): string => (string) $f['key'], $agenda->all_fields());
?>
<fieldset class="form-step" data-agenda-step="<?php echo esc_attr($agenda->step_key()); ?>">
    <legend><?php echo $agenda->html($agenda_step['title'] ?? $agenda_step['name'] ?? ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- kses'd by html(). ?></legend>

    <?php foreach ($agenda->all_fields() as $agenda_field) : ?>
        <?php
        $agenda_shown = in_array((string) $agenda_field['key'], $agenda_visible, true)
            || array_intersect(agenda_condition_fields($agenda_field['condition'] ?? null), $agenda_here);
        ?>
        <div class="field field--<?php echo esc_attr((string) $agenda_field['type']); ?><?php echo $agenda->error((string) $agenda_field['key']) !== '' ? ' has-error' : ''; ?>"
            data-agenda-field="<?php echo esc_attr((string) $agenda_field['key']); ?>"
            <?php if (!empty($agenda_field['condition'])) : ?>data-agenda-condition="<?php echo esc_attr($agenda->condition_attr($agenda_field['condition'])); ?>"<?php endif ?>
            <?php echo $agenda_shown ? '' : 'hidden'; ?>>
            <?php $agenda->render_field($agenda_field); ?>
        </div>
    <?php endforeach ?>
</fieldset>
