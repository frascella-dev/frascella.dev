<?php
/**
 * text, email (and tel, number, url, date, time). Overrides Agenda's templates/fields/text.php
 * @version 0.2.0 for the form `contatti`: the same name, id, attributes and `aria-*`; the
 * site's classes (controls.css: field-name, input, field-error).
 *
 * @var Agenda_View $agenda
 * @var array       $field
 */

defined('ABSPATH') || exit;

$agenda_key = (string) $field['key'];
$agenda_type = ['text' => 'text', 'email' => 'email', 'tel' => 'tel', 'number' => 'number', 'url' => 'url', 'date' => 'date', 'time' => 'time'][$field['type']] ?? 'text';
$agenda_rules = (array) ($field['rules'] ?? []);
$agenda_error = $agenda->error($agenda_key);
$agenda_min = $agenda_rules['min'] ?? (isset($agenda_rules['date_min']) ? agenda_relative_date((string) $agenda_rules['date_min']) : null);
$agenda_max = $agenda_rules['max'] ?? (isset($agenda_rules['date_max']) ? agenda_relative_date((string) $agenda_rules['date_max']) : null);
?>
<label class="field-name" for="<?php echo esc_attr($agenda->id($field)); ?>">
    <?php echo esc_html($agenda->label($field)); ?>
    <?php if (empty($field['required'])) : ?><span class="field-optional"><?php esc_html_e('(optional)', 'agenda'); ?></span><?php endif ?>
</label>
<input class="input" type="<?php echo esc_attr($agenda_type); ?>"
    id="<?php echo esc_attr($agenda->id($field)); ?>"
    name="<?php echo esc_attr($agenda_key); ?>"
    value="<?php echo esc_attr((string) (is_array($agenda->value($agenda_key)) ? '' : $agenda->value($agenda_key))); ?>"
    <?php if ($agenda->placeholder($field) !== '') : ?>placeholder="<?php echo esc_attr($agenda->placeholder($field)); ?>"<?php endif ?>
    <?php if (!empty($field['autocomplete'])) : ?>autocomplete="<?php echo esc_attr((string) $field['autocomplete']); ?>"<?php endif ?>
    <?php if (isset($agenda_rules['max_length'])) : ?>maxlength="<?php echo esc_attr((string) (int) $agenda_rules['max_length']); ?>"<?php endif ?>
    <?php if (isset($agenda_rules['min_length'])) : ?>minlength="<?php echo esc_attr((string) (int) $agenda_rules['min_length']); ?>"<?php endif ?>
    <?php if ($agenda_min !== null) : ?>min="<?php echo esc_attr((string) $agenda_min); ?>"<?php endif ?>
    <?php if ($agenda_max !== null) : ?>max="<?php echo esc_attr((string) $agenda_max); ?>"<?php endif ?>
    <?php echo !empty($field['required']) ? 'required' : ''; ?>
    <?php if ($agenda_error !== '') : ?>aria-invalid="true"<?php endif ?>
    <?php if ($agenda->describedby($field) !== '') : ?>aria-describedby="<?php echo esc_attr($agenda->describedby($field)); ?>"<?php endif ?> />
<?php require __DIR__ . '/_notes.php'; ?>
