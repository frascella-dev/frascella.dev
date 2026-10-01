/**
 * The custom cursor, ported from v1's `CustomCursor.tsx`. The dot is moved
 * on the pointer event itself so it never lags; the ring is eased toward the
 * same point on its own frame loop, which is the whole trick.
 *
 * What is under the pointer decides the variant, written to `data-variant`
 * on both elements for `styles/cursor.css` to pick up:
 *   [data-cursor="…"]  wins, and may carry [data-cursor-label]
 *   any <a> or <button> falls back to "link"
 *   everything else is "default"
 *
 * The dark scheme is read from the nearest [data-cursor-scheme] ancestor,
 * with `<html data-cursor-scheme>` as the fallback — the work corridor is a
 * fixed overlay with pointer-events off, so nothing under the pointer there
 * can report that the page has gone black. `lib/scroll.ts` sets the root
 * attribute instead.
 */
export function initCursor(root: ParentNode = document) {
    // A cursor replacement only makes sense where there is a cursor. This
    // query is the same one `styles/cursor.css` uses to hide the native
    // pointer — if the two ever disagree, someone loses their cursor.
    if (!matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)").matches) {
        return;
    }

    const dot = root.querySelector<HTMLElement>("[data-cursor-dot]");
    const ring = root.querySelector<HTMLElement>("[data-cursor-ring]");
    const label = root.querySelector<HTMLElement>("[data-cursor-ring-label]");
    if (!dot || !ring) return;

    let px = innerWidth / 2;
    let py = innerHeight / 2;
    let rx = px;
    let ry = py;
    let variant = "";
    let scheme = "";

    /** Reads what is under a hit-tested element and repaints if it changed. */
    const resolve = (target: Element | null | undefined) => {
        if (!target?.closest) return;

        const tagged = target.closest<HTMLElement>("[data-cursor]");
        const nextVariant = tagged
            ? tagged.dataset.cursor!
            : target.closest("a, button")
              ? "link"
              : "default";
        const nextScheme =
            target.closest<HTMLElement>("[data-cursor-scheme]")?.dataset.cursorScheme ??
            document.documentElement.dataset.cursorScheme ??
            "light";
        const nextLabel = tagged?.dataset.cursorLabel ?? "";

        if (nextVariant !== variant) {
            variant = nextVariant;
            dot.dataset.variant = variant;
            ring.dataset.variant = variant;
        }
        if (nextScheme !== scheme) {
            scheme = nextScheme;
            dot.dataset.scheme = scheme;
            ring.dataset.scheme = scheme;
        }
        if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
    };

    // Scrolling moves the page under a stationary pointer, and `mouseover`
    // does not fire for that — without this, leaving a dark section by
    // scrolling would keep the cursor inverted over white. `elementFromPoint`
    // is a hit test, so it is coalesced to one per frame rather than one per
    // scroll event.
    let queued = false;
    const resolveAtPointer = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            resolve(document.elementFromPoint(px, py));
        });
    };

    const onMove = (e: PointerEvent) => {
        px = e.clientX;
        py = e.clientY;
        dot.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
        // Until the pointer has moved once we don't know where it is, so both
        // elements stay hidden rather than parked in the top-left corner.
        if (!dot.dataset.ready) {
            dot.dataset.ready = "1";
            ring.dataset.ready = "1";
            rx = px;
            ry = py;
        }
    };

    const onOver = (e: Event) => resolve(e.target as Element);

    // The corridor flips the root attribute mid-scroll, without the pointer
    // having moved.
    const observer = new MutationObserver(resolveAtPointer);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-cursor-scheme"],
    });

    let raf = 0;
    const tick = () => {
        raf = requestAnimationFrame(tick);
        rx += (px - rx) * 0.18;
        ry += (py - ry) * 0.18;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    };
    tick();

    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("mouseover", onOver, { passive: true });
    addEventListener("scroll", resolveAtPointer, { passive: true });
    resolve(document.body);

    return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        removeEventListener("pointermove", onMove);
        removeEventListener("mouseover", onOver);
        removeEventListener("scroll", resolveAtPointer);
    };
}
