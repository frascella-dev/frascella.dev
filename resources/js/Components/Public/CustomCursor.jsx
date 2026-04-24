import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const [label, setLabel] = useState('');
    const [variant, setVariant] = useState('default');

    useEffect(() => {
        const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const ring = { x: pos.x, y: pos.y };

        const onMove = (e) => {
            pos.x = e.clientX;
            pos.y = e.clientY;
            if (dotRef.current) {
                dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
            }
        };

        const raf = () => {
            ring.x += (pos.x - ring.x) * 0.18;
            ring.y += (pos.y - ring.y) * 0.18;
            if (ringRef.current) {
                ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
            }
            requestAnimationFrame(raf);
        };
        const id = requestAnimationFrame(raf);

        const onOver = (e) => {
            const t = e.target.closest('[data-cursor]');
            if (t) {
                setVariant(t.dataset.cursor);
                setLabel(t.dataset.cursorLabel || '');
            } else if (e.target.closest('a, button')) {
                setVariant('link');
                setLabel('');
            } else {
                setVariant('default');
                setLabel('');
            }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseover', onOver);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseover', onOver);
            cancelAnimationFrame(id);
        };
    }, []);

    return (
        <>
            <div ref={dotRef} className={`ef-cursor-dot ef-cursor-${variant}`} />
            <div ref={ringRef} className={`ef-cursor-ring ef-cursor-${variant}`}>
                {label && <span className="ef-cursor-label">{label}</span>}
            </div>
        </>
    );
}
