<?php
/**
 * The contact form, drawn by the theme. Overrides Agenda's templates/form.php @version 0.2.0
 * for the form `contatti` only.
 *
 * Kept from Agenda's: the action, `novalidate`, every hidden input (form, step, the signed
 * time trap, the honeypot), the status line with role="alert", the step. Changed: the
 * classes, the button (the site's), and no `data-agenda-gate` — the button is never
 * disabled: the server's refusals show under the fields, which a disabled button never
 * explains (docs/guidelines/07-accessibility.md, Forms).
 *
 * The theme's lib/form.ts sends it without leaving the page; without a script it posts.
 *
 * @var Agenda_View $agenda
 */

defined('ABSPATH') || exit;

$agenda_labels = (array) ($agenda->schema()['labels'] ?? []);
$agenda_button = $agenda->is_last()
    ? $agenda->text($agenda_labels['submit'] ?? __('Send request', 'agenda'))
    : $agenda->text($agenda_labels['next'] ?? __('Continue', 'agenda'));
// An arrow at the end of the label moves on hover, and is not read out.
$agenda_arrow = str_ends_with($agenda_button, '→');
$agenda_button = rtrim($agenda_button, " →");
?>
<div class="agenda contact-form" data-agenda="<?php echo esc_attr($agenda->form_key()); ?>">
    <form class="agenda-form" method="post" action="<?php echo esc_url($agenda->action_url()); ?>" enctype="<?php echo esc_attr($agenda->enctype()); ?>" novalidate data-agenda-form>
        <?php echo $agenda->hidden_inputs(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts. ?>

        <?php if ($agenda->status_message() !== '') : ?>
            <p class="form-status is-<?php echo esc_attr($agenda->status()); ?>" role="alert" tabindex="-1"><?php echo esc_html($agenda->status_message()); ?></p>
        <?php endif ?>

        <?php $agenda->render('step'); ?>

        <div class="form-nav">
            <?php if ($agenda->back_url() !== '') : ?>
                <a class="agenda-back" href="<?php echo esc_url($agenda->back_url()); ?>"><?php echo esc_html($agenda->text($agenda_labels['back'] ?? __('Back', 'agenda'))); ?></a>
            <?php endif ?>
            <button type="submit" class="btn btn--big agenda-submit"><?php echo esc_html($agenda_button); ?><?php if ($agenda_arrow) : ?> <span class="arr" aria-hidden="true">→</span><?php endif ?></button>
        </div>
    </form>
</div>
