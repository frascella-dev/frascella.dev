<?php
/**
 * A block of text between fields (here: the sentence on what happens to the message, with
 * the link to the privacy notice). Overrides Agenda's templates/fields/content.php
 * @version 0.2.0 for the form `contatti`.
 *
 * @var Agenda_View $agenda
 * @var array       $field
 */

defined('ABSPATH') || exit;
?>
<p class="form-note"><?php echo wp_kses_post($agenda->text($field['html'] ?? $field['label'] ?? '')); ?></p>
