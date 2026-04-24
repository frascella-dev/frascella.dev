import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import Lenis from 'lenis';

import CustomCursor from '../Components/CustomCursor.jsx';
import Nav, { useRoute } from '../Components/Nav.jsx';
import Splash from '../Components/Splash.jsx';
import Hero from '../Components/Hero.jsx';
import Work from '../Components/Work.jsx';
import About from '../Components/About.jsx';
import Contact from '../Components/Contact.jsx';
import ProjectPage from '../Components/ProjectPage.jsx';

export default function Portfolio() {
    const [booted, setBooted] = useState(() => {
        try {
            return sessionStorage.getItem('ef-splash-seen') === '1';
        } catch {
            return false;
        }
    });
    const routeSlug = useRoute();
    const onDetail = !!routeSlug;

    useEffect(() => {
        if (!booted) return;
        const lenis = new Lenis({
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.4,
        });
        const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);

        const onClick = (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute('href');
            const id = href.slice(1);
            if (!id) return;
            const el = document.getElementById(id);
            if (!el) return;
            e.preventDefault();
            lenis.scrollTo(el, { offset: -20, duration: 1.4 });
        };
        document.addEventListener('click', onClick);

        const fill = document.getElementById('ef-scroll-fill');
        const onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const p = max > 0 ? window.scrollY / max : 0;
            if (fill) fill.style.setProperty('--p', p);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        return () => {
            document.removeEventListener('click', onClick);
            window.removeEventListener('scroll', onScroll);
            lenis.destroy();
        };
    }, [booted]);

    return (
        <>
            <Head title="Emanuele Frascella — Backend engineer" />

            <div className="ef-scroll-bar" aria-hidden>
                <div className="ef-scroll-bar-fill" id="ef-scroll-fill" />
            </div>

            {!booted && <Splash onDone={() => setBooted(true)} />}
            <CustomCursor />
            <Nav />
            <main style={{ opacity: booted ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                {onDetail ? (
                    <ProjectPage />
                ) : (
                    <>
                        <Hero />
                        <Work />
                        <About />
                        <Contact />
                    </>
                )}
            </main>
        </>
    );
}
