<?php

/**
 * Analytics for WordPress (analytics-connector): the owner's statistics service,
 * https://analytics.frascella.dev, and its consent banner.
 *
 * The plugin loads the tracker; the site's settings and the banner (texts, theme, cookie
 * level) live on the service, and tools/analytics/site.json records what they are meant to
 * be — the privacy notice describes exactly that. What this file decides:
 * - whether the tracker is on the page at all (`frascella_analytics_active()`), for the
 *   theme's "cookie" link, which reopens the banner only where there is one to reopen;
 * - the referrer policy the tracker's beacons need (docs/guidelines/08-privacy.md: a server
 *   sending `same-origin` makes Firefox and Safari send them with `Origin: null`).
 *
 * Without the plugin, or without its public key, nothing here does anything.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

/** Whether the tracker loads on this request: the plugin is on, configured, and counts this reader. */
function frascella_analytics_active(): bool
{
    if (!function_exists('analytics_connector_get_settings') || !function_exists('analytics_connector_script_url')) {
        return false;
    }
    $settings = analytics_connector_get_settings();
    if (analytics_connector_script_url($settings) === null) {
        return false;
    }
    $skip = (string) ($settings['skip_capability'] ?? '');

    return $skip === '' || !is_user_logged_in() || !current_user_can($skip);
}

add_filter('frascella_referrer_policy', static fn (string $policy): string => frascella_analytics_active() ? 'strict-origin-when-cross-origin' : $policy);
