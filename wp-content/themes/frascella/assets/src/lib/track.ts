/**
 * The site's own events, for an analytics service when the site has one.
 *
 * A service that loads with a queue (`window.analytics = { q: [], track() }`) receives
 * them; without one, every call is a no-op: measurement is never worth an error on the
 * page. Only names and short, non-personal properties — never a field's value, an address
 * or a name. And /privacy says, in the same commit, what is measured.
 */

type Props = Record<string, string | number | boolean>;

declare global {
    interface Window {
        analytics?: { track: (name: string, props?: Props) => void };
    }
}

export function track(name: string, props?: Props): void {
    try {
        window.analytics?.track(name, props);
    } catch {
        // Nothing: see above.
    }
}
