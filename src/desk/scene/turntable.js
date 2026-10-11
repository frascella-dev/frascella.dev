// A minimal turntable playing a 12" record: slim matte plinth, aluminium platter with a thin
// rubber mat, a straight tonearm with counterweight and headshell, a start/stop button and a speed
// dial. It is on at load: the record already turning, the arm down. Click it (or the "giradischi"
// button) to stop it; click again: the platter spins up with inertia to 33⅓ rpm, and the arm
// lifts, swings and lowers into the lead-in groove. It makes no sound.
import * as THREE from 'three';
import { V, TAU, clamp, sstep, shade, rr, slab, at, footprint } from './util.js';
import { prints } from './illustration.js';
import { M } from './mats.js';
import { jt } from './jobs.js';
import { R_LABEL, R_EDGE } from './gen.js';

export const TT = { w: 42, d: 33, foot: 1.1, h: 5 };
const RPM = 100 / 3, OMEGA = RPM / 60 * TAU;

// a slight dish: the label area stands a little proud, the grooved field rises toward the rim,
// and a rounded bead runs round the edge
function discHeight(r) {
  const plateau = .03 * (1 - sstep(5.2, 5.7, r));
  const dish = .018 * Math.pow(clamp((r - 5.7) / (15 - 5.7), 0, 1), 2);
  const bead = .045 * Math.sin(clamp((r - 14.95) / (R_EDGE - 14.95), 0, 1) * Math.PI);
  return plateau + dish + bead - .02 * sstep(15.12, R_EDGE, r);
}
function discGeo() {
  const g = new THREE.RingGeometry(.37, R_EDGE, 256, 64), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, discHeight(Math.hypot(p.getX(i), p.getY(i))));
  g.rotateX(-Math.PI / 2); g.computeVertexNormals();
  return g;
}
// The sleeve: a 31.4 cm board, 3 mm thick, softly rounded corners. The print wraps the front and the
// edges (UVs from the position, so the edge wear at the border of the print lands on the edges);
// the back is plain board.
const SLEEVE = 31.4, SLEEVE_T = .3;
function sleeveGeo() {
  const b = .07, g = new THREE.ExtrudeGeometry(rr(SLEEVE - 2 * b, SLEEVE - 2 * b, .32), { depth: SLEEVE_T - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(SLEEVE_T - 2 * b) / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, clamp(p.getX(i) / SLEEVE + .5, 0, 1), clamp(p.getY(i) / SLEEVE + .5, 0, 1));
  // split the caps group into front (print) and back (board)
  const idx = g.index ? g.index.array : null, get = k => idx ? idx[k] : k;
  const [cap, side] = g.groups, front = [], back = [], rest = [];
  for (let k = cap.start; k < cap.start + cap.count; k += 3) { const t = [get(k), get(k + 1), get(k + 2)]; (p.getZ(t[0]) > 0 ? front : back).push(...t); }
  for (let k = side.start; k < side.start + side.count; k++) rest.push(get(k));
  g.setIndex([...front, ...rest, ...back]); g.clearGroups();
  g.addGroup(0, front.length + rest.length, 0); g.addGroup(front.length + rest.length, back.length, 1);
  g.computeVertexNormals();
  return g;
}
export function buildTurntable({ reduced, shot = false }) {
  const tt = new THREE.Group();
  const top = TT.foot + TT.h;
  const plinthMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2d, roughness: .62, roughnessMap: M.smudge2, clearcoat: .15, clearcoatRoughness: .5 });
  tt.add(at(slab(rr(TT.w - .6, TT.d - .6, 1.4), TT.h, .3, plinthMat, 3), 0, TT.foot, 0));
  for (const [x, z] of [[-17.5, -13], [17.5, -13], [-17.5, 13], [17.5, 13]]) tt.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, TT.foot, 32), M.rubber)), x, TT.foot / 2, z));
  // the owner's artwork, printed on the sleeve and the label (baked by tools/bake.mjs from the
  // prototype's own painting): the next update() asks for one more frame when they are in
  const { sleeve: sleeveTex, label: labelTex } = prints();
  let artDirty = false;
  const art = Promise.all([sleeveTex.userData.ready, labelTex.userData.ready]).then(() => { artDirty = true; });

  // platter, mat, record, label: they turn together
  const PC = V(-4.5, top, .5);
  const spin = new THREE.Group(); spin.position.copy(PC); tt.add(spin);
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xc4c6c9, metalness: 1, roughness: .26, roughnessMap: M.smudge2UV });
  const pprof = [[0, .35], [13.8, .35], [14.6, .45], [15, .8], [15, 1.75], [14.85, 1.95], [0, 1.95]].map(([x, y]) => new THREE.Vector2(x, y));
  spin.add(shade(new THREE.Mesh(new THREE.LatheGeometry(pprof, 128), alu)));
  spin.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(14.7, 14.7, .2, 96), new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .95 }))), 0, 2.05, 0));
  // radial maps for the vinyl (gen.js vinyl): normal, roughness, groove-aligned anisotropy
  const vm = { normal: jt('vinyl', 'normal', { srgb: false, cost: 200 }), rough: jt('vinyl', 'rough', { srgb: false }), aniso: jt('vinyl', 'aniso', { srgb: false }) };
  const vinyl = new THREE.MeshPhysicalMaterial({ color: 0x0e0e10, roughness: 1, roughnessMap: vm.rough, normalMap: vm.normal,
    anisotropy: .75, anisotropyMap: vm.aniso, clearcoat: .22, clearcoatRoughness: .12, sheen: .25, sheenRoughness: .4, sheenColor: new THREE.Color(0x4a4a50) });
  spin.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(R_EDGE, R_EDGE, .2, 128, 1, true), new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: .4 }))), 0, 2.25, 0));
  const disc = shade(new THREE.Mesh(discGeo(), vinyl)); disc.position.y = 2.351; spin.add(disc);
  // the label: printed paper, the artwork's own contrast; only a faint low sheen, no white veil
  const label = new THREE.Mesh(new THREE.CircleGeometry(R_LABEL, 96).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: labelTex, roughness: .55, specularIntensity: .25, clearcoat: .08, clearcoatRoughness: .3, envMapIntensity: .5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  label.position.y = 2.351 + discHeight(0) + .002; label.receiveShadow = true; spin.add(label);
  // the spindle: polished steel, 7.24 mm across, 1.3 cm above the label, a chamfer and a domed tip
  { const ly = label.position.y, R = .362, top = 1.3, sp = [[0, -.6], [R, -.6], [R, top - .16], [R - .035, top - .1]];
    for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; sp.push([(R - .035) * Math.cos(a), top - .1 + .1 * Math.sin(a)]); }
    const spMat = new THREE.MeshPhysicalMaterial({ color: 0xe4e6e9, metalness: 1, roughness: .05, clearcoat: .4, clearcoatRoughness: .03 });
    spin.add(at(shade(new THREE.Mesh(new THREE.LatheGeometry(sp.map(([x, y]) => new THREE.Vector2(x, y)), 40), spMat)), 0, ly, 0)); }
  const RECORD_Y = top + 2.36;

  // tonearm: base, pillar, then yaw → pitch → the arm
  const PV = V(14.2, top, -9.8), ARM_H = 4.4, LE = 22.6, OFFSET = .36;
  tt.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, .6, 40), alu)), PV.x, top + .3, PV.z));
  tt.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, ARM_H, 24), M.darkSteel)), PV.x, top + ARM_H / 2, PV.z));
  const yaw = new THREE.Group(); yaw.position.set(PV.x, top + ARM_H, PV.z); tt.add(yaw);
  const pitch = new THREE.Group(); yaw.add(pitch);
  pitch.add(shade(new THREE.Mesh(new THREE.SphereGeometry(.75, 24, 16), M.darkSteel)));
  { const tube = new THREE.CylinderGeometry(.26, .3, LE + 4, 20); tube.rotateX(Math.PI / 2); tube.translate(0, 0, (LE + 4) / 2 - 4.2); pitch.add(shade(new THREE.Mesh(tube, alu))); }
  { const cw = new THREE.CylinderGeometry(1.35, 1.35, 2.6, 36); cw.rotateX(Math.PI / 2); pitch.add(at(shade(new THREE.Mesh(cw, new THREE.MeshPhysicalMaterial({ color: 0x2b2b2e, metalness: .8, roughness: .35 }))), 0, 0, -5.4)); }
  // headshell, cartridge, finger lift
  const hs = new THREE.Group(); hs.name = 'tt-headshell'; hs.position.set(0, 0, LE - 1.2); hs.rotation.y = -OFFSET; pitch.add(hs);
  hs.add(at(shade(new THREE.Mesh(slabGeo2(1.9, 3.2, .35), M.darkSteel)), 0, -.35, 1.1));
  hs.add(at(shade(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.25, 2.1), new THREE.MeshPhysicalMaterial({ color: 0x151517, roughness: .4, clearcoat: .5 }))), 0, -1.15, 1.2));
  hs.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, .45, 8), M.steel)), 0, -1.95, 1.9));
  { const f = new THREE.CylinderGeometry(.12, .12, 1.4, 10); f.rotateZ(Math.PI / 2); hs.add(at(shade(new THREE.Mesh(f, alu)), 1.3, -.2, 2.1)); }
  // arm rest
  const REST = V(PV.x + .6, top, PV.z + 13.6);
  tt.add(at(shade(new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, ARM_H - .55, 20), M.darkSteel)), REST.x, top + (ARM_H - .55) / 2, REST.z));
  tt.add(at(shade(new THREE.Mesh(new THREE.TorusGeometry(.42, .12, 8, 20, Math.PI).rotateY(Math.PI / 2), M.rubber)), REST.x, top + ARM_H - .72, REST.z));
  // controls: start/stop button with a status ring, speed dial — in the front-left corner, clear of
  // the record (the dial's rim stays >1 cm outside the 15.24 cm disc)
  const btn = at(shade(new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .35, 40), alu)), -18.8, top + .17, 14.9); tt.add(btn);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xffe2c0, emissiveIntensity: 0 });
  const led = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.2, 40).rotateX(-Math.PI / 2), ledMat); led.position.set(-18.8, top + .005, 14.9); tt.add(led);
  const dial = at(shade(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, .7, 40), alu)), -14.9, top + .35, 14.9); tt.add(dial);
  dial.add(at(new THREE.Mesh(new THREE.BoxGeometry(.12, .02, .7), M.darkSteel), 0, .36, -.5));

  // yaw that puts the stylus on the lead-in groove (radius 14.6 from the spindle)
  const stylusAt = a => { const d = V(Math.sin(a), 0, Math.cos(a)); return V(PV.x, 0, PV.z).addScaledVector(d, LE + .7); };
  let aPlay = 0; { let best = 1e9; for (let a = 0; a > -1.4; a -= .002) { const s = stylusAt(a), r = Math.hypot(s.x - PC.x, s.z - PC.z), e = Math.abs(r - 14.4); if (e < best) { best = e; aPlay = a; } } }
  const aRest = .02, LIFT = .075, P_REST = 0, P_PLAY = -.006;
  /* ---------- state: on at load, the record turning and the needle in the groove ---------- */
  let playing = true, omega = OMEGA, t = 0, phase = 'play';
  // the arm's own pose (yaw, pitch); the grooves' micro-motion is added on top of it
  let baseYaw = aPlay, basePitch = P_PLAY, yawFrom = aPlay;
  yaw.rotation.y = aPlay; pitch.rotation.x = P_PLAY; ledMat.emissiveIntensity = 2.2;
  const btnEl = document.getElementById('tt-btn');
  if (btnEl) btnEl.setAttribute('aria-pressed', 'true');
  function toggle(fromUser = true) {
    playing = !playing; t = 0; phase = playing ? 'start' : 'stop'; yawFrom = baseYaw;
    if (btnEl) btnEl.setAttribute('aria-pressed', String(playing));
    if (reduced()) { omega = playing ? OMEGA : 0; yaw.rotation.y = baseYaw = playing ? aPlay : aRest; pitch.rotation.x = basePitch = playing ? P_PLAY : P_REST; settle = 1; phase = playing ? 'play' : 'rest'; }
    ledMat.emissiveIntensity = playing ? 2.2 : 0;
  }
  const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  /* ---------- the grooves under the stylus: micro-motion while it tracks ---------- */
  // heights in cm at the stylus, turned into tiny rotations of the arm about its bearings (the
  // stylus sits ~23.2 cm from the pivot). The record's warp: one smooth undulation per turn
  // (±0.35 mm) and a second harmonic (±0.12 mm), locked to the platter's angle; its eccentricity
  // swings the arm sideways once per turn (±0.2 mm); the groove modulation adds a jitter of a few
  // hundredths of a mm, a sum of slow incommensurate sines (4–12 Hz) under a loudness envelope, so
  // it never flickers frame to frame. On touchdown the arm settles with a damped bounce (~0.5 s).
  const L_STY = LE + .6, WARP1 = .035, WARP2 = .012, ECC = .02, JIT = .0035, BOUNCE = .045;
  let groove = 0, settle = 1;                         // seconds of groove time; seconds since touchdown
  function micro(on) {
    if (!on || reduced() || shot) return [0, 0];
    const th = -spin.rotation.y, g = groove;
    const env = .65 + .35 * Math.sin(g * .23 * TAU + .8);
    let h = WARP1 * Math.sin(th + .6) + WARP2 * Math.sin(2 * th + 2.1)
      + JIT * env * (.5 * Math.sin(g * 4.1 * TAU + .4) + .35 * Math.sin(g * 7.3 * TAU + 1.9) + .2 * Math.sin(g * 11.9 * TAU + 3.1));
    if (settle < .8) h += BOUNCE * Math.exp(-settle / .11) * Math.sin(settle * 6.5 * TAU);
    const lat = ECC * Math.sin(th + 2.4);
    return [lat / L_STY, -h / L_STY];               // → [yaw, pitch] offsets (negative pitch lifts the tip)
  }
  // → 0 nothing moved, 1 only the platter turned (no shadow to redo), 2 the arm or the speed changed
  function update(dt) {
    let active = 0;
    if (shot) dt = 0;                                  // ?shot: the still of a playing record
    const target = playing ? OMEGA : 0;
    if (Math.abs(omega - target) > 1e-4) { omega += (target - omega) * (1 - Math.exp(-dt / (playing ? .55 : 1.4))); if (Math.abs(omega - target) < .002) omega = target; active = 2; }
    if (omega > 0 && dt > 0) { spin.rotation.y -= omega * dt; active = Math.max(active, 1); }
    if (phase === 'start' || phase === 'stop') {
      t += dt; active = 2;
      const up = sstep(0, .45, t), [a0, a1] = phase === 'start' ? [aRest, aPlay] : [yawFrom, aRest];
      const sw = ease(clamp((t - .5) / 1.3, 0, 1)), down = sstep(1.9, 2.5, t);
      baseYaw = a0 + (a1 - a0) * sw;
      const base = phase === 'start' ? P_REST + (P_PLAY - P_REST) * down : P_PLAY + (P_REST - P_PLAY) * down;
      basePitch = base - LIFT * up * (1 - down);
      if (t > 2.5) { phase = playing ? 'play' : 'rest'; if (playing) { settle = 0; groove = 0; } }
    } else if (phase === 'play' && dt > 0) { baseYaw = Math.max(aPlay - .3, baseYaw - dt * .0006); }   // tracking inward, never past the last groove
    // the stylus rides the grooves while it is down: fully in play, fading out as the arm lifts on stop
    const onRec = phase === 'play' ? 1 : phase === 'stop' ? 1 - sstep(0, .45, t) : 0;
    if (dt > 0 && onRec > 0) { groove += dt; if (settle < .8) { settle += dt; active = 2; } }
    const [dy, dp] = micro(onRec > 0);
    yaw.rotation.y = baseYaw + dy * onRec; pitch.rotation.x = basePitch + dp * onRec;
    if (artDirty) { artDirty = false; active = 2; }
    return active;
  }
  // the sleeve, leaning on the wall
  const sleeve = new THREE.Group();
  { // a 31.4 cm cardboard sleeve, 3 mm, softly rounded worn corners; matte print, fibre in the board
    const bm = { normal: jt('board', 'normal', { srgb: false, cost: 300 }), rough: jt('board', 'rough', { srgb: false }) };   // gen.js board
    const front = new THREE.MeshPhysicalMaterial({ map: sleeveTex, roughness: 1, roughnessMap: bm.rough, normalMap: bm.normal, normalScale: new THREE.Vector2(.35, .35), specularIntensity: .55, sheen: .15, sheenRoughness: .8, sheenColor: new THREE.Color(0xfff4e6) });
    const back = new THREE.MeshStandardMaterial({ color: 0xcfc4b0, roughness: .9, normalMap: bm.normal, normalScale: new THREE.Vector2(.3, .3) });
    sleeve.add(shade(new THREE.Mesh(sleeveGeo(), [front, back])));
  }
  footprint('turntable', tt, TT.w, TT.d, top + ARM_H + 1);
  return { tt, sleeve, toggle, update, playing: () => playing, hit: tt, spin, art };
}
function slabGeo2(w, d, h) { const g = new THREE.BoxGeometry(w, h, d); return g; }
