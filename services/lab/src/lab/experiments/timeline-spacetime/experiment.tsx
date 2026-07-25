import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import LabStage from "../../LabStage.tsx";
import { timeline } from "../../../data/timeline.ts";
import "./spacetime.css";

// The About timeline read as spacetime curvature. A wireframe sheet is
// tensioned across the frame and viewed at a low raking angle, the way every
// textbook draws general relativity — flat until something sits on it.
// Scrolling drags a probe along the sheet's time axis, and as it nears each
// of the six career events a mass (an edges-only wire sphere, never a shaded
// solid) drops out of the sky, lands, and bends the grid into a well exactly
// where it comes to rest. Scroll back and the mass lifts off and the grid
// relaxes — everything here is a pure, reversible function of scroll
// progress, not a one-shot animation.

const PAPER = "#EEEAE0";
const INK = "#111110";
const ACCENT = "#FF6B1A"; // now
const ACCENT_2 = "#C7F651"; // origin

const GRID_HALF_W = 6.2; // time axis half-extent
const GRID_HALF_D = 3.4; // cross-axis half-extent ("width" of the sheet)
const EFF_HALF_W = GRID_HALF_W * 0.84; // events stay off the very edge
const EDGE_BOW = 0.55; // the sheet sags toward its centre even with no mass
const Z_COMPRESS = 0.8; // wells read narrower in z than in x — an ellipse, not a circle
const FOCUS_WINDOW = 0.1;
const PROBE_R = 0.22;

// ---- fall physics — every quantity below is a pure function of scroll
// progress `p`, never of real elapsed time, so scrubbing back and forth
// always reverses cleanly (no timers, no one-shot state). ----
const APPROACH_WINDOW = 0.075; // how much of the scroll range the fall itself spans
const SHOW_AHEAD = APPROACH_WINDOW * 1.6; // the mass is visible, waiting, a bit before it drops
const BOUNCE_WINDOW = 0.05; // scroll span the landing bounce plays out over
const BOUNCE_AMPLITUDE = 0.46;
const FALL_START_Y = 3.4; // where each mass starts, high above the sheet

function prefersReducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
}

function smootherstep(t) {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * c * (c * (c * 6 - 15) + 10);
}

// ---- the six wells — real timeline data, positioned & weighted ----
// depth/width stand in for "how much this mattered": the origin and the
// current chapter dig the deepest; everything between grows gradually.
const wells = timeline.map((entry, i) => {
    const isNow = entry.kind === "now";
    const isOrigin = i === 0;
    const t = timeline.length > 1 ? i / (timeline.length - 1) : 0;
    const amp = isNow ? 1.65 : isOrigin ? 1.2 : 0.55 + t * 0.55;
    const sigma = isNow ? 1.55 : isOrigin ? 1.3 : 0.85 + t * 0.35;
    const color = isNow ? ACCENT : isOrigin ? ACCENT_2 : INK;
    const cx = THREE.MathUtils.lerp(-EFF_HALF_W, EFF_HALF_W, entry.fraction);
    const radius = 0.26 + amp * 0.13;
    return { ...entry, index: i, cx, cz: 0, amp, sigma, color, radius };
});

// This well's current depth (0 → amp) at scroll progress p — smooth,
// monotonic, fully reversible.
function currentAmp(well, p) {
    const local = THREE.MathUtils.clamp(
        (p - (well.fraction - APPROACH_WINDOW)) / APPROACH_WINDOW,
        0,
        1,
    );
    return well.amp * smootherstep(local);
}

function ampsAt(p) {
    return wells.map((w) => currentAmp(w, p));
}

function edgeBow(x, z) {
    const nx = x / GRID_HALF_W;
    const nz = z / GRID_HALF_D;
    return EDGE_BOW * (nx * nx * 0.55 + nz * nz * 0.95);
}

// The sheet's height at any point, given each well's *current* amplitude —
// a shallow tensioned bowl, minus the sum of however far each mass has sunk
// in so far. Pure function of (x, z, amps); called to rebuild the grid mesh
// every frame and to place the probe, worldline and masses consistently.
function heightAt(x, z, amps) {
    let sum = 0;
    for (let i = 0; i < wells.length; i++) {
        const w = wells[i];
        const dx = x - w.cx;
        const dz = (z - w.cz) / Z_COMPRESS;
        const d2 = dx * dx + dz * dz;
        sum += amps[i] * Math.exp(-d2 / (2 * w.sigma * w.sigma));
    }
    return edgeBow(x, z) - sum;
}

function yearAtProgress(p) {
    const first = wells[0];
    const last = wells[wells.length - 1];
    if (p <= first.fraction) return `${first.year}`;
    if (p >= last.fraction) return `${last.year}`;
    for (let i = 0; i < wells.length - 1; i++) {
        const a = wells[i];
        const b = wells[i + 1];
        if (p >= a.fraction && p <= b.fraction) {
            const local = (p - a.fraction) / (b.fraction - a.fraction);
            return String(Math.round(a.year + (b.year - a.year) * local));
        }
    }
    return String(last.year);
}

function mixColor(base, target, amount) {
    return base.clone().lerp(target, THREE.MathUtils.clamp(amount, 0, 1));
}

// Per-vertex colour: a depth fade (near = ink, far = paper — the fog's own
// colour, so it reads as fainter rather than merely darker) plus a soft
// tint borrowed from whichever well's dimple the point sits inside — the
// tint itself grows in only as that well's mass actually lands.
function vertexColor(x, z, fade, amps) {
    const paper = new THREE.Color(PAPER);
    const ink = new THREE.Color(INK);
    let base = mixColor(paper, ink, fade);

    const tint = new THREE.Color(0, 0, 0);
    let wsum = 0;
    let maxInf = 0;
    for (let i = 0; i < wells.length; i++) {
        const w = wells[i];
        const dx = x - w.cx;
        const dz = (z - w.cz) / Z_COMPRESS;
        const d2 = dx * dx + dz * dz;
        const settle = w.amp > 0 ? amps[i] / w.amp : 0;
        const inf = Math.exp(-d2 / (2 * w.sigma * w.sigma)) * settle;
        tint.r += new THREE.Color(w.color).r * inf;
        tint.g += new THREE.Color(w.color).g * inf;
        tint.b += new THREE.Color(w.color).b * inf;
        wsum += inf;
        if (inf > maxInf) maxInf = inf;
    }
    if (wsum > 1e-4) {
        tint.multiplyScalar(1 / wsum);
        base = mixColor(base, tint, Math.min(0.55, maxInf * 0.8));
    }
    return base;
}

/* ============================================================
   Grid rig — a fixed lattice of (x, z) sample points wired into one
   LineSegments draw call (edges only, never a triangulated surface). Each
   frame only the Y channel and the colour buffer are rewritten in place —
   the sampling grid itself never changes shape or allocates again.
   ============================================================ */
function buildGridRig({ halfW, halfD, nx, nz, colFade = 1 }) {
    const xs = new Array(nx + 1);
    for (let i = 0; i <= nx; i++) xs[i] = -halfW + (i / nx) * halfW * 2;
    const zs = new Array(nz + 1);
    for (let j = 0; j <= nz; j++) zs[j] = -halfD + (j / nz) * halfD * 2;

    const totalSeg = (nz + 1) * nx + (nx + 1) * nz;
    const positions = new Float32Array(totalSeg * 2 * 3);
    const colors = new Float32Array(totalSeg * 2 * 3);

    // Fixed per-vertex descriptors — built once, read every frame.
    const vx = new Float32Array(totalSeg * 2);
    const vz = new Float32Array(totalSeg * 2);
    const vFade = new Float32Array(totalSeg * 2); // static depth fade (z-based)
    const vColFactor = new Float32Array(totalSeg * 2); // 1 for rows, colFade for columns

    let k = 0;
    const record = (i, j, factor) => {
        vx[k] = xs[i];
        vz[k] = zs[j];
        const t = THREE.MathUtils.clamp((zs[j] + halfD) / (halfD * 2), 0, 1);
        vFade[k] = THREE.MathUtils.lerp(0.16, 0.94, t);
        vColFactor[k] = factor;
        positions[k * 3] = xs[i];
        positions[k * 3 + 2] = zs[j];
        k++;
    };
    for (let j = 0; j <= nz; j++) {
        for (let i = 0; i < nx; i++) {
            record(i, j, 1);
            record(i + 1, j, 1);
        }
    }
    for (let i = 0; i <= nx; i++) {
        for (let j = 0; j < nz; j++) {
            record(i, j, colFade);
            record(i, j + 1, colFade);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, fog: true });
    const obj = new THREE.LineSegments(geo, mat);
    obj.raycast = () => null;

    const vertexCount = vx.length;
    const paperCol = new THREE.Color(PAPER);

    function update(amps) {
        const posArr = geo.attributes.position.array;
        const colArr = geo.attributes.color.array;
        for (let n = 0; n < vertexCount; n++) {
            const x = vx[n];
            const z = vz[n];
            posArr[n * 3 + 1] = heightAt(x, z, amps);
            const col = vertexColor(x, z, vFade[n], amps);
            const factor = vColFactor[n];
            const final = factor < 1 ? mixColor(col, paperCol, 1 - factor) : col;
            colArr[n * 3] = final.r;
            colArr[n * 3 + 1] = final.g;
            colArr[n * 3 + 2] = final.b;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
    }

    return { obj, update };
}

function MainGrid({ progressRef, reduced }) {
    const rig = useMemo(
        () => buildGridRig({ halfW: GRID_HALF_W, halfD: GRID_HALF_D, nx: 88, nz: 44, colFade: 0.8 }),
        [],
    );
    useEffect(
        () => () => {
            rig.obj.geometry.dispose();
            rig.obj.material.dispose();
        },
        [rig],
    );
    useFrame(() => {
        const p = reduced ? 1 : progressRef.current;
        rig.update(ampsAt(p));
    });
    return <primitive object={rig.obj} />;
}

// The undisturbed reference plane, further back and lower — flat spacetime,
// there for contrast. Built once and never touched again.
function buildReferenceGrid() {
    const nx = 26;
    const nz = 13;
    const halfW = GRID_HALF_W * 1.18;
    const halfD = GRID_HALF_D * 1.18;
    const xs = new Array(nx + 1);
    for (let i = 0; i <= nx; i++) xs[i] = -halfW + (i / nx) * halfW * 2;
    const zs = new Array(nz + 1);
    for (let j = 0; j <= nz; j++) zs[j] = -halfD + (j / nz) * halfD * 2;

    const yOffset = -2.5;
    const zOffset = -1.4;
    const totalSeg = (nz + 1) * nx + (nx + 1) * nz;
    const positions = new Float32Array(totalSeg * 2 * 3);
    const colors = new Float32Array(totalSeg * 2 * 3);
    let p = 0;
    let c = 0;
    const flatInk = new THREE.Color(INK);
    const paperCol = new THREE.Color(PAPER);
    const push = (i, j, colFade) => {
        positions[p++] = xs[i];
        positions[p++] = edgeBow(xs[i], zs[j]) * 0.32 + yOffset;
        positions[p++] = zs[j] + zOffset;
        const col = mixColor(flatInk, paperCol, 1 - colFade);
        colors[c++] = col.r;
        colors[c++] = col.g;
        colors[c++] = col.b;
    };
    for (let j = 0; j <= nz; j++) {
        for (let i = 0; i < nx; i++) {
            push(i, j, 1);
            push(i + 1, j, 1);
        }
    }
    for (let i = 0; i <= nx; i++) {
        for (let j = 0; j < nz; j++) {
            push(i, j, 0.6);
            push(i, j + 1, 0.6);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        fog: true,
    });
    const obj = new THREE.LineSegments(geo, mat);
    obj.raycast = () => null;
    return obj;
}

function ReferenceGrid() {
    const obj = useMemo(buildReferenceGrid, []);
    useEffect(
        () => () => {
            obj.geometry.dispose();
            obj.material.dispose();
        },
        [obj],
    );
    return <primitive object={obj} />;
}

// The probe's worldline — the path it has actually traced across the
// live-curved sheet so far, redrawn each frame. Well placement is linear in
// fraction, so the tip position is a plain lerp — no segment search needed.
const WORLDLINE_SAMPLES = 220;
function Worldline({ progressRef, reduced }) {
    const geometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(WORLDLINE_SAMPLES * 3), 3),
        );
        return g;
    }, []);
    const lineObj = useMemo(() => {
        const mat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.82 });
        const obj = new THREE.Line(geometry, mat);
        obj.raycast = () => null;
        return obj;
    }, [geometry]);

    useFrame(() => {
        const p = reduced ? 1 : progressRef.current;
        const amps = ampsAt(p);
        const xEnd = THREE.MathUtils.lerp(-EFF_HALF_W, EFF_HALF_W, p);
        const span = THREE.MathUtils.clamp((xEnd - -EFF_HALF_W) / (EFF_HALF_W * 2), 0, 1);
        const count = Math.max(2, Math.round(WORLDLINE_SAMPLES * span));
        const arr = geometry.attributes.position.array;
        for (let k = 0; k < count; k++) {
            const t = count <= 1 ? 0 : k / (count - 1);
            const x = THREE.MathUtils.lerp(-EFF_HALF_W, xEnd, t);
            arr[k * 3] = x;
            arr[k * 3 + 1] = heightAt(x, 0, amps) + 0.035;
            arr[k * 3 + 2] = 0;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.setDrawRange(0, count);
    });

    return <primitive object={lineObj} />;
}

function Probe({ progressRef, reduced, groupRef }) {
    const diamondObj = useMemo(() => {
        const pts = [
            new THREE.Vector3(0, 0, -PROBE_R),
            new THREE.Vector3(PROBE_R, 0, 0),
            new THREE.Vector3(0, 0, PROBE_R),
            new THREE.Vector3(-PROBE_R, 0, 0),
            new THREE.Vector3(0, 0, -PROBE_R),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.92 });
        const obj = new THREE.Line(geo, mat);
        obj.raycast = () => null;
        return obj;
    }, []);
    const coreObj = useMemo(() => {
        const pts = [
            new THREE.Vector3(0, 0, -PROBE_R * 0.42),
            new THREE.Vector3(PROBE_R * 0.42, 0, 0),
            new THREE.Vector3(0, 0, PROBE_R * 0.42),
            new THREE.Vector3(-PROBE_R * 0.42, 0, 0),
            new THREE.Vector3(0, 0, -PROBE_R * 0.42),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95 });
        const obj = new THREE.Line(geo, mat);
        obj.raycast = () => null;
        return obj;
    }, []);
    const labelRef = useRef(null);

    useFrame(() => {
        const p = reduced ? 1 : progressRef.current;
        const amps = ampsAt(p);
        const x = THREE.MathUtils.lerp(-EFF_HALF_W, EFF_HALF_W, p);
        const y = heightAt(x, 0, amps) + 0.05;
        if (groupRef.current) groupRef.current.position.set(x, y, 0);
        if (labelRef.current) labelRef.current.textContent = yearAtProgress(p);
    });

    return (
        <group ref={groupRef}>
            <primitive object={diamondObj} />
            <primitive object={coreObj} />
            <Html position={[0, 0.46, 0]} center>
                <div className="spt-probe-label ef-mono" ref={labelRef} />
            </Html>
        </group>
    );
}

// One well: the crater rim (traces the live grid contour, grows in as the
// mass lands), the falling/resting mass itself (edges-only wire sphere —
// a THREE.EdgesGeometry over a low-poly icosahedron, never a shaded solid
// nor a `wireframe` material), and its year/kind tag.
const RING_SEGMENTS = 40;
function WellMarker({ well, index, refsRef, progressTargetRef, progressRef, reduced }) {
    const ringGeo = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array((RING_SEGMENTS + 1) * 3), 3),
        );
        return g;
    }, []);
    const ringObj = useMemo(() => {
        const mat = new THREE.LineBasicMaterial({ color: well.color, transparent: true, opacity: 0.42 });
        const obj = new THREE.Line(ringGeo, mat);
        obj.raycast = () => null;
        return obj;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ringGeo]);

    const sphereObj = useMemo(() => {
        const ico = new THREE.IcosahedronGeometry(well.radius, 1);
        const edges = new THREE.EdgesGeometry(ico);
        ico.dispose();
        const mat = new THREE.LineBasicMaterial({ color: well.color, transparent: true, opacity: 0.9 });
        const obj = new THREE.LineSegments(edges, mat);
        obj.raycast = () => null;
        obj.visible = false;
        return obj;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const arr = refsRef.current;
        arr[index] = { ...(arr[index] || {}), ring: ringObj, sphere: sphereObj };
        return () => {
            ringGeo.dispose();
            ringObj.material.dispose();
            sphereObj.geometry.dispose();
            sphereObj.material.dispose();
        };
    }, [ringObj, sphereObj, ringGeo, index, refsRef]);

    const setLabelRef = (el) => {
        const arr = refsRef.current;
        arr[index] = { ...(arr[index] || {}), label: el };
    };

    useFrame(() => {
        const p = reduced ? 1 : progressRef.current;
        const amps = ampsAt(p);
        const amp = amps[well.index];
        const settle = well.amp > 0 ? amp / well.amp : 0;

        // ring — hugs the live surface, radius grows in with the well.
        const rx = well.sigma * 1.05 * (0.2 + settle * 0.8);
        const rz = rx * Z_COMPRESS;
        const posArr = ringGeo.attributes.position.array;
        for (let k = 0; k <= RING_SEGMENTS; k++) {
            const a = (k / RING_SEGMENTS) * Math.PI * 2;
            const x = well.cx + Math.cos(a) * rx;
            const z = well.cz + Math.sin(a) * rz;
            posArr[k * 3] = x;
            posArr[k * 3 + 1] = heightAt(x, z, amps) + 0.03;
            posArr[k * 3 + 2] = z;
        }
        ringGeo.attributes.position.needsUpdate = true;
        ringObj.material.opacity = 0.2 + settle * 0.4;

        // mass — falls from the sky, lands, bounces once, then rests.
        const floorY = heightAt(well.cx, well.cz, amps);
        const leadIn = well.fraction - SHOW_AHEAD;
        sphereObj.visible = p >= leadIn;
        if (sphereObj.visible) {
            let y;
            if (p < well.fraction) {
                const fallT = THREE.MathUtils.clamp(
                    (p - (well.fraction - APPROACH_WINDOW)) / APPROACH_WINDOW,
                    0,
                    1,
                );
                const eased = fallT * fallT;
                y = THREE.MathUtils.lerp(FALL_START_Y, floorY + well.radius, eased);
            } else {
                const s = THREE.MathUtils.clamp((p - well.fraction) / BOUNCE_WINDOW, 0, 1.6);
                const bounce = Math.exp(-s * 3.2) * Math.sin(s * Math.PI * 2.4) * BOUNCE_AMPLITUDE;
                y = floorY + well.radius * 0.55 + Math.max(0, bounce);
            }
            sphereObj.position.set(well.cx, y, well.cz);
            if (!reduced) {
                sphereObj.rotation.y += 0.006;
                sphereObj.rotation.x += 0.003;
            }
        }

        const refs = refsRef.current[index];
        if (refs?.label) {
            refs.label.style.display = p >= leadIn ? "flex" : "none";
        }
    });

    const labelY = heightAt(well.cx, well.cz, wells.map((w) => w.amp)) + well.sigma * 0.4 + 0.55;

    return (
        <group>
            <primitive object={ringObj} />
            <primitive object={sphereObj} />
            <mesh
                position={[well.cx, 0, well.cz]}
                onClick={(e) => {
                    e.stopPropagation();
                    progressTargetRef.current = well.fraction;
                }}
            >
                <sphereGeometry args={[Math.max(0.55, well.sigma * 0.6), 10, 10]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Html position={[well.cx, labelY, well.cz]} center>
                <div ref={setLabelRef} className="spt-well-label" style={{ color: well.color }}>
                    <span className="spt-well-year ef-mono">{well.year}</span>
                    <span className="spt-well-kind ef-mono">{well.kind}</span>
                </div>
            </Html>
        </group>
    );
}

const CAM_DIR = new THREE.Vector3(0, 5.4, 8.6).normalize();
const CAM_TARGET = new THREE.Vector3(0, -0.85, -0.55);

function Director({
    reduced,
    progressRef,
    progressTargetRef,
    activeIndexRef,
    setActiveIndex,
    refsRef,
    hudYearRef,
    crossedRef,
    pointerRef,
}) {
    useFrame((state, dt) => {
        const camera = state.camera as THREE.PerspectiveCamera;
        const aspect = state.size.width / Math.max(1, state.size.height);
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const neededDist = (GRID_HALF_W * 1.5) / (Math.tan(fovRad / 2) * Math.max(aspect, 0.001));
        const dist = THREE.MathUtils.clamp(neededDist, 9, 22);
        camera.position.copy(CAM_DIR).multiplyScalar(dist);

        const elapsed = state.clock.elapsedTime;
        const driftX = reduced ? 0 : Math.sin(elapsed * 0.05) * 0.4;
        const driftY = reduced ? 0 : Math.cos(elapsed * 0.037) * 0.22;
        const px = pointerRef.current.x;
        const py = pointerRef.current.y;
        const targetX = CAM_TARGET.x + driftX + (reduced ? 0 : px * 0.85);
        const targetY = CAM_TARGET.y + driftY - (reduced ? 0 : py * 0.42);
        camera.lookAt(targetX, targetY, CAM_TARGET.z);

        progressRef.current = THREE.MathUtils.damp(
            progressRef.current,
            progressTargetRef.current,
            3.2,
            dt,
        );
        const p = reduced ? 1 : progressRef.current;

        let bestIdx = 0;
        let bestDist = Infinity;
        wells.forEach((w, i) => {
            const d = Math.abs(p - w.fraction);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
            const amt = 1 - Math.min(1, d / FOCUS_WINDOW);
            const eased = amt * amt * (3 - 2 * amt);
            const refs = refsRef.current[i];
            if (refs?.ring) {
                refs.ring.scale.setScalar(1 + eased * 0.32);
            }
            if (refs?.label) {
                refs.label.style.opacity = String(0.42 + eased * 0.58);
                refs.label.style.transform = `translateY(${-4 - eased * 5}px) scale(${0.92 + eased * 0.16})`;
            }
        });

        if (bestIdx !== activeIndexRef.current) {
            activeIndexRef.current = bestIdx;
            setActiveIndex(bestIdx);
        }

        if (hudYearRef.current) hudYearRef.current.textContent = yearAtProgress(p);
        if (crossedRef.current) {
            const crossed = wells.filter((w) => p >= w.fraction - 0.01).length;
            crossedRef.current.textContent = `${crossed} / ${wells.length}`;
        }
    });
    return null;
}

function SpacetimeScene() {
    const reduced = useMemo(prefersReducedMotion, []);
    const progressRef = useRef(reduced ? 1 : 0);
    const progressTargetRef = useRef(reduced ? 1 : 0);
    const activeIndexRef = useRef(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const hudYearRef = useRef(null);
    const crossedRef = useRef(null);
    const refsRef = useRef([]);
    const probeGroupRef = useRef(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const wrapRef = useRef(null);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            progressTargetRef.current = THREE.MathUtils.clamp(
                progressTargetRef.current + e.deltaY * 0.00045,
                0,
                1,
            );
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        let lastY = null;
        const onTouchStart = (e) => {
            lastY = e.touches?.[0]?.clientY ?? null;
        };
        const onTouchMove = (e) => {
            if (lastY == null) return;
            const y = e.touches?.[0]?.clientY ?? lastY;
            const deltaY = lastY - y;
            lastY = y;
            progressTargetRef.current = THREE.MathUtils.clamp(
                progressTargetRef.current + deltaY * 0.0016,
                0,
                1,
            );
        };
        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: true });
        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
        };
    }, []);

    useEffect(() => {
        if (reduced) return;
        const el = wrapRef.current;
        if (!el) return;
        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            pointerRef.current = {
                x: THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
                y: THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
            };
        };
        el.addEventListener("pointermove", onMove);
        return () => el.removeEventListener("pointermove", onMove);
    }, [reduced]);

    const active = wells[activeIndex];

    return (
        <div className="spt-wrap" ref={wrapRef}>
            <Canvas camera={{ position: [0, 5.4, 8.6], fov: 36 }} gl={{ antialias: true }}>
                <color attach="background" args={[PAPER]} />
                <fog attach="fog" args={[PAPER, 9.5, 23]} />

                <ReferenceGrid />
                <MainGrid progressRef={progressRef} reduced={reduced} />
                <Worldline progressRef={progressRef} reduced={reduced} />

                {wells.map((well, i) => (
                    <WellMarker
                        key={well.id}
                        well={well}
                        index={i}
                        refsRef={refsRef}
                        progressTargetRef={progressTargetRef}
                        progressRef={progressRef}
                        reduced={reduced}
                    />
                ))}

                <Probe progressRef={progressRef} reduced={reduced} groupRef={probeGroupRef} />

                <Director
                    reduced={reduced}
                    progressRef={progressRef}
                    progressTargetRef={progressTargetRef}
                    activeIndexRef={activeIndexRef}
                    setActiveIndex={setActiveIndex}
                    refsRef={refsRef}
                    hudYearRef={hudYearRef}
                    crossedRef={crossedRef}
                    pointerRef={pointerRef}
                />
            </Canvas>

            <div className="spt-hud">
                <div className="spt-hud-row">
                    <span className="ef-label">position</span>
                    <span className="ef-mono spt-hud-year" ref={hudYearRef}>
                        {yearAtProgress(reduced ? 1 : 0)}
                    </span>
                </div>
                <p className="ef-label spt-hud-caption">
                    each event drops a mass — scroll and watch it bend the sheet
                </p>
                <div className="spt-hud-row">
                    <span className="ef-label">masses landed</span>
                    <span className="ef-mono spt-hud-crossed" ref={crossedRef}>
                        {reduced ? `${wells.length} / ${wells.length}` : `0 / ${wells.length}`}
                    </span>
                </div>
                <div className="spt-legend">
                    <span className="spt-legend-dot spt-legend-dot--origin" aria-hidden />
                    <span className="ef-label">origin</span>
                    <span className="spt-legend-dot spt-legend-dot--now" aria-hidden />
                    <span className="ef-label">now</span>
                </div>
            </div>

            <div className="spt-card" key={activeIndex}>
                <span className="ef-mono spt-card-meta">
                    <span>{active.year}</span>
                    <span className="spt-card-kind">{active.kind}</span>
                </span>
                <h4 className="spt-card-title">{active.title}</h4>
                <p className="spt-card-body">{active.body}</p>
            </div>
        </div>
    );
}

export default function TimelineSpacetime() {
    return (
        <LabStage
            idx="12"
            title="timeline — spacetime"
            tag="about"
            hint="scroll to drop each event onto the sheet"
        >
            <SpacetimeScene />
        </LabStage>
    );
}
