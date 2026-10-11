/**
 * Addresses on this site, wherever Pages serves it: `/` on the custom domain,
 * `/frascella.dev/` on github.io (astro.config.mjs, BASE_PATH).
 */
import { words, type Lang } from "../i18n.ts";

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

/** A path inside the site (`privacy/`, `en/#work`) as an address that works under the base. */
export const href = (path = ""): string => base + path.replace(/^\//, "");

/** The canonical address of a path, always on the custom domain. */
export const canonical = (path = ""): string => new URL(path.replace(/^\//, ""), "https://www.frascella.dev/").href;

/** A page's path in a language: `privacy/` → `en/privacy/`. */
export const inLang = (lang: Lang, page = ""): string => words[lang].prefix + page;
