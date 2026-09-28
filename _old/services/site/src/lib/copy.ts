/**
 * Words the client layer needs, read off the DOM instead of imported.
 *
 * Every module under `lib/` used to import its strings from the data module,
 * which was correct for exactly as long as there was one language. It is not
 * a thing that can be fixed by importing two: the bundle is built once and
 * served to both pages, so a script that holds copy holds the wrong copy half
 * the time, and holding both means shipping Italian to every English reader.
 *
 * So the Astro components — which do know which language they are — serialise
 * what their scripts will need onto the elements those scripts already query.
 * `Work.astro` has done this since the corridor needed image URLs
 * (`data-slab-art`); this is the same move for the rest.
 *
 * Everything here fails soft. A missing attribute means a page that does not
 * carry that block, not an error worth throwing: `lib/main.ts` runs on
 * /privacy too, where there is no corridor to read.
 */

import type { Project } from "../i18n/types.ts";

export function readJson<T>(el: Element | null | undefined, attr: string, fallback: T): T {
    const raw = el?.getAttribute(attr);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

/** The corridor's projects, in corridor order. Empty off the portfolio page. */
export function readProjects(root: ParentNode = document): Project[] {
    return readJson<Project[]>(
        root.querySelector("[data-work-projects]"),
        "data-work-projects",
        [],
    );
}
