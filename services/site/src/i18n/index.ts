/**
 * Locale plumbing: which languages exist, which content tree belongs to a
 * page, and how one URL maps to its twin.
 *
 * Components do not take a `locale` prop. `Astro.currentLocale` is derived
 * from the URL and available in every `.astro` file, so a component already
 * knows where it is — passing it down would be threading a value through
 * eight files that can all read it directly.
 *
 * Client modules do not import this. They are handed the few strings they
 * need through `data-` attributes on the elements they already query, the way
 * `Work.astro` has always handed `data-slab-art` to the corridor. It keeps
 * both languages out of the JS bundle and makes it impossible for a script to
 * paint English onto an Italian page.
 */

import type { Content } from "./types.ts";
import { en } from "./en.ts";
import { it } from "./it.ts";

export type Locale = "en" | "it";

/** Order matters: it is the order the switcher and the hreflang tags render. */
export const locales = ["en", "it"] as const satisfies readonly Locale[];

/**
 * The language on the root, and therefore `x-default` — the version served to
 * someone the site has no better answer for. Mirrors `astro.config.mjs`;
 * Astro does not export its own i18n config to application code.
 */
export const defaultLocale: Locale = "en";

const CONTENT: Record<Locale, Content> = { en, it };

/** Anything unrecognised is the default, never a crash. */
export function toLocale(value: string | undefined | null): Locale {
    return (locales as readonly string[]).includes(value ?? "")
        ? (value as Locale)
        : defaultLocale;
}

export function getContent(locale: string | undefined | null): Content {
    return CONTENT[toLocale(locale)];
}

/**
 * A pathname with any locale prefix taken off: `/it/privacy/` → `/privacy`.
 * Returns a path with no trailing slash, `/` for the home page.
 */
export function stripLocale(pathname: string): string {
    const clean = `/${pathname.replace(/^\/+|\/+$/g, "")}`;
    for (const locale of locales) {
        if (locale === defaultLocale) continue;
        if (clean === `/${locale}`) return "/";
        if (clean.startsWith(`/${locale}/`)) return clean.slice(locale.length + 1);
    }
    return clean;
}

/**
 * The same page in a given language. Takes a path in either language, so it
 * is safe to call with `Astro.url.pathname` whatever page you are on.
 *
 * Trailing slashes are emitted deliberately: that is the form the build
 * writes to disk (`/privacy/index.html`), the form the sitemap lists, and the
 * form the canonical states. A link to `/privacy` costs a redirect and makes
 * three sources of truth out of two.
 */
export function pathFor(locale: Locale, pathname: string): string {
    const base = stripLocale(pathname);
    if (locale === defaultLocale) return base === "/" ? "/" : `${base}/`;
    return base === "/" ? `/${locale}/` : `/${locale}${base}/`;
}

/**
 * Every language version of a page, for the `hreflang` block and the
 * switcher. Includes the current page — a self-referential `hreflang` is
 * required, not redundant: Google reads the set as a whole and a page missing
 * from its own set is a set that does not validate.
 */
export function alternates(pathname: string) {
    return locales.map((locale) => ({
        locale,
        /** The BCP 47 tag, which is what `hreflang` and `<html lang>` want. */
        hreflang: CONTENT[locale].htmlLang,
        endonym: CONTENT[locale].endonym,
        path: pathFor(locale, pathname),
    }));
}
