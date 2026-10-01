// A modern LED bar desk lamp: weighted round base, thin two-part arm, a slim bar head with a
// diffuser strip. It is the key light: a spot with an IES-like cookie and PCSS shadows, plus a
// rect light the size of the diffuser for the shape of its highlights.
import * as THREE from 'three';
import { RectAreaLight } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { V, shade, footprint } from './util.js';
import { M } from './mats.js';
import { jt } from './jobs.js';

export const LAMP = {
  base: V(-72, 0, -33), elbow: V(-73.5, 35, -39), joint: V(-51, 44.5, -27.5), barLen: 40,
  target: V(-17, 0, 3),
};
export const LEVELS = [1, .42, 0];
// the levels' words: words.js lampLevels

function rod(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), mat));
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function knuckle(p, axis, r, len, mat) {
  const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), mat));
  m.position.copy(p); m.quaternion.setFromUnitVectors(V(0, 1, 0), axis.clone().normalize()); return m;
}

export function buildLamp({ shot }) {
  const L = LAMP, lamp = new THREE.Group();
  const ano = new THREE.MeshPhysicalMaterial({ color: 0x3a3a3f, metalness: .72, roughness: .44, roughnessMap: M.smudge2, clearcoat: .15, clearcoatRoughness: .5 });
  // weighted base
  const bprof = [[0, 0], [8.1, 0], [8.45, .12], [8.55, .5], [8.5, 1.8], [8.3, 2.12], [7.9, 2.24], [1.4, 2.28], [0, 2.28]].map(([x, y]) => new THREE.Vector2(x, y));
  const base = shade(new THREE.Mesh(new THREE.LatheGeometry(bprof, 96), ano)); base.position.copy(L.base); lamp.add(base);
  { const r = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, .1, 64), M.rubber); r.position.copy(L.base).add(V(0, .05, 0)); lamp.add(r); }
  // a touch dimmer on the base: a small ring and a status dot
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: .3, emissive: 0xffd7a8, emissiveIntensity: 0 });
  const dial = new THREE.Mesh(new THREE.RingGeometry(.9, 1.15, 48).rotateX(-Math.PI / 2), ringMat); dial.position.copy(L.base).add(V(4.6, 2.29, 3.6)); lamp.add(dial);
  // arm
  const p0 = L.base.clone().add(V(0, 2.28, 0));
  lamp.add(shade(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 1.6, 40), ano)).translateX(p0.x).translateY(p0.y + .8).translateZ(p0.z));
  const s0 = p0.clone().add(V(0, 1.4, 0));
  const armAxis = new THREE.Vector3().subVectors(L.joint, L.base).setY(0).normalize();
  const hinge = V(-armAxis.z, 0, armAxis.x);
  lamp.add(knuckle(s0.clone().add(V(0, .6, 0)), hinge, .75, 2.1, ano));
  lamp.add(rod(s0.clone().add(V(0, .6, 0)), L.elbow, .5, ano));
  lamp.add(knuckle(L.elbow, hinge, .8, 2.3, ano));
  lamp.add(rod(L.elbow, L.joint, .45, ano));
  lamp.add(knuckle(L.joint, hinge, .72, 2.0, ano));
  // the bar head, continuing the arm's direction, level
  const h = armAxis.clone(), yaw = -Math.atan2(h.z, h.x);
  const head = new THREE.Group(); head.position.copy(L.joint).add(V(0, -.9, 0)); head.rotation.y = yaw; lamp.add(head);
  const bar = shade(new THREE.Mesh(new RoundedBoxGeometry(L.barLen, 1.25, 2.9, 5, .55), ano)); bar.position.set(L.barLen / 2 + .4, 0, 0); head.add(bar);
  const diffMat = new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: .5, emissive: 0xffe2bd, emissiveIntensity: 6 });
  const diff = new THREE.Mesh(new THREE.PlaneGeometry(L.barLen - 2.4, 1.9).rotateX(Math.PI / 2), diffMat); diff.position.set(L.barLen / 2 + .4, -.632, 0); head.add(diff);
  const barCenter = head.localToWorld(V(L.barLen / 2 + .4, -.7, 0));
  lamp.updateMatrixWorld(true);
  barCenter.copy(head.localToWorld(V(L.barLen / 2 + .4, -.7, 0)));

  // lights
  const spot = new THREE.SpotLight(0xffd6ac, 1, 0, 1.12, .85, 2);
  spot.position.copy(barCenter).add(V(0, -.3, 0)); spot.target.position.copy(L.target);
  spot.map = jt('cookie', 'c', { srgb: false, cost: 25 });   // an IES-like candela distribution (gen.js cookie)
  spot.castShadow = true; const SM = shot ? 1024 : 2048; spot.shadow.mapSize.set(SM, SM);
  spot.shadow.camera.near = 8; spot.shadow.camera.far = 150; spot.shadow.bias = -.0004; spot.shadow.normalBias = .25; spot.shadow.radius = 110 * SM / 2048;
  const rect = new RectAreaLight(0xffdcb4, 1, L.barLen - 2.4, 1.9);
  const rectHolder = new THREE.Group(); rectHolder.position.copy(barCenter); rectHolder.rotation.y = yaw; rect.rotation.x = -Math.PI / 2; rectHolder.add(rect);

  footprint('lamp', base, 17.1, 17.1, 2.3);
  return {
    lamp, spot, rect: rectHolder, rectLight: rect, diffMat, dialMat: ringMat, barCenter,
    hit: lamp, cableStart: L.base.clone().add(V(-1.5, .35, -8.6)),
    set(level, k) {   // level 0..1, k: overall intensity scale
      spot.intensity = k.spot * level; rect.intensity = k.rect * level;
      diffMat.emissiveIntensity = level > 0 ? 1.2 + 5.5 * level : 0; diffMat.color.setScalar(level > 0 ? .95 : .78);
      ringMat.emissiveIntensity = level > 0 ? .5 : .12;
    },
  };
}
