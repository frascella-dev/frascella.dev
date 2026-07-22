// Shared contract for a lab experiment. Each experiment lives in its own folder
// under src/lab/experiments/<slug>/ with two files:
//
//   meta.ts         — `export default { ... } satisfies ExperimentMeta` (light,
//                     eagerly loaded for the index; must NOT import three.js)
//   experiment.tsx  — `export default function () { ... }` (the scene; lazily
//                     loaded only when its route is opened)
//
// Keeping meta separate from the component means the index page stays light and
// three.js only loads when you actually open an experiment.
export type ExperimentMeta = {
    /** URL slug — must match the folder name. Route is /lab/<slug>. */
    slug: string;
    /** Short title, portfolio voice (terse, lowercase-leaning). */
    title: string;
    /** One-line description for the index card. */
    blurb: string;
    /** Optional short tags shown as mono labels. */
    tags?: string[];
};
