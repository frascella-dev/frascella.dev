import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import LabStage from "../../LabStage.tsx";
import { timeline } from "../../../data/timeline.ts";
import "./circuit.css";

// The About timeline read as a printed circuit board. The six real entries
// become six populated components — IC packages with pin arrays, wired in
// chronological order by copper traces that bend in crisp 45/90 elbows (with
// the occasional filleted corner, like a real autorouter). Scroll drives a
// signal down the board: a bright pulse with a fading comet-tail runs the
// copper and "energises" each component as it arrives — outline brightens,
// a small activity indicator animates. The origin ("Born") is silkscreened
// in ACCENT_2 as the board's reference/clock source; "now" (Giocaonline) is
// the largest, hottest module, in ACCENT, still drawing current. Everything
// else is plain INK copper. Vias, test pads, pin stubs and a keepout-aware
// ground-fill hatch fill the empty board so it reads as a dense, real,
// populated PCB rather than a schematic sketch — depth-fogged and gently
// parallaxed, the way you'd tilt a board under a loupe.

const PAPER = "#EEEAE0";
const INK = "#111110";
const ACCENT = "#FF6B1A"; // now / live signal
const ACCENT_2 = "#C7F651"; // origin / reference

const BOARD_W = 12.6; // full width, x
const BOARD_D = 7.4; // full depth, z
const ROUTE_Y = 0.035; // copper layer height
const FOCUS_WINDOW = 0.06; // fraction-distance over which a component "energises"
const TAIL_ARC = 2.35; // world units the comet tail spans behind the head
const TAIL_SEGMENTS = 30;

function prefersReducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
}
function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}
// Deterministic pseudo-random in [0,1) — stable across reloads, no jitter.
function hash(n) {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
}
function smooth(amt) {
    const a = clamp(amt, 0, 1);
    return a * a * (3 - 2 * a);
}

/* ============================================================
   Node geometry — the six real entries become six board components,
   scattered (not aligned to a ruler) but ordered left -> right by
   fraction, and wired in that same chronological order.
   ============================================================ */
const SIZE_BY_KIND = { life: 0.42, study: 0.5, code: 0.58, travel: 0.42, work: 0.78, now: 1 };
const PINS_BY_KIND = { life: 4, study: 6, code: 8, travel: 4, work: 10, now: 14 };

// Two logical lanes rather than a strict alternation: "life" entries recede
// to the back row, career entries ("work"/"now") advance to the front row,
// nearest the camera — so the board reads, literally in depth, as a career
// pulling forward out of a personal history. It also guarantees the "now"
// component — the one that most needs to read clearly — always lands in
// the near, crisp row rather than risking the fogged-out far one.
function nodePosition(entry, i) {
    const x = -BOARD_W / 2 + entry.fraction * BOARD_W + (hash(i * 6.6 + 2) - 0.5) * 1.7;
    const rowSign = entry.kind === "work" || entry.kind === "now" ? 1 : -1;
    const rowBase = (0.6 + hash(i * 41.1 + 5.3) * 2.0) * rowSign;
    return new THREE.Vector3(x, 0, rowBase);
}

const nodes = timeline.map((entry, i) => {
    const isOrigin = i === 0;
    const isNow = entry.kind === "now";
    const size = SIZE_BY_KIND[entry.kind] ?? 0.5;
    const w = 0.95 + size * 0.95;
    const h = 0.24 + size * 0.24;
    const d = 0.62 + size * 0.62;
    return {
        ...entry,
        index: i,
        pos: nodePosition(entry, i),
        color: isNow ? ACCENT : isOrigin ? ACCENT_2 : INK,
        isOrigin,
        isNow,
        size,
        w,
        h,
        d,
        pins: PINS_BY_KIND[entry.kind] ?? 6,
        rowSign: entry.kind === "work" || entry.kind === "now" ? 1 : -1,
        rot: Math.round(hash(i * 8.8 + 3) * 4) * (Math.PI / 2),
    };
});
const keepoutOf = (n) => Math.max(n.w, n.d) * 0.72 + 0.42;

/* ============================================================
   Route — chronological elbow path (bends chamfered / filleted / sharp in
   rotation, for the "occasional curved fillet" the brief asks for), plus
   an arc-length table so a scroll fraction can be sampled to an exact
   position + tangent anywhere along the whole board, not just at nodes.
   ============================================================ */
function cornerPoints(prev, corner, next, style) {
    if (style === "sharp") return [corner];
    const r = style === "round" ? 0.36 : 0.3;
    const toPrev = prev.clone().sub(corner);
    const toNext = next.clone().sub(corner);
    const dPrev = Math.min(r, toPrev.length() * 0.45);
    const dNext = Math.min(r, toNext.length() * 0.45);
    const start = corner.clone().add(toPrev.normalize().multiplyScalar(dPrev));
    const end = corner.clone().add(toNext.normalize().multiplyScalar(dNext));
    if (style === "chamfer") return [start, end];
    return new THREE.QuadraticBezierCurve3(start, corner, end).getPoints(6);
}

function elbowPoints(a, b, i) {
    const styles = ["round", "chamfer", "sharp", "round", "chamfer"];
    const style = styles[i % styles.length];
    const bias = 0.3 + hash(i * 4.13 + 0.2) * 0.4;
    const midX = a.x + (b.x - a.x) * bias;
    const p0 = new THREE.Vector3(a.x, ROUTE_Y, a.z);
    const p1 = new THREE.Vector3(midX, ROUTE_Y, a.z);
    const p2 = new THREE.Vector3(midX, ROUTE_Y, b.z);
    const p3 = new THREE.Vector3(b.x, ROUTE_Y, b.z);
    return [p0, ...cornerPoints(p0, p1, p2, style), ...cornerPoints(p1, p2, p3, style), p3];
}

function buildRoute() {
    const pts = [new THREE.Vector3(nodes[0].pos.x, ROUTE_Y, nodes[0].pos.z)];
    const nodeArcIdx = [0];
    for (let i = 0; i < nodes.length - 1; i++) {
        const seg = elbowPoints(nodes[i].pos, nodes[i + 1].pos, i);
        for (let k = 1; k < seg.length; k++) pts.push(seg[k]);
        nodeArcIdx.push(pts.length - 1);
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[cum.length - 1] || 1;
    return { pts, cum, total, nodeArcLen: nodeArcIdx.map((idx) => cum[idx]) };
}
const ROUTE = buildRoute();

function arcAtProgress(p) {
    const last = nodes.length - 1;
    if (p <= nodes[0].fraction) return ROUTE.nodeArcLen[0];
    if (p >= nodes[last].fraction) return ROUTE.nodeArcLen[last];
    for (let i = 0; i < last; i++) {
        if (p >= nodes[i].fraction && p <= nodes[i + 1].fraction) {
            const local = (p - nodes[i].fraction) / (nodes[i + 1].fraction - nodes[i].fraction);
            return THREE.MathUtils.lerp(ROUTE.nodeArcLen[i], ROUTE.nodeArcLen[i + 1], local);
        }
    }
    return ROUTE.nodeArcLen[last];
}

function sampleRoute(arc) {
    const { pts, cum, total } = ROUTE;
    const a = clamp(arc, 0, total);
    let j = 0;
    for (; j < cum.length - 2; j++) if (cum[j + 1] >= a) break;
    const segLen = Math.max(1e-6, cum[j + 1] - cum[j]);
    const t = (a - cum[j]) / segLen;
    const pos = pts[j].clone().lerp(pts[j + 1], t);
    const tangent = pts[j + 1].clone().sub(pts[j]);
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    else tangent.normalize();
    return { pos, tangent };
}

function yearLabelAtProgress(p) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (p <= first.fraction) return `${first.year} —`;
    if (p >= last.fraction) return `${last.year} →`;
    for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];
        if (p >= a.fraction && p <= b.fraction) {
            const local = (p - a.fraction) / (b.fraction - a.fraction);
            return String(Math.round(a.year + (b.year - a.year) * local));
        }
    }
    return String(last.year);
}

/* ============================================================
   Decorative board fill — vias, test pads, pin stubs, ground-fill hatch.
   All keepout-aware (cleared around components and the copper route) so
   the density reads as an intentional, real board rather than noise.
   Batched into as few draw calls as possible: each kind is one
   <lineSegments> primitive built once from a plain Float32Array.
   ============================================================ */
function nearKeepout(x, z, pad = 0) {
    for (const n of nodes) {
        if (Math.hypot(x - n.pos.x, z - n.pos.z) < keepoutOf(n) + pad) return true;
    }
    for (let i = 0; i < ROUTE.pts.length; i += 2) {
        const p = ROUTE.pts[i];
        if (Math.hypot(x - p.x, z - p.z) < 0.32 + pad) return true;
    }
    return false;
}

function ringSegments(cx, cz, r, segs = 8, y = 0.015) {
    const out = [];
    for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        out.push(cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r);
        out.push(cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r);
    }
    return out;
}

function buildVias() {
    const arr = [];
    let n = 0;
    const stepX = 1.05;
    const stepZ = 0.95;
    for (let x = -BOARD_W / 2 + 0.5; x <= BOARD_W / 2 - 0.5; x += stepX) {
        for (let z = -BOARD_D / 2 + 0.5; z <= BOARD_D / 2 - 0.5; z += stepZ) {
            const jx = x + (hash(n * 2.7 + 1) - 0.5) * 0.5;
            const jz = z + (hash(n * 5.3 + 2) - 0.5) * 0.4;
            n++;
            if (hash(n * 7.9) > 0.52) continue; // sparse, not a full grid
            if (nearKeepout(jx, jz, 0.08)) continue;
            arr.push(...ringSegments(jx, jz, 0.048 + hash(n * 3.3) * 0.02, 7));
        }
    }
    return new Float32Array(arr);
}

function buildPads() {
    const arr = [];
    const positions = [
        [-BOARD_W / 2 + 0.5, -BOARD_D / 2 + 0.5],
        [BOARD_W / 2 - 0.5, -BOARD_D / 2 + 0.5],
        [-BOARD_W / 2 + 0.5, BOARD_D / 2 - 0.5],
        [BOARD_W / 2 - 0.5, BOARD_D / 2 - 0.5],
    ];
    let n = 0;
    for (let x = -BOARD_W / 2 + 1.4; x <= BOARD_W / 2 - 1.4; x += 1.9) {
        n++;
        const z = -BOARD_D / 2 + 0.42 + (hash(n * 6.1) > 0.5 ? BOARD_D - 0.84 : 0);
        if (nearKeepout(x, z, 0.05)) continue;
        const s = 0.07;
        const y = 0.015;
        arr.push(
            x - s, y, z - s, x + s, y, z - s,
            x + s, y, z - s, x + s, y, z + s,
            x + s, y, z + s, x - s, y, z + s,
            x - s, y, z + s, x - s, y, z - s,
        );
    }
    positions.forEach(([x, z], i) => {
        const s = 0.09;
        const y = 0.015;
        arr.push(
            x - s, y, z - s, x + s, y, z - s,
            x + s, y, z - s, x + s, y, z + s,
            x + s, y, z + s, x - s, y, z + s,
            x - s, y, z + s, x - s, y, z - s,
        );
        arr.push(...ringSegments(x, z, 0.16 + i * 0, 8, y));
    });
    return new Float32Array(arr);
}

function buildStubs() {
    const arr = [];
    nodes.forEach((n, ni) => {
        const count = 2 + Math.round(hash(ni * 8.7 + 1) * 2);
        for (let s = 0; s < count; s++) {
            const side = hash(ni * 11 + s * 3.1) > 0.5 ? 1 : -1;
            const along = (hash(ni * 5.5 + s * 2.2) - 0.5) * n.w * 0.8;
            const len = 0.35 + hash(ni * 9.3 + s) * 0.55;
            const startZ = n.pos.z + side * (n.d / 2);
            const endZ = startZ + side * len;
            const x0 = n.pos.x + along;
            const x1 = x0 + (hash(ni * 13.1 + s) - 0.5) * 0.3;
            arr.push(x0, ROUTE_Y, startZ, x1, ROUTE_Y, endZ);
        }
    });
    return new Float32Array(arr);
}

// A box's 12 true edges (no face diagonal), axis-aligned then rotated in a
// PCB-plausible 90-degree step — batched straight into the shared filler
// buffer, so dozens of these cost nothing beyond one draw call.
function boxEdgePoints(cx, cz, w, h, d, rot) {
    const hw = w / 2;
    const hd = d / 2;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const corner = (sx, sy, sz) => {
        const lx = sx * hw;
        const lz = sz * hd;
        return [cx + lx * cos - lz * sin, sy * h, cz + lx * sin + lz * cos];
    };
    const c = {};
    for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
        c[`${sx}_${sy}_${sz}`] = corner(sx, sy, sz);
    }
    const pairs = [
        ["-1_0_-1", "1_0_-1"], ["1_0_-1", "1_0_1"], ["1_0_1", "-1_0_1"], ["-1_0_1", "-1_0_-1"],
        ["-1_1_-1", "1_1_-1"], ["1_1_-1", "1_1_1"], ["1_1_1", "-1_1_1"], ["-1_1_1", "-1_1_-1"],
        ["-1_0_-1", "-1_1_-1"], ["1_0_-1", "1_1_-1"], ["1_0_1", "1_1_1"], ["-1_0_1", "-1_1_1"],
    ];
    const out = [];
    pairs.forEach(([a, b]) => out.push(...c[a], ...c[b]));
    return out;
}

// Many small, non-interactive passives (resistors, ceramic + electrolytic
// caps, headers) scattered with keepout clearance — the texture that reads
// "populated motherboard" rather than six components floating on felt.
function buildFillerBoxes() {
    const arr = [];
    let n = 0;
    for (let x = -BOARD_W / 2 + 0.35; x <= BOARD_W / 2 - 0.35; x += 0.56) {
        for (let z = -BOARD_D / 2 + 0.35; z <= BOARD_D / 2 - 0.35; z += 0.52) {
            n++;
            if (hash(n * 6.6 + 0.11) > 0.4) continue; // keep it a scatter, not a grid
            const jx = x + (hash(n * 2.13) - 0.5) * 0.26;
            const jz = z + (hash(n * 3.71) - 0.5) * 0.24;
            if (nearKeepout(jx, jz, 0.06)) continue;
            const rot = Math.round(hash(n * 5.5) * 4) * (Math.PI / 2);
            const tr = hash(n * 9.2);
            let w, h, d;
            if (tr < 0.4) { w = 0.24; h = 0.045; d = 0.09; } // resistor
            else if (tr < 0.68) { w = 0.1; h = 0.07; d = 0.1; } // ceramic cap
            else if (tr < 0.88) { w = 0.15; h = 0.09; d = 0.3; } // small header
            else { w = 0.32; h = 0.1; d = 0.16; } // larger passive
            arr.push(...boxEdgePoints(jx, jz, w, h, d, rot));
            if (tr < 0.4 || (tr >= 0.68 && tr < 0.88)) {
                const dx = Math.cos(rot);
                const dz = Math.sin(rot);
                const stub = 0.08;
                arr.push(
                    jx + (dx * w) / 2, ROUTE_Y, jz + (dz * w) / 2,
                    jx + dx * (w / 2 + stub), ROUTE_Y, jz + dz * (w / 2 + stub),
                    jx - (dx * w) / 2, ROUTE_Y, jz - (dz * w) / 2,
                    jx - dx * (w / 2 + stub), ROUTE_Y, jz - dz * (w / 2 + stub),
                );
            }
        }
    }
    return new Float32Array(arr);
}

// A dozen electrolytic-style cans — cylinders approximated as two rings plus
// vertical struts, tall enough to read as real 3D relief up close.
function buildFillerCans() {
    const arr = [];
    const spots = [
        [-5.1, 1.05], [-3.6, -0.55], [-1.6, 1.5], [0.9, -1.9],
        [2.9, 0.35], [4.6, -1.35], [-0.4, 2.35], [3.9, 1.95],
        [-5.4, -1.85], [1.9, 1.15],
    ];
    spots.forEach(([x, z], i) => {
        if (nearKeepout(x, z, 0.08)) return;
        const r = 0.09 + hash(i * 4.4) * 0.03;
        const capH = 0.16 + hash(i * 7.1) * 0.05;
        const segs = 8;
        arr.push(...ringSegments(x, z, r, segs, 0.012));
        arr.push(...ringSegments(x, z, r, segs, capH));
        for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2;
            const px = x + Math.cos(a) * r;
            const pz = z + Math.sin(a) * r;
            arr.push(px, 0.012, pz, px, capH, pz);
        }
    });
    return new Float32Array(arr);
}
function buildHatch() {
    const arr = [];
    const spacing = 0.5;
    const sampleStep = 0.34;
    for (const dir of [1, -1]) {
        const span = BOARD_W + BOARD_D;
        for (let off = -span / 2; off <= span / 2; off += spacing) {
            // a diagonal run x + dir*z = off, clipped to the board rect,
            // sampled into short pieces so keepout clearance breaks it up
            // the way a real ground-fill pours around pads and traces.
            let x0 = -BOARD_W / 2;
            let z0 = dir * (off - x0);
            if (z0 < -BOARD_D / 2 || z0 > BOARD_D / 2) {
                z0 = clamp(z0, -BOARD_D / 2, BOARD_D / 2);
                x0 = off - dir * z0;
            }
            let x1 = BOARD_W / 2;
            let z1 = dir * (off - x1);
            if (z1 < -BOARD_D / 2 || z1 > BOARD_D / 2) {
                z1 = clamp(z1, -BOARD_D / 2, BOARD_D / 2);
                x1 = off - dir * z1;
            }
            const len = Math.hypot(x1 - x0, z1 - z0);
            if (len < 0.05) continue;
            const steps = Math.max(1, Math.round(len / sampleStep));
            for (let s = 0; s < steps; s++) {
                const ta = s / steps;
                const tb = (s + 1) / steps;
                const ax = x0 + (x1 - x0) * ta;
                const az = z0 + (z1 - z0) * ta;
                const bx = x0 + (x1 - x0) * tb;
                const bz = z0 + (z1 - z0) * tb;
                const mx = (ax + bx) / 2;
                const mz = (az + bz) / 2;
                if (nearKeepout(mx, mz, 0.05)) continue;
                arr.push(ax, 0.008, az, bx, 0.008, bz);
            }
        }
    }
    return new Float32Array(arr);
}

function boardBorderPoints() {
    const x = BOARD_W / 2;
    const z = BOARD_D / 2;
    return [
        new THREE.Vector3(-x, 0.01, -z),
        new THREE.Vector3(x, 0.01, -z),
        new THREE.Vector3(x, 0.01, z),
        new THREE.Vector3(-x, 0.01, z),
        new THREE.Vector3(-x, 0.01, -z),
    ];
}

function BatchedSegments({ positions, color, opacity, linewidth = 1 }) {
    const geometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return g;
    }, [positions]);
    return (
        <lineSegments geometry={geometry} raycast={() => null}>
            <lineBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                linewidth={linewidth}
            />
        </lineSegments>
    );
}

/* ============================================================
   Board fill — the static, always-fully-etched board: border, hatch,
   vias, pads, stub traces. Computed once at module scope; rendered once.
   ============================================================ */
function BoardFill() {
    const via = useMemo(buildVias, []);
    const pads = useMemo(buildPads, []);
    const stubs = useMemo(buildStubs, []);
    const hatch = useMemo(buildHatch, []);
    const border = useMemo(boardBorderPoints, []);
    const fillerBoxes = useMemo(buildFillerBoxes, []);
    const fillerCans = useMemo(buildFillerCans, []);

    return (
        <group>
            <Line points={border} color={INK} opacity={0.5} transparent raycast={() => null} />
            <BatchedSegments positions={hatch} color={INK} opacity={0.14} />
            <BatchedSegments positions={stubs} color={INK} opacity={0.38} />
            <BatchedSegments positions={via} color={INK} opacity={0.5} />
            <BatchedSegments positions={pads} color={INK} opacity={0.4} />
            {/* dense, non-interactive board population — resistors, caps,
                headers, cans — so this reads as a real motherboard rather
                than six lonely components on bare laminate. */}
            <BatchedSegments positions={fillerBoxes} color={INK} opacity={0.5} />
            <BatchedSegments positions={fillerCans} color={INK} opacity={0.45} />
            {/* the main chronological bus — always fully etched; the pulse
                only ever animates on top of it. */}
            <Line
                points={ROUTE.pts}
                color={INK}
                lineWidth={1.4}
                transparent
                opacity={0.62}
                raycast={() => null}
            />
        </group>
    );
}

/* ============================================================
   Chip package — an IC-style component: wireframe box body, silkscreen
   footprint outline, a DIP pin array on the long edges, a pin-1 corner
   notch, and per-node flourishes (origin's reference rings, now's
   heatsink hatch + live LED). Energise state (0..1, arrival proximity)
   and "is the currently active node" both come from the Director via refs
   so nothing here re-renders on every frame.
   ============================================================ */
function ChipPackage({ node, refsRef, progressTargetRef, onHoverIn, onHoverOut }) {
    const boxMatRef = useRef(null);
    const footMatRef = useRef(null);
    const pinMatRef = useRef(null);
    const ledRef = useRef(null);
    const groupRef = useRef(null);

    useEffect(() => {
        refsRef.current[node.index] = {
            box: boxMatRef.current,
            foot: footMatRef.current,
            pin: pinMatRef.current,
            led: ledRef.current,
            group: groupRef.current,
        };
    }, [node.index, refsRef]);

    const footprint = useMemo(() => {
        const hw = node.w / 2 + 0.14;
        const hd = node.d / 2 + 0.14;
        return [
            new THREE.Vector3(-hw, 0.012, -hd),
            new THREE.Vector3(hw, 0.012, -hd),
            new THREE.Vector3(hw, 0.012, hd),
            new THREE.Vector3(-hw, 0.012, hd),
            new THREE.Vector3(-hw, 0.012, -hd),
        ];
    }, [node.w, node.d]);

    const pins = useMemo(() => {
        const arr = [];
        const half = node.pins / 2;
        const usable = node.w * 0.72;
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < half; i++) {
                const t = half <= 1 ? 0.5 : i / (half - 1);
                const x = -usable / 2 + t * usable;
                const z0 = side * (node.d / 2);
                const z1 = z0 + side * 0.15;
                arr.push(x, ROUTE_Y, z0, x, ROUTE_Y, z1);
            }
        }
        return new Float32Array(arr);
    }, [node]);
    const pinGeometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pins, 3));
        return g;
    }, [pins]);

    const heatsink = useMemo(() => {
        if (!node.isNow) return null;
        const arr = [];
        const hw = node.w / 2 - 0.08;
        const hd = node.d / 2 - 0.08;
        for (let x = -hw; x <= hw + 0.001; x += 0.13) {
            arr.push(x, node.h + 0.001, -hd, x, node.h + 0.001, hd);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3));
        return g;
    }, [node]);

    const notch = useMemo(() => {
        const hw = node.w / 2;
        const hd = node.d / 2;
        return [
            new THREE.Vector3(-hw + 0.18, node.h + 0.001, -hd),
            new THREE.Vector3(-hw, node.h + 0.001, -hd + 0.18),
        ];
    }, [node]);

    return (
        <group position={[node.pos.x, 0, node.pos.z]} ref={groupRef}>
            {/* generous invisible hit target for hover/click */}
            <mesh
                position={[0, node.h / 2, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    progressTargetRef.current = node.fraction;
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    onHoverIn?.();
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    onHoverOut?.();
                }}
            >
                <boxGeometry args={[node.w + 0.5, node.h + 0.6, node.d + 0.5]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* every real board-drawing part shares one small, deterministic
                90-degree footprint rotation — plausible on a real PCB, and it
                breaks the two dead-straight component rows into something
                that reads as placed, not aligned to a ruler. */}
            <group rotation={[0, node.rot, 0]}>
                <Line
                    points={footprint}
                    color={node.color}
                    dashed
                    dashSize={0.06}
                    gapSize={0.05}
                    transparent
                    opacity={0.4}
                    raycast={() => null}
                    ref={footMatRef}
                />

                {/* clean 12-edge box outline — Edges (not `wireframe`) so the
                    flat faces don't show their triangulated diagonal as a
                    fake brace */}
                <mesh position={[0, node.h / 2, 0]} raycast={() => null}>
                    <boxGeometry args={[node.w, node.h, node.d]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    <Edges ref={boxMatRef} threshold={1} color={node.color} transparent opacity={0.85} />
                </mesh>

                <lineSegments geometry={pinGeometry} raycast={() => null}>
                    <lineBasicMaterial ref={pinMatRef} color={node.color} transparent opacity={0.6} />
                </lineSegments>

                {node.isOrigin && (
                    <>
                        <Line
                            points={ringPoints(0, node.h + 0.06, 0, node.w * 0.62, 20)}
                            color={ACCENT_2}
                            transparent
                            opacity={0.5}
                            raycast={() => null}
                        />
                        <Line
                            points={ringPoints(0, node.h + 0.06, 0, node.w * 0.62 + 0.16, 20)}
                            color={ACCENT_2}
                            transparent
                            opacity={0.28}
                            raycast={() => null}
                        />
                    </>
                )}

                {heatsink && (
                    <lineSegments geometry={heatsink} raycast={() => null}>
                        <lineBasicMaterial color={ACCENT} transparent opacity={0.5} />
                    </lineSegments>
                )}

                <Line points={notch} color={node.color} transparent opacity={0.8} raycast={() => null} />

                <mesh ref={ledRef} position={[node.w / 2 - 0.14, node.h + 0.02, node.d / 2 - 0.14]} raycast={() => null}>
                    <boxGeometry args={[0.09, 0.09, 0.09]} />
                    <meshBasicMaterial color={node.color} wireframe transparent opacity={0.7} />
                </mesh>
            </group>

            <Html position={[0, node.h + (node.rowSign > 0 ? 0.62 : -0.1), node.rowSign * (node.d / 2 + 0.4)]} center>
                <div
                    className={`cir-label ${node.isNow ? "is-now" : node.isOrigin ? "is-origin" : ""}`}
                    style={{ transform: node.rowSign < 0 ? "translateY(6px)" : undefined }}
                >
                    <span className="cir-label-year ef-mono">{node.year}</span>
                    <span className="cir-label-title ef-mono">{node.title}</span>
                </div>
            </Html>
        </group>
    );
}

function ringPoints(cx, cy, cz, r, segs) {
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r));
    }
    return pts;
}

/* ============================================================
   Signal trail — the always-present base copper (full chronological route,
   fully etched, never "grows") plus the animated pulse: a short comet-tail
   line whose vertex colors fade from live ACCENT at the head back to resting
   INK at the tail — since the tail is drawn directly over the resting trace,
   fading its color to the trace's own color reads exactly as a fading
   opacity. A small crosshair head marker rides the very tip.
   ============================================================ */
function SignalTrail({ progressRef, reduced, headRef }) {
    const tailGeometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array((TAIL_SEGMENTS + 1) * 3), 3),
        );
        const colors = new Float32Array((TAIL_SEGMENTS + 1) * 3);
        const head = new THREE.Color(ACCENT);
        const rest = new THREE.Color(INK);
        for (let i = 0; i <= TAIL_SEGMENTS; i++) {
            const t = Math.pow(i / TAIL_SEGMENTS, 1.5);
            const c = head.clone().lerp(rest, t);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return g;
    }, []);
    const tailLine = useMemo(
        () =>
            new THREE.Line(
                tailGeometry,
                new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }),
            ),
        [tailGeometry],
    );

    useFrame(() => {
        const p = reduced ? 1 : progressRef.current;
        const headArc = arcAtProgress(p);
        const arr = tailGeometry.attributes.position.array;
        for (let i = 0; i <= TAIL_SEGMENTS; i++) {
            const arc = headArc - (i / TAIL_SEGMENTS) * TAIL_ARC;
            const { pos } = sampleRoute(arc);
            arr[i * 3] = pos.x;
            arr[i * 3 + 1] = pos.y + 0.006;
            arr[i * 3 + 2] = pos.z;
        }
        tailGeometry.attributes.position.needsUpdate = true;

        if (headRef.current) {
            const { pos } = sampleRoute(headArc);
            headRef.current.position.set(pos.x, pos.y + 0.006, pos.z);
        }
    });

    return (
        <>
            <primitive object={tailLine} raycast={() => null} />
            <group ref={headRef}>
                <Line points={ringPoints(0, 0, 0, 0.05, 10)} color={ACCENT} transparent opacity={0.9} raycast={() => null} />
                <Line points={ringPoints(0, 0, 0, 0.11, 12)} color={ACCENT} transparent opacity={0.4} raycast={() => null} />
            </group>
        </>
    );
}

/* ============================================================
   Director — scroll -> progress, energise easing per node, camera fit +
   parallax + drift, HUD readouts.
   ============================================================ */
function Director({
    refsRef,
    progressRef,
    progressTargetRef,
    hudSignalRef,
    hudYearRef,
    activeIndexRef,
    setActiveIndex,
    boardGroupRef,
    pointerRef,
    reduced,
}) {
    // A near-overhead motherboard shot — steep, but not orthographic-flat;
    // real perspective (the board still reads as a trapezoid) plus board
    // relief (box heights, pin ticks) is what carries the depth from here.
    const camDir = useMemo(() => new THREE.Vector3(0, 8.6, 3.6).normalize(), []);

    useFrame((state, dt) => {
        const aspect = state.size.width / Math.max(1, state.size.height);
        const camera = state.camera as THREE.PerspectiveCamera;
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const halfExtent = Math.max(BOARD_W / 2, BOARD_D / 2) * 1.02;
        const neededDist = (halfExtent * 1.15) / (Math.tan(fovRad / 2) * Math.max(aspect, 0.5));
        const dist = clamp(neededDist, 10, 55);
        camera.position.copy(camDir).multiplyScalar(dist);
        camera.lookAt(0, 0, -0.15);

        // fog is camera-distance-relative, not world-relative — scale its
        // window with the fitted distance so a narrow (mobile) aspect that
        // has to pull the camera back doesn't just fog the entire board out.
        if (state.scene.fog) {
            state.scene.fog.near = Math.max(1, dist - 9);
            state.scene.fog.far = dist + 15;
        }

        progressRef.current = THREE.MathUtils.damp(
            progressRef.current,
            progressTargetRef.current,
            3.6,
            dt,
        );
        const progress = progressRef.current;

        let bestIdx = 0;
        let bestDist = Infinity;
        nodes.forEach((n, i) => {
            const d = Math.abs(progress - n.fraction);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
            const eased = smooth(1 - d / FOCUS_WINDOW);
            const refs = refsRef.current[i];
            if (refs?.box?.material) refs.box.material.opacity = 0.6 + eased * 0.4;
            if (refs?.foot?.material) refs.foot.material.opacity = 0.3 + eased * 0.55;
            if (refs?.pin) refs.pin.opacity = 0.45 + eased * 0.5;
            if (refs?.group) {
                const s = 1 + eased * 0.05;
                refs.group.scale.set(s, s, s);
            }
        });

        if (bestIdx !== activeIndexRef.current) {
            activeIndexRef.current = bestIdx;
            setActiveIndex(bestIdx);
        }

        // the active node's LED: a live little heartbeat, only while it's
        // actually the current node (not merely nearby, like the others).
        const t = state.clock.elapsedTime;
        nodes.forEach((n, i) => {
            const refs = refsRef.current[i];
            if (!refs?.led) return;
            const isCurrent = i === bestIdx;
            const target = isCurrent ? 1 + Math.sin(t * (reduced ? 0 : 7)) * 0.35 : 1;
            refs.led.scale.setScalar(THREE.MathUtils.damp(refs.led.scale.x, target, 6, dt));
        });

        if (hudSignalRef.current) {
            hudSignalRef.current.textContent = `${Math.round(progress * 100)}%`;
        }
        if (hudYearRef.current) {
            hudYearRef.current.textContent = yearLabelAtProgress(progress);
        }

        if (!reduced && boardGroupRef.current) {
            const elapsed = state.clock.elapsedTime;
            const driftX = Math.sin(elapsed * 0.05) * 0.035;
            const driftZ = Math.cos(elapsed * 0.037) * 0.02;
            const px = pointerRef.current.x;
            const py = pointerRef.current.y;
            boardGroupRef.current.rotation.x = THREE.MathUtils.damp(
                boardGroupRef.current.rotation.x,
                -0.05 + driftX - py * 0.1,
                2.4,
                dt,
            );
            boardGroupRef.current.rotation.z = THREE.MathUtils.damp(
                boardGroupRef.current.rotation.z,
                driftZ + px * 0.06,
                2.4,
                dt,
            );
            boardGroupRef.current.rotation.y = THREE.MathUtils.damp(
                boardGroupRef.current.rotation.y,
                px * 0.05,
                2.4,
                dt,
            );
        }
    });
    return null;
}

/* ============================================================
   Hover flavour — lab-only invented readings, same register as the
   sibling timeline experiments (never claimed as real).
   ============================================================ */
const NOTES = [
    "reference designator U1 — the clock every other net is timed against.",
    "first breadboard. everything since has just been a tidier version of this.",
    "five years of physics finally has somewhere useful to dissipate.",
    "first real load on the rail — designed for weather, not for demos.",
    "clinical data now; the traces still have to be right, just quieter.",
    "live pin — current is flowing, real stakes on the far end of the net.",
];
function readingFor(node, i) {
    const pkg = node.isNow ? "QFN" : node.isOrigin ? "XTAL" : node.pins >= 10 ? "SOIC" : "DIP";
    const clock = (0.6 + node.size * 3.2 + i * 0.11).toFixed(2);
    const draw = (4 + node.size * 38).toFixed(0);
    return {
        pn: `EF-${String(i + 1).padStart(3, "0")}`,
        pkg: `${pkg}-${node.pins}`,
        clock: `${clock} MHz`,
        draw: `${draw} mA`,
        note: NOTES[i] ?? "—",
    };
}
function HoverCardBody({ index }) {
    const node = nodes[index];
    if (!node) return null;
    const r = readingFor(node, index);
    return (
        <>
            <span className="ef-mono cir-hover-meta">
                <span>{node.year}</span>
                <span className="cir-hover-kind">{node.kind}</span>
                <span className="cir-hover-pn">{r.pn}</span>
            </span>
            <h5 className="cir-hover-title">{node.title}</h5>
            <p className="cir-hover-body">{node.body}</p>
            <dl className="cir-hover-stats">
                <div>
                    <dt>package</dt>
                    <dd>{r.pkg}</dd>
                </div>
                <div>
                    <dt>clock</dt>
                    <dd>{r.clock}</dd>
                </div>
                <div>
                    <dt>draw</dt>
                    <dd>{r.draw}</dd>
                </div>
            </dl>
            <p className="cir-hover-note">{r.note}</p>
        </>
    );
}

/* ============================================================
   Scene
   ============================================================ */
function CircuitScene({ onHover }) {
    const reduced = useMemo(prefersReducedMotion, []);
    const refsRef = useRef([]);
    const progressRef = useRef(reduced ? 1 : 0);
    const progressTargetRef = useRef(reduced ? 1 : 0);
    const activeIndexRef = useRef(0);
    const hudSignalRef = useRef(null);
    const hudYearRef = useRef(null);
    const boardGroupRef = useRef(null);
    const headRef = useRef(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const wrapRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            progressTargetRef.current = clamp(
                progressTargetRef.current + e.deltaY * 0.00045,
                0,
                1,
            );
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    useEffect(() => {
        if (reduced) return;
        const el = wrapRef.current;
        if (!el) return;
        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            pointerRef.current = {
                x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
                y: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
            };
        };
        el.addEventListener("pointermove", onMove);
        return () => el.removeEventListener("pointermove", onMove);
    }, [reduced]);

    const active = nodes[activeIndex];

    return (
        <div className="cir-wrap" ref={wrapRef}>
            <Canvas camera={{ position: [0, 8.6, 3.6], fov: 34 }} gl={{ antialias: true }}>
                <color attach="background" args={[PAPER]} />
                <fog attach="fog" args={[PAPER, 7, 27]} />

                <group ref={boardGroupRef}>
                    <BoardFill />

                    {nodes.map((node) => (
                        <ChipPackage
                            key={node.id}
                            node={node}
                            refsRef={refsRef}
                            progressTargetRef={progressTargetRef}
                            onHoverIn={() => onHover(node.index)}
                            onHoverOut={() => onHover((cur) => (cur === node.index ? null : cur))}
                        />
                    ))}

                    <SignalTrail progressRef={progressRef} reduced={reduced} headRef={headRef} />
                </group>

                <Director
                    refsRef={refsRef}
                    progressRef={progressRef}
                    progressTargetRef={progressTargetRef}
                    hudSignalRef={hudSignalRef}
                    hudYearRef={hudYearRef}
                    activeIndexRef={activeIndexRef}
                    setActiveIndex={setActiveIndex}
                    boardGroupRef={boardGroupRef}
                    pointerRef={pointerRef}
                    reduced={reduced}
                />
            </Canvas>

            <div className="cir-hud">
                <div className="cir-hud-row">
                    <span className="ef-label">signal at</span>
                    <span className="ef-mono cir-hud-signal" ref={hudSignalRef}>
                        {Math.round((reduced ? 1 : 0) * 100)}%
                    </span>
                </div>
                <div className="cir-hud-row">
                    <span className="ef-label">position —</span>
                    <span className="ef-mono cir-hud-year" ref={hudYearRef}>
                        {yearLabelAtProgress(reduced ? 1 : 0)}
                    </span>
                </div>
                <p className="ef-label cir-hud-caption">
                    a career, etched — scroll to drive the signal down the board
                </p>
                <div className="cir-legend">
                    <span className="cir-legend-dot cir-legend-dot--origin" aria-hidden />
                    <span className="ef-label">reference</span>
                    <span className="cir-legend-dot cir-legend-dot--now" aria-hidden />
                    <span className="ef-label">live</span>
                </div>
            </div>

            <div className="cir-card" key={activeIndex}>
                <span className="ef-mono cir-card-meta">
                    <span>{active.year}</span>
                    <span className="cir-card-kind">{active.kind}</span>
                </span>
                <h4 className="cir-card-title">{active.title}</h4>
                <p className="cir-card-body">{active.body}</p>
            </div>
        </div>
    );
}

/* ============================================================
   Root — LabStage frame + cursor-following hover tooltip.
   ============================================================ */
export default function TimelineCircuit() {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const wrapRef = useRef(null);
    const hoverCardRef = useRef(null);

    useEffect(() => {
        const onMove = (e) => {
            const wrap = wrapRef.current;
            if (!wrap || !hoverCardRef.current) return;
            const r = wrap.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            hoverCardRef.current.style.transform = `translate3d(${x + 20}px, ${y + 20}px, 0)`;
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
    }, []);

    return (
        <LabStage
            idx="11"
            title="timeline — circuit"
            tag="about"
            hint="scroll to drive the signal · hover / click a component"
        >
            <div className="cir-stage-inner" ref={wrapRef}>
                <CircuitScene onHover={setHoveredIndex} />

                {hoveredIndex != null && (
                    <div className="cir-hover-card" ref={hoverCardRef}>
                        <HoverCardBody index={hoveredIndex} />
                    </div>
                )}
            </div>
        </LabStage>
    );
}
