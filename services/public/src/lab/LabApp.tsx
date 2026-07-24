import { lazy, Suspense, useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { ExperimentMeta } from "./experiments/types.ts";
import CustomCursor from "../components/CustomCursor.tsx";
import "./lab.css";

// Experiments are auto-discovered — drop a folder under experiments/<slug>/ with
// a meta.ts + experiment.tsx and it appears here. No central registry to edit,
// so nothing collides. Metas load eagerly (light) for the index; components load
// lazily (three.js) only when their route opens.
const metaModules = import.meta.glob("./experiments/*/meta.ts", { eager: true }) as Record<
    string,
    { default: ExperimentMeta }
>;
const componentModules = import.meta.glob("./experiments/*/experiment.tsx") as Record<
    string,
    () => Promise<{ default: ComponentType }>
>;

const folderOf = (path: string) => path.split("/")[2]; // ./experiments/<slug>/x

const experiments = Object.entries(metaModules)
    .map(([path, mod]) => ({ meta: mod.default, folder: folderOf(path) }))
    .sort((a, b) => a.meta.slug.localeCompare(b.meta.slug));

// The index is grouped by what each experiment feeds (ExperimentMeta.category).
// Each category is a tab; order is fixed; an empty category is dropped; anything
// without a category falls into "misc". IDX numbers restart per category.
const CATEGORY_ORDER: { key: NonNullable<ExperimentMeta["category"]>; label: string }[] = [
    { key: "work", label: "work" },
    { key: "timeline", label: "timeline" },
    { key: "games", label: "games" },
    { key: "misc", label: "misc" },
];

const groupedExperiments = CATEGORY_ORDER.map(({ key, label }) => ({
    key,
    label,
    items: experiments
        .filter((e) => (e.meta.category ?? "misc") === key)
        .map((e, i) => ({ ...e, n: i + 1 })),
})).filter((g) => g.items.length > 0);

// The active tab lives in the URL (?cat=…) so a reload or a browser-back lands
// on the same category. `lastCat` remembers it across in-app navigation too —
// the "← lab" link builds a fresh /lab URL that wouldn't otherwise carry the
// query, so it reads this instead.
const VALID_CATS = new Set<string>(groupedExperiments.map((g) => g.key));
let lastCat: string | null = null;

function readCatFromUrl(): string | null {
    const cat = new URLSearchParams(location.search).get("cat");
    return cat && VALID_CATS.has(cat) ? cat : null;
}

function lazyFor(slug: string) {
    const entry = Object.entries(componentModules).find(
        ([path]) => folderOf(path) === slug,
    );
    return entry ? lazy(entry[1]) : null;
}

function useLabRoute() {
    const read = () =>
        location.pathname.replace(/^\/lab\/?/, "").split("/").filter(Boolean)[0] ?? null;
    const [slug, setSlug] = useState<string | null>(read);
    useEffect(() => {
        const on = () => setSlug(read());
        window.addEventListener("popstate", on);
        return () => window.removeEventListener("popstate", on);
    }, []);
    const go = (to: string | null) => {
        // Returning to the index restores the last tab via its query param.
        const url = to ? `/lab/${to}` : lastCat ? `/lab?cat=${lastCat}` : "/lab";
        history.pushState({}, "", url);
        setSlug(to);
        window.scrollTo(0, 0);
    };
    return { slug, go };
}

function Index({ go }: { go: (slug: string) => void }) {
    const [activeCat, setActiveCat] = useState(
        () => readCatFromUrl() ?? lastCat ?? groupedExperiments[0]?.key ?? "misc",
    );
    const current =
        groupedExperiments.find((g) => g.key === activeCat) ??
        groupedExperiments[0];

    // Reflect the shown tab in the URL (?cat=…) and remember it, so a reload,
    // a browser-back, or the in-app "← lab" link all restore this tab.
    const selectCat = (key: string) => {
        setActiveCat(key);
        lastCat = key;
        history.replaceState({}, "", `/lab?cat=${key}`);
    };
    useEffect(() => {
        if (current && readCatFromUrl() !== current.key) selectCat(current.key);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <div className="lab-index">
            <header className="lab-index-head">
                <div className="lab-index-title">
                    <span className="ef-label">frascella.dev — lab</span>
                    <h1 className="ef-h2">Experiments</h1>
                    <p>
                        A dev-only sandbox for restructuring the site — three.js
                        studies, motion, layout. Never shipped to production.
                    </p>
                </div>
                <span className="ef-label lab-devflag">dev only</span>
            </header>

            {groupedExperiments.length === 0 || !current ? (
                <p className="lab-empty ef-label">no experiments yet</p>
            ) : (
                <div className="lab-browser">
                    <nav
                        className="lab-tabs"
                        role="tablist"
                        aria-label="experiment categories"
                    >
                        {groupedExperiments.map((group) => (
                            <button
                                key={group.key}
                                type="button"
                                role="tab"
                                aria-selected={group.key === current.key}
                                className={`ef-label lab-tab ${
                                    group.key === current.key ? "is-active" : ""
                                }`}
                                data-cursor="link"
                                onClick={() => selectCat(group.key)}
                            >
                                <span>{group.label}</span>
                                <span className="ef-mono lab-tab-count">
                                    {String(group.items.length).padStart(2, "0")}
                                </span>
                            </button>
                        ))}
                    </nav>

                    <div className="lab-cols" key={current.key}>
                        {current.items.map((e) => (
                            <a
                                key={e.meta.slug}
                                href={`/lab/${e.meta.slug}`}
                                className="lab-card"
                                data-cursor="link"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    go(e.meta.slug);
                                }}
                            >
                                <span className="ef-label">
                                    IDX — {String(e.n).padStart(2, "0")}
                                </span>
                                <span className="lab-card-title ef-h3">
                                    {e.meta.title}
                                </span>
                                <span className="lab-card-blurb">{e.meta.blurb}</span>
                                {e.meta.tags && (
                                    <span className="lab-card-tags">
                                        {e.meta.tags.map((t) => (
                                            <span key={t} className="ef-label">
                                                {t}
                                            </span>
                                        ))}
                                    </span>
                                )}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function LabRoutes() {
    const { slug, go } = useLabRoute();

    if (!slug) return <Index go={go} />;

    const Experiment = lazyFor(slug);
    if (!Experiment) {
        return (
            <div className="lab-index">
                <p className="lab-empty ef-label">unknown experiment: {slug}</p>
                <a
                    href="/lab"
                    className="lab-back ef-label"
                    data-cursor="link"
                    onClick={(e) => {
                        e.preventDefault();
                        go(null);
                    }}
                >
                    ← back to lab
                </a>
            </div>
        );
    }

    return (
        <div className="lab-experiment">
            <a
                href="/lab"
                className="lab-back ef-label"
                data-cursor="link"
                onClick={(e) => {
                    e.preventDefault();
                    go(null);
                }}
            >
                ← lab
            </a>
            <Suspense fallback={<div className="lab-loading ef-label">loading…</div>}>
                <Experiment />
            </Suspense>
        </div>
    );
}

export default function LabApp() {
    // The lab renders as its own root, so it needs the custom cursor too — the
    // native one is hidden globally in base.css.
    return (
        <>
            <CustomCursor />
            <LabRoutes />
        </>
    );
}
