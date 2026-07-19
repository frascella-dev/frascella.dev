import { useEffect, useState } from 'react';
import Logo from './Logo.tsx';
import { useScrollY } from './Hooks.tsx';
import { PROJECT_DB } from './ProjectPage.tsx';

// Reactive hash route — returns the slug if on #/project/:slug, else null
export function useRoute() {
    const read = () => {
        if (typeof window === 'undefined') return null;
        const h = (window.location.hash || '').replace(/^#\/?/, '');
        const m = h.match(/^project\/([^/?#]+)/);
        return m ? decodeURIComponent(m[1]) : null;
    };
    const [slug, setSlug] = useState(read);
    useEffect(() => {
        const on = () => setSlug(read());
        window.addEventListener('hashchange', on);
        return () => window.removeEventListener('hashchange', on);
    }, []);
    return slug;
}

export default function Nav() {
    const y = useScrollY();
    const small = y > 40;
    const [active, setActive] = useState('top');
    const routeSlug = useRoute();
    const onDetail = !!routeSlug;

    const [projectMeta, setProjectMeta] = useState(null);
    useEffect(() => {
        if (!onDetail) {
            setProjectMeta(null);
            return;
        }
        const proj = PROJECT_DB[routeSlug];
        if (proj) setProjectMeta({ idx: proj.idx, title: proj.title, slug: routeSlug });
        else setProjectMeta({ idx: '—', title: routeSlug, slug: routeSlug });
    }, [onDetail, routeSlug]);

    useEffect(() => {
        if (onDetail) return;
        const ids = ['top', 'work', 'about', 'contact'];
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) setActive(e.target.id);
                });
            },
            { rootMargin: '-40% 0px -55% 0px' }
        );
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) io.observe(el);
        });
        return () => io.disconnect();
    }, [onDetail]);

    if (onDetail) {
        return (
            <nav className={`ef-nav ef-nav-detail ${small ? 'is-small' : ''}`}>
                <a href="#/" className="ef-nav-mark" data-cursor="link">
                    <Logo size={30} className="ef-mark-logo" />
                    <span className="ef-mark-line" />
                    <span className="ef-mono ef-mark-ver">Emanuele Frascella — v.2026</span>
                </a>

                <div className="ef-nav-center">
                    <a href="#work" className="ef-nav-back" data-cursor="link">
                        <span className="ef-nav-back-arrow" aria-hidden>
                            <svg viewBox="0 0 20 20" width="14" height="14">
                                <path d="M12 4l-6 6 6 6M6 10h12" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="square" />
                            </svg>
                        </span>
                        <span>All work</span>
                    </a>
                    {projectMeta && (
                        <div className="ef-nav-context">
                            <span className="ef-mono">case № {projectMeta.idx}</span>
                            <span className="ef-nav-dot" aria-hidden />
                            <span className="ef-nav-ctx-title">{projectMeta.title}</span>
                        </div>
                    )}
                </div>

                <div className="ef-nav-cta">
                    <a href="#contact" className="ef-nav-btn" data-cursor="link">
                        <span>Say hello</span>
                        <span className="ef-nav-btn-dot" />
                    </a>
                </div>
            </nav>
        );
    }

    const items = [
        { id: 'top', n: '01', t: 'Index' },
        { id: 'work', n: '02', t: 'Work' },
        { id: 'about', n: '03', t: 'About' },
        { id: 'contact', n: '04', t: 'Contact' },
    ];

    return (
        <nav className={`ef-nav ${small ? 'is-small' : ''}`}>
            <a href="#top" className="ef-nav-mark" data-cursor="link">
                <Logo size={30} className="ef-mark-logo" />
                <span className="ef-mark-line" />
                <span className="ef-mono ef-mark-ver">Emanuele Frascella — v.2026</span>
            </a>
            <ul className="ef-nav-items">
                {items.map((it) => (
                    <li key={it.id}>
                        <a
                            href={`#${it.id}`}
                            className={active === it.id ? 'is-active' : ''}
                            data-cursor="link"
                        >
                            <span className="ef-mono">{it.n}</span>
                            <span>{it.t}</span>
                        </a>
                    </li>
                ))}
            </ul>
            <div className="ef-nav-cta">
                <a href="#contact" className="ef-nav-btn" data-cursor="link">
                    <span>Say hello</span>
                    <span className="ef-nav-btn-dot" />
                </a>
            </div>
        </nav>
    );
}
