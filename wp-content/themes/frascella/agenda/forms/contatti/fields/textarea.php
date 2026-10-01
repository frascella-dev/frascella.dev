<?php
/**
 * Overrides Agenda's templates/fields/textarea.php @version 0.2.0 for the form `contatti`:
 * the same name, id, attributes and `aria-*`; the site's classes.
 *
 * @var Agenda_View $agenda
 * @var array       $field
 */

defined('ABSPATH') || exit;

$agenda_key = (string) $field['key'];
$agenda_rules = (array) ($field['rules'] ?? []);
?>
<label class="field-name" for="<?php echo esc_attr($agenda->id($field)); ?>">
    <?php echo esc_html($agenda->label($field)); ?>
    <?php if (empty($field['required'])) : ?><span class="field-optional"><?php esc_html_e('(optional)', 'agenda'); ?></span><?php endif ?>
</label>
<textarea class="input" id="<?php echo esc_attr($agenda->id($field)); ?>" name="<?php echo esc_attr($agenda_key); ?>" rows="<?php echo esc_attr((string) (int) ($field['rows'] ?? 4)); ?>"
    <?php if ($agenda->placeholder($field) !== '') : ?>placeholder="<?php echo esc_attr($agenda->placeholder($field)); ?>"<?php endif ?>
    <?php if (isset($agenda_rules['max_length'])) : ?>maxlength="<?php echo esc_attr((string) (int) $agenda_rules['max_length']); ?>"<?php endif ?>
    <?php if (isset($agenda_rules['min_length'])) : ?>minlength="<?php echo esc_attr((string) (int) $agenda_rules['min_length']); ?>"<?php endif ?>
    <?php echo !empty($field['required']) ? 'required' : ''; ?>
    <?php if ($agenda->error($agenda_key) !== '') : ?>aria-invalid="true"<?php endif ?>
    <?php if ($agenda->describedby($field) !== '') : ?>aria-describedby="<?php echo esc_attr($agenda->describedby($field)); ?>"<?php endif ?>><?php echo esc_textarea((string) $agenda->value($agenda_key)); ?></textarea>
<?php require __DIR__ . '/_notes.php'; ?>
