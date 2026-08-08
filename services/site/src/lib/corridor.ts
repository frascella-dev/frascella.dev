import * as THREE from "three";
import type { Project } from "../data/site.ts";

/**
 * Shared, mutable state written by the scroll layer and read every frame by
 * the render loop. Passing an object rather than calling a setter keeps the
 * scroll handler free of per-frame work.
 */
export type CorridorState = {
    /** 0 → 1 across the projects. */
    progress: number;
    /** 1 while the intro card holds, 0 once the corridor owns the frame. */
    intro: number;
    /** 0 → 1 as the camera retreats for the outro. */
    outro: number;
};

const GAP = 10.4;

/** The camera's vertical field of view at the height the scene was framed for. */
const FOV = 38;

const SLAB_W = 1024;
const SLAB_H = 640;

/**
 * A film of white laid over the artwork, so the card reads as something lit
 * inside a dark room rather than a photograph cut out and pasted onto it.
 * It lifts the blacks and takes the edge off the saturation — which is what
 * the missing sRGB decode used to do by accident, at roughly three times
 * this strength. Keep it low: past ~0.12 it stops reading as light and
 * starts reading as haze.
 */
const FACE_LIFT = 0.08;

/**
 * The slab face: the project's own artwork, cover-fitted, with nothing on top
 * of it but the lift above — no number, no caption. Until the image arrives
 * (and for a project that has none) it falls back to the drawn hatch the
 * design started from.
 */
function paintSlab(x: CanvasRenderingContext2D, art?: HTMLImageElement) {
    if (art?.complete && art.naturalWidth) {
        const scale = Math.max(SLAB_W / art.naturalWidth, SLAB_H / art.naturalHeight);
        const w = art.naturalWidth * scale;
        const h = art.naturalHeight * scale;
        x.drawImage(art, (SLAB_W - w) / 2, (SLAB_H - h) / 2, w, h);
        x.fillStyle = `rgba(255,255,255,${FACE_LIFT})`;
        x.fillRect(0, 0, SLAB_W, SLAB_H);
        return;
    }

    x.fillStyle = "#f6f4f0";
    x.fillRect(0, 0, SLAB_W, SLAB_H);
    x.strokeStyle = "rgba(20,20,20,.10)";
    x.lineWidth = 14;
    for (let k = -SLAB_H; k < SLAB_W; k += 34) {
        x.beginPath();
        x.moveTo(k, 0);
        x.lineTo(k + SLAB_H, SLAB_H);
        x.stroke();
    }
}

function slabTexture(art?: HTMLImageElement) {
    const c = document.createElement("canvas");
    c.width = SLAB_W;
    c.height = SLAB_H;
    paintSlab(c.getContext("2d")!, art);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    // Colour data, not linear data. Without this three treats the canvas as
    // already-linear, skips the sRGB decode and still applies the encode on
    // output — which lifts the blacks and drains the saturation. It reads as
    // a haze over the photograph.
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/**
 * A column, built the way a drawing would be: solid black masses with their
 * edges traced in white. Only the edges are lit, so it reads as a line
 * drawing that occludes properly instead of a triangulated wireframe.
 */
function column(h: number, opacity: number, solidMat: THREE.Material) {
    const g = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity,
    });
    const part = (geo: THREE.BufferGeometry, y: number, thresh?: number) => {
        geo.translate(0, y, 0);
        g.add(new THREE.Mesh(geo, solidMat));
        g.add(
            new THREE.LineSegments(
                new THREE.EdgesGeometry(geo, thresh === undefined ? 14 : thresh),
                lineMat,
            ),
        );
    };

    const r = h * 0.076;
    const sh = h * 0.76;
    const yShaft = -h / 2 + h * 0.066 + sh / 2;

    // plinth
    part(new THREE.BoxGeometry(r * 3.1, h * 0.024, r * 3.1), -h / 2 + h * 0.012, 20);
    part(new THREE.CylinderGeometry(r * 1.18, r * 1.32, h * 0.026, 24, 1), -h / 2 + h * 0.037, 20);
    part(new THREE.CylinderGeometry(r * 1.04, r * 1.16, h * 0.016, 24, 1), -h / 2 + h * 0.058, 20);
    // shaft
    part(new THREE.CylinderGeometry(r * 0.84, r, sh, 24, 4, true), yShaft, 7);
    // capital
    const yNeck = yShaft + sh / 2;
    part(new THREE.CylinderGeometry(r * 0.88, r * 0.86, h * 0.012, 24, 1), yNeck + h * 0.006, 20);
    part(new THREE.CylinderGeometry(r * 0.93, r * 0.9, h * 0.01, 24, 1), yNeck + h * 0.017, 20);
    part(new THREE.CylinderGeometry(r * 1.38, r * 0.94, h * 0.044, 24, 3, true), yNeck + h * 0.044, 12);
    part(new THREE.BoxGeometry(r * 2.98, h * 0.026, r * 2.98), yNeck + h * 0.079, 20);
    part(new THREE.BoxGeometry(r * 3.12, h * 0.012, r * 3.12), yNeck + h * 0.098, 20);

    return g;
}

export type CorridorOptions = {
    /**
     * Draw the cheap version: a quarter of the dust and a capped pixel
     * ratio. The room itself — columns, camera distance, scale — is left
     * exactly as it is, because that is what the scene reads as.
     */
    lite?: boolean;
};

export function initCorridor(
    canvas: HTMLCanvasElement,
    projects: Project[],
    state: CorridorState,
    opts: CorridorOptions = {},
) {
    const lite = opts.lite ?? false;
    // Slab faces are baked once into a 2D canvas, before the artwork has
    // arrived. It lands later, so the faces are repainted when it does.
    const textures: THREE.CanvasTexture[] = [];
    const art: Record<string, HTMLImageElement> = {};

    const repaint = () => {
        projects.forEach((it, i) => {
            const t = textures[i];
            if (!t) return;
            t.image = slabTexture(art[it.title]).image;
            t.needsUpdate = true;
        });
    };

    // URLs come off the section as a data attribute — Astro optimised them at
    // build time and only it knows the hashed filenames.
    try {
        const raw = document.querySelector<HTMLElement>("[data-work]")?.dataset.slabArt;
        for (const [title, url] of Object.entries(JSON.parse(raw || "{}") as Record<string, string>)) {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => {
                art[title] = img;
                repaint();
            };
            img.src = url;
        }
    } catch {
        // No artwork is a perfectly good state — the hatch stands in.
    }

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
        return () => {};
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    cam.position.set(0, 0, 12);

    const group = new THREE.Group();
    // The outlines that hang behind each card. Kept to hand so a narrow frame
    // can pull them in closer than the desktop proportion.
    const halos: THREE.LineSegments[] = [];
    projects.forEach((_, i) => {
        const g = new THREE.Group();
        const geo = new THREE.PlaneGeometry(6.4, 4);
        textures[i] = slabTexture();
        g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: textures[i] })));
        // No outline hugging the image — only the outer one, which reads as a
        // frame the card hangs in rather than a border drawn on it.
        const halo = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(7.6, 5.2)),
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }),
        );
        halo.position.z = -0.9;
        halos.push(halo);
        g.add(halo);
        // Alternate the slabs above/below and near/far so the corridor has depth.
        g.position.set(i * GAP, i % 2 ? -0.5 : 0.5, i % 2 ? -5.2 : 1.2);
        group.add(g);
    });
    scene.add(group);

    const solidMat = new THREE.MeshBasicMaterial({
        color: 0x0b0b0b,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });

    const columns = new THREE.Group();
    // x, z, height, line opacity. The second one sits deep on purpose: the
    // camera now parks on the last slab, and at that rest position this
    // column lands square in front of it. Behind the slab it reads as a
    // backdrop instead of an obstruction.
    const layout: [number, number, number, number][] = [
        [-6.4, -8.4, 14.5, 0.34],
        [3.2, -7.5, 12.5, 0.32],
        [17.6, -7.8, 15, 0.3],
        [10.4, 3.6, 13, 0.19],
    ];
    for (const [x, z, h, o] of layout) {
        const c = column(h, o, solidMat);
        c.position.set(x, -1.4, z);
        c.rotation.y = Math.random() * 0.8;
        columns.add(c);
    }
    scene.add(columns);

    const dust = new THREE.Points(
        new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                Array.from({ length: lite ? 250 : 900 }, () => [
                    (Math.random() - 0.5) * 44,
                    (Math.random() - 0.5) * 16,
                    (Math.random() - 0.5) * 18,
                ]).flat(),
                3,
            ),
        ),
        new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.03,
            transparent: true,
            opacity: 0.4,
        }),
    );
    scene.add(dust);

    // The camera distance is fixed, on purpose: it sets the scale of the room
    // — the columns in particular — and that scale is right on a phone as it
    // stands. Only the cards rearrange for a narrow frame; see `portrait` in
    // the loop below.
    let portrait = false;

    // The height the phone's scale is pinned to — see `resize`. Re-taken
    // whenever the width changes, which is the only resize on a phone that
    // isn't the URL bar coming and going.
    let baseW = 0;
    let baseH = 0;

    const resize = () => {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        renderer.setSize(r.width, r.height, false);
        cam.aspect = r.width / r.height;

        // A phone's URL bar grows and shrinks as you scroll, and the viewport
        // with it. At a fixed vertical field of view every one of those
        // changes rescales the whole room, which is distracting in the middle
        // of a scroll. So hold the world-units-per-pixel the first layout
        // gave us and widen the field of view to match the new height
        // instead: the cards keep exactly the size they had, and the strip
        // the bar hands back simply shows more of the room.
        if (lite) {
            if (r.width !== baseW) {
                baseW = r.width;
                baseH = r.height;
            }
            const half = Math.tan((FOV * Math.PI) / 360) * (r.height / baseH);
            cam.fov = (2 * Math.atan(half) * 180) / Math.PI;
        }

        cam.updateProjectionMatrix();
        portrait = cam.aspect < 0.9;
    };
    resize();
    addEventListener("resize", resize);

    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;
    // Starts off to the left of the first slab so the intro flies in.
    let camX = -12.5;
    const onPointer = (e: PointerEvent) => {
        mx = e.clientX / innerWidth - 0.5;
        my = e.clientY / innerHeight - 0.5;
    };
    addEventListener("pointermove", onPointer, { passive: true });

    const total = (projects.length - 1) * GAP;
    let raf = 0;
    let stopped = false;

    // Fading the shared materials means remembering what they started at.
    const setOp = (mat: THREE.Material & { opacity: number; __base?: number }, k: number) => {
        if (mat.__base === undefined) mat.__base = mat.opacity;
        mat.transparent = true;
        mat.opacity = mat.__base * k;
    };

    const tick = () => {
        if (stopped) return;
        raf = requestAnimationFrame(tick);

        const out = state.outro;
        // Ease toward the target rather than snapping — the camera keeps
        // gliding for a beat after the scroll stops.
        camX += (state.progress * total - state.intro * 12.5 - camX) * 0.075;
        cx += (mx - cx) * 0.06;
        cy += (my - cy) * 0.06;
        cam.position.set(camX + cx * 1.5, -cy * 1.1 + out * 2.4, 12 + out * 16);
        cam.lookAt(camX + cx * 0.6, -cy * 0.5 + out * 2.4, 0);

        const fade = 1 - out;
        for (const g of group.children) {
            for (const ch of (g as THREE.Group).children) {
                const mat = (ch as THREE.Mesh).material as THREE.Material & { opacity: number };
                if (mat) setOp(mat, fade);
            }
        }
        for (const c of columns.children) {
            for (const ch of (c as THREE.Group).children) {
                const mat = (ch as THREE.Mesh).material as THREE.Material & { opacity: number };
                if (mat && mat.type === "LineBasicMaterial") setOp(mat, 1 - out * 0.8);
            }
        }

        const now = performance.now();
        group.children.forEach((g, i) => {
            const d = (g.position.x - camX) / GAP;
            // Upright, the cards sit on one plane and barely turn — you get
            // one at a time, face on. Wide, they stagger in depth and swing
            // past like the walls of a corridor.
            g.rotation.y = -d * (portrait ? 0.16 : 0.42);
            g.rotation.z = d * (portrait ? 0.008 : 0.02);
            g.position.z = portrait ? -3 : i % 2 ? -5.2 : 1.2;
            g.position.y =
                (portrait ? 0 : i % 2 ? -0.5 : 0.5) + Math.sin(now / 2600 + i) * 0.12;
            // Smaller in a portrait frame: at full size the card crowds the
            // caption underneath it on a phone.
            const base = portrait ? 0.81 : 1;
            g.scale.setScalar(base * (1 - Math.min(0.22, Math.abs(d) * 0.12)));
            // …and the outline sits closer in, so the card doesn't read as
            // floating inside a frame two sizes too big for it. Tight in
            // either frame; a touch tighter still on a phone.
            halos[i]?.scale.setScalar(portrait ? 0.92 : 0.945);
        });

        // Parallax: the columns and dust drift slower than the slabs.
        columns.position.x = camX * 0.62;
        columns.position.y = -1.4 + Math.sin(now / 5200) * 0.12;
        dust.rotation.y += 0.0004;
        dust.position.x = camX * 0.6;

        renderer.render(scene, cam);
    };
    tick();

    return () => {
        stopped = true;
        cancelAnimationFrame(raf);
        removeEventListener("resize", resize);
        removeEventListener("pointermove", onPointer);
        renderer.dispose();
    };
}
