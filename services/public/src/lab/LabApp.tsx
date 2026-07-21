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
        history.pushState({}, "", to ? `/lab/${to}` : "/lab");
        setSlug(to);
        window.scrollTo(0, 0);
    };
    return { slug, go };
}

function Index({ go }: { go: (slug: string) => void }) {
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

            {experiments.length === 0 ? (
                <p className="lab-empty ef-label">no experiments yet</p>
            ) : (
                <ul className="lab-grid">
                    {experiments.map((e, i) => (
                        <li key={e.meta.slug}>
                            <a
                                href={`/lab/${e.meta.slug}`}
                                className="lab-card"
                                data-cursor="link"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    go(e.meta.slug);
                                }}
                            >
                                <span className="ef-label">
                                    IDX — {String(i + 1).padStart(2, "0")}
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
                        </li>
                    ))}
                </ul>
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
