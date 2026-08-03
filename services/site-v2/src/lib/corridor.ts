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

/** The slab face: a hatched card with its index and label drawn into it. */
function slabTexture(label: string, i: number) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 640;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f6f4f0";
    x.fillRect(0, 0, 1024, 640);
    x.strokeStyle = "rgba(20,20,20,.10)";
    x.lineWidth = 14;
    for (let k = -640; k < 1024; k += 34) {
        x.beginPath();
        x.moveTo(k, 0);
        x.lineTo(k + 640, 640);
        x.stroke();
    }
    x.fillStyle = "#141414";
    x.font = '400 104px Gloock, serif';
    x.fillText(String(i + 1).padStart(2, "0"), 44, 132);
    x.font = '500 24px "Schibsted Grotesk", Helvetica, sans-serif';
    x.fillText(label, 44, 596);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
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
    // Slab faces are baked once into a 2D canvas. Bake them before Gloock
    // and Schibsted Grotesk arrive and they are baked in the fallback face
    // forever — so refresh the textures when the fonts land.
    const textures: THREE.CanvasTexture[] = [];
    document.fonts?.ready.then(() => {
        projects.forEach((it, i) => {
            const t = textures[i];
            if (!t) return;
            const next = slabTexture(it.tag, i);
            t.image = next.image;
            t.needsUpdate = true;
        });
    });

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
        return () => {};
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    cam.position.set(0, 0, 12);

    const group = new THREE.Group();
    projects.forEach((it, i) => {
        const g = new THREE.Group();
        const geo = new THREE.PlaneGeometry(6.4, 4);
        textures[i] = slabTexture(it.tag, i);
        g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: textures[i] })));
        g.add(
            new THREE.LineSegments(
                new THREE.EdgesGeometry(geo),
                new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
            ),
        );
        const halo = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(7.6, 5.2)),
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }),
        );
        halo.position.z = -0.9;
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
    const layout: [number, number, number, number][] = [
        [-6.4, -8.4, 14.5, 0.34],
        [3.2, -3.1, 12.5, 0.32],
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

    const resize = () => {
        const r = canvas.getBoundingClientRect();
        if (!r.width) return;
        renderer.setSize(r.width, r.height, false);
        cam.aspect = r.width / r.height;
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
            g.scale.setScalar(1 - Math.min(0.22, Math.abs(d) * 0.12));
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
