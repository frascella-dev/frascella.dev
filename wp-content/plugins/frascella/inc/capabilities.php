<?php

/**
 * Who may do what in the Portfolio.
 *
 *   frascella_manage   the settings: the business's facts
 *   frascella_edit     write, translate, order and publish projects
 *
 * Administrators get both, editors the second, as in the owner's other plugins; the
 * `frascella_default_capabilities` filter changes that before the upgrade applies it.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** @return array<string, list<string>> */
function frascella_default_capabilities(): array
{
    return (array) apply_filters('frascella_default_capabilities', [
        'administrator' => ['frascella_manage', 'frascella_edit'],
        'editor' => ['frascella_edit'],
    ]);
}

function frascella_add_capabilities(): void
{
    foreach (frascella_default_capabilities() as $role_name => $caps) {
        $role = get_role((string) $role_name);
        if ($role) {
            foreach ((array) $caps as $cap) {
                $role->add_cap((string) $cap);
            }
        }
    }
}
