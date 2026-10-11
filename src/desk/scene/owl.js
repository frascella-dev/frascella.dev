// A small owl between the plant and the router (img/owl.glb: rigged, with two clips, Owl_Rest
// and Owl_Fly, compressed with meshopt; the decoder is three's own, nothing is fetched from
// elsewhere). Touched, it takes off, flies out of the frame, comes back from the other side and
// lands where it was. Under reduced motion nothing moves.
//
// Loaded next to the scene, not before it: the desk is ready without it, and the owl appears on
// the desk when its file has arrived (main.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { V } from './util.js';
import { ROUTER } from './props.js';

const FILE = new URL('../img/owl.glb', import.meta.url).href;
const HEIGHT = 11;                 // cm, sitting
// seconds; the wings beat at the clip's own pace whatever the path's (T_UP: the start of the way out)
const T_UP = .6, T_OUT = 2.8, T_AWAY = .7, T_BACK = 3, T_HOVER = 1.1, T_LAND = .8;
const HOVER = 6;                   // cm above its spot, where it turns before it lands
const ease = x => (1 - Math.cos(Math.PI * x)) / 2;

export async function buildOwl({ reduced, at, yaw }) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(FILE);
  const root = new THREE.Group();  // stays at home: what the hotspot and the clicks aim at
  const body = new THREE.Group();  // flies
  root.position.copy(at); root.add(body);
  const model = gltf.scene; body.add(model);
  // the router's colours: its white shell for the plumage, the dark of its glass strip for the eyes.
  // The file carries the two as vertex colours (the original texture was two flat colours); each
  // vertex takes whichever of the router's two is nearer, and the router's own finish.
  const shell = new THREE.Color(ROUTER.shell), glass = new THREE.Color(ROUTER.glass);
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: ROUTER.roughness, specularIntensity: .5, sheen: .25, sheenRoughness: .9, sheenColor: new THREE.Color(0xffffff) });
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const src = o.geometry.getAttribute('color'), n = o.geometry.getAttribute('position').count, rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = src && src.getX(i) + src.getY(i) + src.getZ(i) < 1.5 ? glass : shell; rgb[i * 3] = c.r; rgb[i * 3 + 1] = c.g; rgb[i * 3 + 2] = c.b; }
    o.geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    o.material = mat;
  });

  const mixer = new THREE.AnimationMixer(model);
  const clip = n => gltf.animations.find(a => a.name === n);
  const rest = mixer.clipAction(clip('Owl_Rest')), fly = mixer.clipAction(clip('Owl_Fly'));
  rest.play(); mixer.update(0);

  // to size, its feet on the desk and its middle on the spot, at rest
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model, true);
  model.scale.setScalar(HEIGHT / (box.max.y - box.min.y));
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model, true);
  const c = box.getCenter(V(0, 0, 0));
  model.position.set(-c.x, -box.min.y, -c.z);
  body.rotation.y = yaw;

  // the flight, in cm from its spot (world axes). The lamp's bar runs 44 cm above the spot, so it
  // leaves forwards, low, and climbs only once it is clear of it, out past the left of the frame;
  // it comes back from the far right, down in front of the laptop and in low from the front, to
  // hover over its spot: there it turns back to face the room, and folds its wings as it lands
  const out = new THREE.CubicBezierCurve3(V(0, 0, 0), V(0, 8, 24), V(-30, 22, 60), V(-150, 60, 80));
  const back = new THREE.CubicBezierCurve3(V(160, 110, 60), V(60, 45, 75), V(0, 16, 32), V(0, HOVER, 0));
  let t = -1, folding = false, turnFrom = 0;   // t < 0: sitting
  const look = V(0, 0, 0), next = V(0, 0, 0);
  const face = (curve, u) => {
    curve.getPoint(Math.min(1, u + .02), next); curve.getPoint(u, look);
    const d = next.sub(look); if (d.lengthSq() > 1e-6) body.rotation.y = Math.atan2(d.x, d.z);
  };

  function poke(force = false) {
    if (t >= 0 || (reduced() && !force)) return false;
    t = 0; folding = false;
    fly.reset().play(); rest.crossFadeTo(fly, .3, false);
    return true;
  }

  // → true while it moves (a frame, and a shadow pass, are needed)
  function update(dt) {
    if (t < 0) return false;
    t += dt;
    mixer.update(dt);
    const t1 = T_UP, t2 = t1 + T_OUT, t3 = t2 + T_AWAY, t4 = t3 + T_BACK, t5 = t4 + T_HOVER, t6 = t5 + T_LAND;
    if (t < t2) {
      const u = ease(t / (T_UP + T_OUT)); out.getPoint(u, body.position); face(out, u);
    } else if (t < t3) {
      body.visible = false;                         // out of the frame
    } else if (t < t4) {
      body.visible = true;
      const u = ease((t - t3) / T_BACK); back.getPoint(u, body.position); face(back, u);
      turnFrom = body.rotation.y;
    } else if (t < t5) {                            // hovering, still flying, it turns to face the room
      const u = ease((t - t4) / T_HOVER);
      body.position.set(0, HOVER + .6 * Math.sin((t - t4) * 7), 0);
      const d = Math.atan2(Math.sin(yaw - turnFrom), Math.cos(yaw - turnFrom));
      body.rotation.y = turnFrom + d * u;
    } else if (t < t6) {                            // down onto the spot, the wings folding as it lands
      if (!folding) { folding = true; rest.reset().play(); fly.crossFadeTo(rest, T_LAND, false); }
      const u = ease((t - t5) / T_LAND);
      body.position.set(0, HOVER * (1 - u), 0); body.rotation.y = yaw;
    } else {
      t = -1; fly.stop(); rest.setEffectiveWeight(1); mixer.update(0);
      body.position.set(0, 0, 0); body.rotation.y = yaw; body.visible = true;
    }
    return true;
  }

  return { root, body, poke, update, flying: () => t >= 0 };
}
