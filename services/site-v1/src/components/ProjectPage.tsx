import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { gsap, Flip, prefersReducedMotion } from '../lib/gsap.ts';
import { takeProjectFlip, tagProjectFlipTarget } from '../lib/projectFlip.ts';

export const PROJECT_DB = {
    'ledger-works': {
        idx: '01',
        year: '2025',
        title: 'Ledger Works',
        subtitle: 'Double-entry ledger & treasury API for a European neobank.',
        client: 'Fintech platform (under NDA)',
        role: 'Backend lead',
        duration: '8 months',
        team: '4 engineers, 1 PM',
        stack: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'AWS ECS', 'Terraform'],
        context: 'The client was migrating from a third-party ledger provider to an in-house system to take back control of reconciliation, reporting and multi-currency treasury operations. Latency SLAs were non-negotiable: reconciliation had to close under fifty milliseconds at the 99th percentile, across twelve currencies and fifteen partner banks.',
        approach: 'A write-once append-only core with derived read-models, audited by a third party. Idempotency keys on every write path, partitioned per-tenant, with an immutable audit trail streamed to S3 and replayable into a cold store. We moved reconciliation from a nightly batch to a streaming consumer that closes within a single business day.',
        outcome: 'Sub-50ms p99 on reconciliation. Zero discrepancies in the first three months of production traffic. Audit passed on first attempt.',
        metrics: [
            { k: 'reconciliation p99', v: '47ms' },
            { k: 'currencies', v: '12' },
            { k: 'partner banks', v: '15' },
            { k: 'uptime (first year)', v: '99.98%' },
        ],
        credits: [
            { role: 'Backend lead', name: 'Emanuele Frascella' },
            { role: 'Software engineer', name: '—' },
            { role: 'Product', name: '—' },
            { role: 'Audit', name: 'Third-party (NDA)' },
        ],
    },
    'atlas-routing': {
        idx: '02',
        year: '2024',
        title: 'Atlas Routing',
        subtitle: 'Dispatch & last-mile routing for a logistics SaaS.',
        client: 'Logistics SaaS',
        role: 'Software engineer',
        duration: '6 months',
        team: '3 engineers',
        stack: ['PHP 8.3', 'Laravel', 'MySQL', 'Redis', 'RabbitMQ', 'AWS'],
        context: 'The product needed to graduate from a hand-tuned nearest-neighbor planner to a constraint-aware router that respected shift windows, vehicle capacity, driver breaks and customer time windows — at four thousand stops per tenant per day.',
        approach: 'A constraint solver built on OR-Tools wrapped in a PHP service layer, with an event-driven replanner that reacts to live driver events (no-show, delay, failed delivery). State is owned by a small set of append-only tables; the solver reads a snapshot and emits a new plan as a diff.',
        outcome: 'Four thousand daily stops per tenant without operator intervention. Replan latency under two seconds for the worst-case disruption. Dispatcher workload reduced by a factor of three, measured over two months post-rollout.',
        metrics: [
            { k: 'daily stops', v: '4,000' },
            { k: 'replan latency', v: '< 2s' },
            { k: 'dispatcher load', v: '−68%' },
            { k: 'tenants', v: '22' },
        ],
        credits: [
            { role: 'Backend', name: 'Emanuele Frascella' },
            { role: 'Backend', name: '—' },
            { role: 'Product', name: '—' },
        ],
    },
    'warden': {
        idx: '03',
        year: '2024',
        title: 'Warden',
        subtitle: 'Observability & policy engine unifying eleven internal services.',
        client: 'Internal platform',
        role: 'Backend + infra',
        duration: '5 months',
        team: '2 engineers',
        stack: ['Python', 'FastAPI', 'PostgreSQL', 'OpenTelemetry', 'AWS', 'Terraform'],
        context: 'Eleven services had drifted into eleven different ways of logging, authorizing, and paging on-call. Warden consolidates that surface: one structured log pipeline, one policy DSL, one audit trail.',
        approach: 'A thin collector in each service forwards OpenTelemetry to a central ingestion layer. A policy engine evaluates structured events against a declarative rule DSL. Queries are backed by time-partitioned PostgreSQL tables with an S3 cold-tier.',
        outcome: 'A single pane of glass across eleven services. Mean time to detection dropped from ninety seconds to eighteen. Post-incident reviews now cite a single Warden query rather than stitching together four dashboards.',
        metrics: [
            { k: 'services unified', v: '11' },
            { k: 'MTTD', v: '90s → 18s' },
            { k: 'policy rules', v: '240+' },
            { k: 'retention', v: '30d hot / 1y cold' },
        ],
        credits: [
            { role: 'Backend + infra', name: 'Emanuele Frascella' },
            { role: 'SRE', name: '—' },
        ],
    },
    'relay': {
        idx: '04',
        year: '2023',
        title: 'Relay',
        subtitle: 'Message broker & retry engine for a B2B notification product.',
        client: 'Messaging startup',
        role: 'Software engineer',
        duration: '4 months',
        team: '3 engineers',
        stack: ['Node.js', 'TypeScript', 'RabbitMQ', 'PostgreSQL', 'Redis'],
        context: "The client's outbound notification pipeline had exactly-once semantics on paper and at-least-once semantics in practice. Duplicate messages were costing them customers.",
        approach: 'A deduplication layer keyed on tenant + message idempotency key, backed by a short-lived Redis set and a permanent PostgreSQL journal. A dead-letter replay UI lets support engineers inspect, edit and replay failures without SSH access.',
        outcome: 'Exactly-once delivery, verified by a month-long soak test at ten times nominal traffic. Dead-letter volume fell by ninety-one percent once the replanner was introduced.',
        metrics: [
            { k: 'delivery semantics', v: 'exactly-once' },
            { k: 'soak load', v: '10× nominal' },
            { k: 'dead-letter reduction', v: '−91%' },
            { k: 'tenants', v: '40+' },
        ],
        credits: [
            { role: 'Backend', name: 'Emanuele Frascella' },
            { role: 'Backend', name: '—' },
            { role: 'Product', name: '—' },
        ],
    },
    'glasshouse': {
        idx: '05',
        year: '2023',
        title: 'Glasshouse',
        subtitle: 'Telemetry API and dashboard for a family-run greenhouse operation.',
        client: 'Horticulture (family business)',
        role: 'Full stack',
        duration: '3 months',
        team: 'Solo',
        stack: ['Java 21', 'Spring Boot', 'MySQL', 'AWS IoT', 'React'],
        context: 'A third-generation greenhouse run on paper logs and gut instinct. They wanted visibility into temperature, humidity and soil moisture without hiring anyone to operate it.',
        approach: 'A small fleet of AWS IoT sensors feeds a Spring Boot ingestion service. Data is aggregated into MySQL and exposed through a deliberately sparse React dashboard. The whole thing runs on a t4g.small and costs less than a monthly phone bill.',
        outcome: 'Around-the-clock telemetry for five years and counting, with zero incidents. Owner reports a measurable improvement in yield since rollout; the deployment has not been touched in two years.',
        metrics: [
            { k: 'uptime', v: '24 / 7' },
            { k: 'sensors', v: '18' },
            { k: 'monthly cost', v: '< €30' },
            { k: 'years in production', v: '2+' },
        ],
        credits: [
            { role: 'Full stack', name: 'Emanuele Frascella' },
            { role: 'Client', name: '—' },
        ],
    },
};

function useQueryParam(key) {
    const read = () => {
        try {
            const h = (window.location.hash || '').replace(/^#\/?/, '');
            const m = h.match(/^project\/([^/?#]+)/);
            if (m) return decodeURIComponent(m[1]);
            return new URLSearchParams(window.location.search).get(key);
        } catch {
            return null;
        }
    };
    const [v, setV] = useState(read);
    useEffect(() => {
        const onChange = () => {
            setV(read());
            window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        };
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);
    return v;
}

function useMouseParallax() {
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    useEffect(() => {
        const onMove = (e) => setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, []);
    return mouse;
}

export default function ProjectPage() {
    const slug = useQueryParam('p') || 'ledger-works';
    const project = PROJECT_DB[slug];
    const [scrollY, setScrollY] = useState(0);
    const mouse = useMouseParallax();
    // Flip's shared-element target — either the real hero header below, or
    // the 404 panel above, whichever this render actually mounts.
    const heroRef = useRef(null);
    // takeProjectFlip() destructively consumes the stash — call it at most
    // once per mount. Needed because React StrictMode (dev only) invokes
    // effects twice (mount -> cleanup -> mount again) on the same component
    // instance; without this guard the second pass would find the stash
    // already emptied by the first and silently fall back to the plain
    // fade-in every time, even in the one case (a genuine Work-tile click)
    // where the Flip should play. `undefined` (never read) vs `null`
    // (read, nothing was there) tells the two cases apart.
    const flipStateRef = useRef(undefined);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Entrance for the hero block. Two paths:
    //  - Arrived by clicking a Work tile: a Flip state was stashed just
    //    before the hash change unmounted it (see src/lib/projectFlip.ts).
    //    The hero's own content fades out for the duration of the box morph
    //    (avoids the clicked card's text visibly stretching as the box
    //    resizes) and back in once Flip lands.
    //  - Anything else — direct load, a reload, back/forward navigation, or
    //    reduced motion (which never stashes a Flip state to begin with) —
    //    a plain fade + rise, the same "graceful fallback" every other
    //    entrance in this pass uses.
    // Mount-only: prev/next nav re-renders this same component instance
    // with a new slug (App.tsx doesn't key <ProjectPage/>, so switching
    // between case studies doesn't unmount it) rather than remounting it,
    // so this deliberately doesn't replay on every case-study switch.
    useLayoutEffect(() => {
        const hero = heroRef.current;
        if (!hero) return;
        const ctx = gsap.context(() => {
            if (prefersReducedMotion()) return;

            if (flipStateRef.current === undefined) {
                flipStateRef.current = takeProjectFlip();
            }
            const flipState = flipStateRef.current;
            const content = hero.querySelectorAll(':scope > *');

            if (flipState) {
                tagProjectFlipTarget(hero);
                gsap.set(content, { opacity: 0 });
                hero.classList.add('ef-pp-hero--flip-surface');
                Flip.from(flipState, {
                    targets: hero,
                    duration: 0.6,
                    ease: 'power2.inOut',
                    absolute: true,
                    onComplete: () => {
                        hero.classList.remove('ef-pp-hero--flip-surface');
                        gsap.to(content, {
                            opacity: 1,
                            duration: 0.4,
                            stagger: 0.05,
                            ease: 'power2.out',
                        });
                    },
                });
            } else {
                gsap.from(hero, {
                    opacity: 0,
                    y: 24,
                    duration: 0.6,
                    ease: 'power2.out',
                });
            }
        });

        return () => ctx.revert();
    }, []);

    if (!project) {
        return (
            <div className="ef-proj-missing" ref={heroRef}>
                <div>
                    <span className="ef-label">404 — project not found</span>
                    <h1 className="ef-proj-hero-title">slug «{slug}» is not in the archive.</h1>
                    <a href="#/" className="ef-linkline" data-cursor="link">
                        <span>← Back to work</span>
                    </a>
                </div>
            </div>
        );
    }

    const pxy = (mx, my, sy) => ({
        transform: `translate3d(${(mouse.x - 0.5) * mx}px, ${(mouse.y - 0.5) * my - scrollY * sy}px, 0)`,
    });

    const slugs = Object.keys(PROJECT_DB);
    const idx = slugs.indexOf(slug);
    const prev = slugs[(idx - 1 + slugs.length) % slugs.length];
    const next = slugs[(idx + 1) % slugs.length];

    return (
        <div className="ef-pp">
            <div className="ef-pp-field" aria-hidden>
                <div className="ef-rect ef-pp-rect--1" style={pxy(-12, 0, 0.18)} />
                <div className="ef-rect ef-pp-rect--2" style={pxy(10, 0, 0.25)} />
                <div className="ef-rect ef-pp-rect--3" style={pxy(-6, 0, 0.09)} />
                <div className="ef-rect ef-pp-rect--4" style={pxy(14, 0, 0.3)} />
                <div className="ef-rect ef-pp-rect--acc" style={pxy(-16, 10, 0.22)} />
                <div className="ef-rect ef-pp-rule-v" style={pxy(0, 0, 0.04)} />
                <div className="ef-rect ef-pp-rule-h" style={pxy(0, 0, 0.02)} />
                <svg className="ef-pp-cross" viewBox="0 0 40 40" style={pxy(-10, 8, 0.2)}>
                    <line x1="0" y1="20" x2="40" y2="20" />
                    <line x1="20" y1="0" x2="20" y2="40" />
                    <circle cx="20" cy="20" r="4" />
                </svg>
                <div className="ef-pp-dot" style={pxy(22, 16, 0.26)} />
            </div>

            <header className="ef-pp-hero" ref={heroRef}>
                <div className="ef-pp-meta-row">
                    <span className="ef-label">case study № {project.idx}</span>
                    <span className="ef-mono">{project.year}</span>
                </div>

                <h1 className="ef-pp-hero-title">
                    {project.title.split(' ').map((w, i) => (
                        <span key={i} className={i === 1 ? 'ef-pp-em' : ''}>
                            {w}{i < project.title.split(' ').length - 1 ? ' ' : ''}
                        </span>
                    ))}
                </h1>

                <p className="ef-pp-subtitle">{project.subtitle}</p>

                <div className="ef-pp-hero-grid">
                    <div><span className="ef-label">Client</span><p>{project.client}</p></div>
                    <div><span className="ef-label">Role</span><p>{project.role}</p></div>
                    <div><span className="ef-label">Duration</span><p>{project.duration}</p></div>
                    <div><span className="ef-label">Team</span><p>{project.team}</p></div>
                </div>
            </header>

            <section className="ef-pp-plate">
                <div className="ef-pp-plate-inner">
                    <div className="ef-pp-browser">
                        <div className="ef-pp-browser-bar">
                            <span className="ef-pp-dot-r" />
                            <span className="ef-pp-dot-r" />
                            <span className="ef-pp-dot-r" />
                            <span className="ef-pp-browser-addr ef-mono">
                                https://{project.title.toLowerCase().replace(/\s+/g, '')}.internal
                            </span>
                        </div>
                        <div className="ef-pp-browser-body">
                            <aside className="ef-pp-browser-side">
                                <div className="ef-pp-side-label ef-mono">// module</div>
                                <ul>
                                    <li className="is-active">Overview</li>
                                    <li>Accounts</li>
                                    <li>Reconciliation</li>
                                    <li>Audit trail</li>
                                    <li>Partners</li>
                                    <li>Settings</li>
                                </ul>
                                <div className="ef-pp-side-label ef-mono">// env</div>
                                <ul>
                                    <li>production</li>
                                    <li>staging</li>
                                </ul>
                            </aside>
                            <div className="ef-pp-browser-main">
                                <div className="ef-pp-browser-h">
                                    <div>
                                        <span className="ef-label">{project.title}</span>
                                        <h3>Overview</h3>
                                    </div>
                                    <div className="ef-pp-chip">
                                        <span className="ef-pp-chip-dot" />
                                        live
                                    </div>
                                </div>

                                <div className="ef-pp-stat-row">
                                    {project.metrics.slice(0, 3).map((m) => (
                                        <div key={m.k} className="ef-pp-stat">
                                            <span className="ef-label">{m.k}</span>
                                            <strong>{m.v}</strong>
                                        </div>
                                    ))}
                                </div>

                                <div className="ef-pp-chart">
                                    <svg viewBox="0 0 600 160" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
                                                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M0 120 L40 110 L80 112 L120 95 L160 100 L200 80 L240 70 L280 78 L320 55 L360 60 L400 42 L440 48 L480 30 L520 34 L560 22 L600 28 L600 160 L0 160 Z"
                                            fill="url(#chartFill)"
                                        />
                                        <path
                                            d="M0 120 L40 110 L80 112 L120 95 L160 100 L200 80 L240 70 L280 78 L320 55 L360 60 L400 42 L440 48 L480 30 L520 34 L560 22 L600 28"
                                            fill="none"
                                            stroke="var(--ink)"
                                            strokeWidth="1.4"
                                        />
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <line key={i} x1={i * 75} x2={i * 75} y1="0" y2="160" stroke="var(--rule)" strokeWidth="1" />
                                        ))}
                                    </svg>
                                </div>

                                <div className="ef-pp-rows">
                                    {[
                                        ['TX-10291', 'reconciled', 'EUR 12,402.11', '47ms'],
                                        ['TX-10290', 'reconciled', 'USD 4,812.00', '42ms'],
                                        ['TX-10289', 'reconciled', 'GBP 980.40', '51ms'],
                                        ['TX-10288', 'pending', 'EUR 221.00', '—'],
                                        ['TX-10287', 'reconciled', 'CHF 1,200.00', '39ms'],
                                    ].map((r, i) => (
                                        <div key={i} className="ef-pp-row">
                                            <span className="ef-mono">{r[0]}</span>
                                            <span className={r[1] === 'pending' ? 'ef-pp-status ef-pp-status--warn' : 'ef-pp-status'}>
                                                {r[1]}
                                            </span>
                                            <span>{r[2]}</span>
                                            <span className="ef-mono">{r[3]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ef-pp-float-card" style={{ transform: `translateY(${scrollY * -0.08}px) rotate(-2deg)` }}>
                        <span className="ef-label">// snippet</span>
                        <pre className="ef-pp-code">
{`POST /ledger/entries
  Idempotency-Key: 01JA8...
  {
    "debit": "acct_x",
    "credit": "acct_y",
    "amount": "120.00",
    "ccy": "EUR"
  }
→ 201 Created  (47ms)`}
                        </pre>
                    </div>
                </div>
            </section>

            <section className="ef-pp-narrative">
                {[
                    ['Context', project.context],
                    ['Approach', project.approach],
                    ['Outcome', project.outcome],
                ].map(([k, v], i) => (
                    <article key={k} className="ef-pp-block">
                        <header>
                            <span className="ef-mono ef-pp-block-num">§ 0{i + 1}</span>
                            <h2>{k}</h2>
                        </header>
                        <p>{v}</p>
                    </article>
                ))}
            </section>

            <section className="ef-pp-metrics">
                <header>
                    {/* 04 continues the narrative blocks above (01–03) —
                        this page numbers its own run, independent of home. */}
                    <span className="ef-label">§ 04 — Metrics</span>
                    <h2>Numbers it moved.</h2>
                </header>
                <div className="ef-pp-metrics-grid">
                    {project.metrics.map((m) => (
                        <div key={m.k} className="ef-pp-metric">
                            <strong>{m.v}</strong>
                            <span>{m.k}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="ef-pp-tech">
                <div>
                    <span className="ef-label">// stack</span>
                    <div className="ef-pp-stack-wrap">
                        {project.stack.map((s) => (
                            <span key={s} className="ef-pp-tag">{s}</span>
                        ))}
                    </div>
                </div>
                <div>
                    <span className="ef-label">// credits</span>
                    <ul className="ef-pp-credits">
                        {project.credits.map((c, i) => (
                            <li key={i}>
                                <span>{c.role}</span>
                                <em>{c.name}</em>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <nav className="ef-pp-nav">
                <a href={`#/project/${prev}`} className="ef-pp-nav-side" data-cursor="link">
                    <span className="ef-mono">← prev</span>
                    <strong>{PROJECT_DB[prev].title}</strong>
                </a>
                <a href="#/" className="ef-pp-nav-mid" data-cursor="link">
                    <span className="ef-mono">all work</span>
                    <span className="ef-pp-nav-grid" aria-hidden>
                        {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
                    </span>
                </a>
                <a href={`#/project/${next}`} className="ef-pp-nav-side ef-pp-nav-side--r" data-cursor="link">
                    <span className="ef-mono ef-pp-nav-next">
                        next <IconArrowRight size={14} stroke={1.6} />
                    </span>
                    <strong>{PROJECT_DB[next].title}</strong>
                </a>
            </nav>

            <div className="ef-pp-bigword" aria-hidden style={{ transform: `translateY(${scrollY * -0.15}px)` }}>
                case
            </div>
        </div>
    );
}
