/**
 * The footer's "cookie" link reopens the statistics' consent banner (`data-analytics-consent`,
 * printed while the tracker loads: the plugin's inc/analytics.php) — but only if the service
 * has a banner to reopen. Without a published one the tracker's configuration says
 * `consent: null`, its `open()` does nothing, and the link would be a dead click: it is
 * handed back to its address, the notice's cookie section.
 *
 * The tracker runs before this (both are deferred; it comes first in the document).
 */

interface TrackerConfig {
    consent?: unknown;
}

export function initConsentLink(): void {
    const cfg = (window as unknown as { __an_cfg?: TrackerConfig }).__an_cfg;
    if (!cfg || cfg.consent) return;
    for (const link of document.querySelectorAll("[data-analytics-consent]")) link.removeAttribute("data-analytics-consent");
}
