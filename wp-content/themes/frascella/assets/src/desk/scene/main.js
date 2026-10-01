// La scrivania: the night desk, the scroll stations, and the things you can touch —
// the iPad (a drawing app on its screen), the mug, the lamp and the turntable.
//
// start() builds it in slices (one object per task, so the page keeps answering), waits for the
// textures the workers paint (jobs.js), uploads them and compiles every shader program before the
// first frame, so the first frame is the finished picture and nothing compiles under a scroll.
// What the first station does not show (the other lamp levels' reflections, the projects'
// screenshots) comes after it. The contract with the page is CONTRACT.md.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { V, clamp, ctx, rr, slab, footprints, footprint, mergeStatic, mkCanvas, tex, tick } from './util.js';
import { setCanvasFactory } from './gen.js';
import { usePool, jt, pending, jobTextures, releaseBitmaps } from './jobs.js';
import { installPCSS, createPipeline } from './post.js';
import { initMats, M } from './mats.js';
import { buildRoom, DESK } from './room.js';
import { buildMacBook, editorTexture, SCR_W, SCR_H } from './macbook.js';
import { buildIpad, buildIphone, IW, ID, IH, ISW, ISD, ISR } from './devices.js';
import { buildNotebook, polaroid, buildTools, buildRouter } from './props.js';
import { buildMug } from './mug.js';
import { buildLamp, LEVELS } from './lamp.js';
import { words } from './words.js';
import { buildPlant } from './plant.js';
import { buildTurntable } from './turntable.js';
import { prints } from './illustration.js';
import { cable, plug, collisions, ground } from './cables.js';
import { createPadApp } from './padapp.js';
import { createPadUI } from './padui.js';

const idle = (timeout = 1500) => new Promise(r => (globalThis.requestIdleCallback ? requestIdleCallback(() => r(), { timeout }) : setTimeout(r, 1)));
const ASSET = {
  photos: [new URL('../../../desk/photo-portrait.webp', import.meta.url).href, new URL('../../../desk/photo-alley.webp', import.meta.url).href, new URL('../../../desk/photo-bridge.webp', import.meta.url).href],
  shots: [new URL('../../../desk/shot-sevenink.webp', import.meta.url).href, new URL('../../../desk/shot-skeda.webp', import.meta.url).href, new URL('../../../desk/shot-vitrine.webp', import.meta.url).href],
};
let patched = false;

/**
 * Build the desk on `canvas` and resolve when its first frame is on screen. Throws if WebGL is
 * missing (or only in software, unless allowSoftware) or the page lacks a hook it needs.
 * `pool`: the texture jobs' queue (texpool.js), already started by the loader.
 */
export async function start({ canvas, pool, progress = () => {}, allowSoftware = false, shot = location.search.includes('shot') }) {
const SHOT = shot;
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => RM.matches;
const need = ['lamp-btn', 'lamp-state', 'tt-btn', 'plant-btn', 'pad-btn', 'pad-ui', 'hotspots', 'scrwin', 'scrrim'].filter(id => !document.getElementById(id));
if (need.length || !document.querySelector('.top') || !document.querySelector('main') || !document.querySelector('footer') || !document.querySelector('[data-stop]')) throw new Error('the page lacks ' + (need.join(', ') || '.top, main, footer or [data-stop]'));
usePool(pool);
setCanvasFactory(mkCanvas);           // the small patterns made here are plain canvases
prints();                             // the record's prints: fetching while the scene builds
// the tablet mode's hint, in the page's language (the page may have written it already)
{ const hint = document.querySelector('#pad-ui .pad-hint'); if (hint && (window.frascellaDeskWords?.padHint || document.documentElement.lang.startsWith('en'))) hint.textContent = words().padHint; }

if (!patched) { installPCSS({ near: 8, far: 150, blocker: 12, pcf: 20 }); RectAreaLightUniformsLib.init(); patched = true; }
await tick();

// a phone or a laptop with no GPU would draw this at a frame every second or two: the still
// pictures are kinder there (index.ts), so a software-only context is refused unless asked for
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, failIfMajorPerformanceCaveat: !allowSoftware });
// three checks every program's log on first use: a synchronous round trip to the GPU process that
// waits for everything queued before it (with ANGLE on Vulkan, the pipelines too). Only with ?debug.
renderer.debug.checkShaderErrors = /[?&]debug/.test(location.search);
let lost = null;
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; window.dispatchEvent(new CustomEvent('desk:lost')); });
let DPR = SHOT ? 1 : Math.min(devicePixelRatio, 2);
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;      // patched to PCSS
renderer.shadowMap.autoUpdate = false;             // static unless something moves
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
ctx.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
await tick();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09090a);
const camera = new THREE.PerspectiveCamera(35, 1, 2, 1200);
initMats();

/* ---------- 1 unit = 1 cm; the stations were laid out on a 9.2 cm grid ---------- */
const K = 9.2, L = (x, y, z) => V(x * K, y * K, z * K);

/* ---------- the room ---------- */
// Gloock, for the glyphs on the two canvases (the page has it already, or soon)
const fontsIn = document.fonts ? Promise.race([document.fonts.load('400 40px Gloock'), new Promise(r => setTimeout(r, 3000))]).catch(() => null) : Promise.resolve();
const { room } = buildRoom({ shot: SHOT, fontsIn });
scene.add(room);
progress(.05); await tick();

/* ---------- the desk mat (wool felt) ---------- */
const MAT_TOP = .3;
const matMesh = slab(rr(49.4, 33.4, 1.6), MAT_TOP, .06, new THREE.MeshPhysicalMaterial({ map: jt('felt', 'c', { repeat: [1 / 22, 1 / 22], cost: 80 }), color: 0x7d7c80, roughness: .95, sheen: .8, sheenRoughness: .8, sheenColor: new THREE.Color(0x55555b) }), 2);
matMesh.position.set(15, 0, -8); matMesh.rotation.y = -.06; scene.add(matMesh);
footprint('mat', matMesh, 50, 34, MAT_TOP, { tag: 'surface' });

/* ---------- MacBook ---------- */
await tick();
const editorTex = editorTexture();
await tick();
const MB = await buildMacBook({ editorTex });
MB.mac.position.set(15.6, MAT_TOP, -8.3); MB.mac.rotation.y = -.12; scene.add(MB.mac);

/* ---------- iPad: the drawing engine paints its screen; the HTML app is laid on it while drawing ---------- */
// the EF sketch on its screen is painted in a worker, upright for the way the tablet is held
const sketchAsked = {};
const sketchFor = o => { const p = pool.run('efSketch', o === 'land' ? [2048, 1536] : [1536, 2048], { flip: false, cost: 60, tag: o === 'land' ? null : o }).then(out => { pad.setSketch(o, out.c); request(2); }); return p; };
const pad = createPadApp({ onClose: () => closePad(), needSketch: o => { if (!sketchAsked[o]) { sketchAsked[o] = true; const p = sketchFor(o); if (o === 'land') pending.push(p); } } });
const padTex = new THREE.CanvasTexture(pad.screen); padTex.colorSpace = THREE.SRGBColorSpace; padTex.anisotropy = ctx.aniso;
pad.render(); padTex.needsUpdate = true;
await tick();
const IP = buildIpad(padTex);
IP.ipad.position.set(-45, 0, 6.4); IP.ipad.rotation.y = .42; scene.add(IP.ipad);
await tick();

/* ---------- iPhone, repair kit ---------- */
const PH = buildIphone();
PH.phone.position.set(-3.2, 0, 18.9); PH.phone.rotation.y = .32; scene.add(PH.phone);
const { tools } = buildTools({ seed: pool.seed('tools') }); tools.position.set(-20, 0, 33); scene.add(tools);
progress(.1); await tick();

/* ---------- notebook, polaroids ---------- */
const { nb } = buildNotebook(); nb.position.set(34, 0, 26.5); nb.rotation.y = -.1; scene.add(nb);
await tick();
const pol1 = polaroid(ASSET.photos[0], .12); pol1.position.set(7.5, 0, 34.8); pol1.rotation.y = .32; scene.add(pol1);
const pol2 = polaroid(ASSET.photos[1], .1); pol2.position.set(12.2, .21, 39.2); pol2.rotation.y = -.2; scene.add(pol2);
footprint('polaroid 1', pol1, 8.8, 10.7, .2, { tag: 'pol' }); footprint('polaroid 2', pol2, 8.8, 10.7, .2, { tag: 'pol' });
const pol3 = polaroid(ASSET.photos[2], .06); pol3.rotation.set(Math.PI / 2, 0, .07); pol3.position.set(58, 46, DESK.wallZ + .12); scene.add(pol3);
{ const tape = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.5), new THREE.MeshStandardMaterial({ color: 0xe9d9c4, roughness: .7, transparent: true, opacity: .82 })); tape.position.set(58.4, 51.4, DESK.wallZ + .3); tape.rotation.z = -.1; scene.add(tape); }

/* ---------- mug, router, plant, turntable, record sleeve ---------- */
await tick();
const MG = buildMug({ reduced }); MG.root.position.set(61, 0, 3); MG.root.rotation.y = .6435; scene.add(MG.root);
MG.root.userData.keep = true;
const router = buildRouter(); router.position.set(-26, 0, -38); router.rotation.y = .25; scene.add(router);
await tick();
const plant = await buildPlant({ reduced, seed: pool.seed('gravel') }); plant.position.set(-47.5, 0, -38.5); plant.rotation.y = .7; scene.add(plant);
progress(.15); await tick();
const TTB = buildTurntable({ reduced, shot: SHOT }); TTB.tt.position.set(61, 0, -29.4); scene.add(TTB.tt);
await tick();
{ const S = 31.5, lean = Math.asin(3.1 / S); TTB.sleeve.rotation.x = -lean; TTB.sleeve.position.set(12, S / 2 * Math.cos(lean) + .05, -45.55 - S / 2 * Math.sin(lean)); scene.add(TTB.sleeve); footprint('sleeve', TTB.sleeve, 31.5, 3.6, 31.5); }

/* ---------- the lamp ---------- */
const LP = buildLamp({ shot: SHOT });
scene.add(LP.lamp, LP.spot, LP.spot.target, LP.rect);

/* ---------- cables ---------- */
await tick();
scene.updateMatrixWorld(true);
ground.desk = DESK;
const w = (obj, port) => ({ p: port.p.clone().applyMatrix4(obj.matrixWorld), d: port.d.clone().transformDirection(obj.matrixWorld) });
{
  // the phone on a woven USB-C cable from the MacBook's right side, between the mat and the notebook
  const uc = plug(w(MB.mac, MB.ports.usbc), { len: 1.9, w: .78, h: .6, color: 0xe4e1db }); scene.add(uc);
  const pp = plug(w(PH.phone, PH.port), { len: 1.9, w: .78, h: .6, color: 0xe4e1db }); scene.add(pp);
  const a = uc.userData.end, b = pp.userData.end;
  scene.add(cable('usb-c', [a, V(a.x + 2, .52, a.z + .8), V(37.4, .52, -4.4), V(35.4, .52, 2.6), V(30, .52, 8.1), V(25.5, .23, 11.5), V(17, .2, 12.2), V(9.6, .2, 13.4), V(5.6, .2, 17.6), V(5.3, .2, 24.2), V(3.4, .2, 28.7), V(1.4, .24, 29.3), b], { r: .19, color: 0xdcd8cf }));
  const rp = plug(w(router, router.userData.port), { len: 1.4, w: .9, h: .9, color: 0x2a2a2c }); scene.add(rp);
  const c = rp.userData.end;
  scene.add(cable('router', [c, V(c.x - .3, .6, c.z - 1.2), V(c.x - .6, .21, -44.4), V(c.x - .6, .5, -46.35), V(c.x - .6, -3, -47.9), V(c.x - .7, -30, -48.2)], { r: .22, color: 0x252527, braided: false, rough: .45 }));
  const s = LP.cableStart;
  scene.add(cable('lamp', [s, V(s.x - .2, .21, s.z - 2.5), V(s.x - .4, .21, -44.4), V(s.x - .4, .5, -46.35), V(s.x - .4, -3, -47.9), V(s.x - .3, -30, -48.2)], { r: .2, color: 0x2c2c2f, braided: false, rough: .5 }));
}
for (const f of footprints) if (['macbook', 'iphone', 'router', 'lamp'].includes(f.name)) f.cableOk = ['usb-c', 'router', 'lamp'];

/* ---------- fewer draw calls: merge what never moves ---------- */
await tick();
for (const g of [room, tools, nb, router, LP.lamp, MB.mac, plant, pol1, pol2, pol3]) { mergeStatic(g); await tick(); }
progress(.2);

/* ---------- lights: the lamp and the screens light the room; the rest is near dark ---------- */
const hemi = new THREE.HemisphereLight(0x6f7a92, 0x241a12, .1); scene.add(hemi);
let hemiBase = .1;
const focus = new THREE.SpotLight(0xffe7cc, 0, 0, .5, 1, 2); scene.add(focus, focus.target);

/* ---------- environment: the room as seen from the desk, one per lamp level ---------- */
const pmrem = new THREE.PMREMGenerator(renderer);
function envFor(level) {
  const es = new THREE.Scene(), probe = V(10, 22, 0);
  const add = (geo, color, pos, rot) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); m.position.copy(pos).sub(probe); if (rot) m.rotation.set(...rot); es.add(m); return m; };
  const wall = .012 + level * .045;
  add(new THREE.BoxGeometry(520, 300, 420), new THREE.Color(wall, wall * .95, wall * .9), V(20, 75, 161));
  add(new THREE.PlaneGeometry(166, 92), new THREE.Color(.3, .28, .26).multiplyScalar(.03 + level * .3), V(0, -.5, 0), [-Math.PI / 2, 0, 0]);
  if (level > 0) { const bar = add(new THREE.BoxGeometry(40, 1.4, 2.8), new THREE.Color(1, .86, .7).multiplyScalar(40 * level), LP.barCenter.clone().add(V(0, .3, 0))); bar.rotation.y = LP.rect.rotation.y; }
  const sc = MB.scrCenter(); const s = add(new THREE.PlaneGeometry(SCR_W, SCR_H), new THREE.Color(.35, .38, .5), sc); s.quaternion.copy(MB.glass.getWorldQuaternion(new THREE.Quaternion()));
  return pmrem.fromScene(es, .03, 1, 1500).texture;
}
// one per lamp level; the full lamp's now, the other two after the first frame (or at a click)
const envs = [envFor(LEVELS[0]), null, null];
const env = i => envs[i] || (envs[i] = envFor(LEVELS[i]));
scene.environment = envs[0];
await tick();

/* ---------- render on demand ---------- */
let want = 3, shadowWant = 3;
// the record turning (and the arm riding its grooves) with nothing else moving: drawn at ~30 fps
// instead of every vsync. Its pose is still advanced every frame, so each drawn frame shows it
// where it is at that moment; any other request (the camera, a scroll, a touch, another
// animation) draws the very next frame as before.
let spinOnly = false, lastDraw = -1e9;
// a little under 33.3 ms, so a 60 Hz display draws every 2nd vsync (?spin60: every vsync, to compare)
const SPIN_MS = /[?&]spin60/.test(location.search) ? 0 : 1000 / 30 - 4;
const request = (n = 2) => { want = Math.max(want, n); };
const requestShadow = (n = 2) => { shadowWant = Math.max(shadowWant, n); request(n); };
ctx.onLoad = () => request(3);

/* ---------- lamp levels ---------- */
const LK = { spot: 14000, rect: 40 };
let lampIdx = 0, lampCur = 1, lampGoal = 1;
const lampBtn = document.getElementById('lamp-btn'), lampState = document.getElementById('lamp-state');
function applyLamp(v) {
  LP.set(v, LK);
  // with the lamp down, the keyboard backlight comes up (its ambient light sensor)
  const bl = v > .7 ? .05 : v > .2 ? .16 : .5;
  MB.KU.glow.value.setRGB(1, .9, .78).multiplyScalar(bl * 1.4);
  MB.wellMat.emissiveIntensity = bl * 1.1;
  hemiBase = .05 + .08 * v;
  scene.environmentIntensity = .9;
  scene.environment = env(v > .7 ? 0 : v > .05 ? 1 : 2);
  renderer.toneMappingExposure = 1.0 + (1 - v) * .5;
  requestShadow(2);
}
function setLamp(i) {
  lampIdx = i; lampGoal = LEVELS[i];
  lampBtn.setAttribute('aria-pressed', String(LEVELS[i] > 0)); lampState.textContent = words().lampLevels[i];
  if (reduced() || SHOT) { lampCur = lampGoal; applyLamp(lampCur); }
  request(3);
}
lampBtn.addEventListener('click', () => setLamp((lampIdx + 1) % 3));
applyLamp(1);

/* ---------- the turntable ---------- */
// the desk's own switch, the header's crackle switch and the hotspot all go through here, so the
// header's aria-pressed and state word always follow the record
const ttBtn = document.getElementById('tt-btn'), sndBtn = document.getElementById('snd-btn');
// (the header's visible "acceso"/"spento" follows aria-pressed in CSS)
function syncTT() { sndBtn?.setAttribute('aria-pressed', String(TTB.playing())); }
function toggleTT(fromUser = true) { TTB.toggle(fromUser); syncTT(); request(3); }
ttBtn.addEventListener('click', () => toggleTT());
sndBtn?.addEventListener('click', () => toggleTT());
syncTT();

/* ---------- the plant: a touch makes it tremble and sparkle (nothing moves under reduced motion) ---------- */
document.getElementById('plant-btn').addEventListener('click', () => { plant.poke(); request(3); });

/* ---------- the phone: a touch breaks its screen, another switches it off again ---------- */
const phoneHit = () => { PH.screen.toggle(reduced() || SHOT); request(2); };
// the mug: a touch makes it wobble (nothing moves under reduced motion: MG.click() checks)
document.getElementById('mug-btn')?.addEventListener('click', () => { MG.click(); request(3); });
document.getElementById('phone-btn')?.addEventListener('click', phoneHit);


/* ---------- post ---------- */
const pipe = createPipeline(renderer, scene, camera, { shot: SHOT });
await tick();


/* ---------- stations ---------- */
scene.updateMatrixWorld(true);
const scrC = MB.scrCenter();
const scrN = V(0, 0, 1).applyQuaternion(MB.glass.getWorldQuaternion(new THREE.Quaternion()));
const F = { none: V(0, 0, 0), laptop: L(1.8, 1.0, -1.0), phone: L(-.35, .1, 2.05), box: V(-26, 10, -38), bio: L(-3.6, .1, 1.8), desk: V(4, 0, -6) };
// a project on the laptop: straight at the screen, far enough that it fills about half the width,
// pushed right (sx) so the words sit on the left; on a phone (pn/syn) further back and high up
const onScr = (d, off, dn = 9.4) => ({ p: scrC.clone().addScaledVector(scrN, d * K).add(off), pn: scrC.clone().addScaledVector(scrN, dn * K), t: scrC.clone() });
const S = {
  hero:    { p: L(.4, 7.6, 13.4), t: L(-.4, .9, -.4), sx: .16, f: 'none', fi: 0, scr: -1 },
  // the intermezzo: the whole desk, wide and lit, every object in view (phone: from further up)
  desk:    { p: V(-2, 104, 150), t: V(-2, 9, -10), pn: V(14, 370, 192), tn: V(14, 0, -6), sx: 0, syn: -.13, f: 'desk', fi: .5, amb: 1, scr: -1 },
  s1:      { p: L(-1.6, 3.9, 5.2), t: L(1.7, 1.0, -.9), sx: .2, f: 'laptop', fi: .5, scr: -1 },
  s2:      { p: L(1.9, 3.3, 5.0), t: L(-.5, .15, 2.0), sx: -.2, f: 'phone', fi: .6, scr: -1, dof: 1 },
  s3:      { p: V(4, 34, 16), t: V(-28, 9, -36), sx: .2, f: 'box', fi: .6, scr: -1 },
  w0:      { p: scrC.clone().addScaledVector(scrN, 4.4 * K).add(L(.3, .35, 0)), t: scrC.clone(), sx: 0, sy: -.08, f: 'laptop', fi: .25, scr: 0 },
  w1:      { ...onScr(6.3, L(.25, .2, 0)), sx: .17, syn: .2, f: 'laptop', fi: .25, scr: 0 },
  w2:      { ...onScr(6.3, L(-.2, .2, 0)), sx: .17, syn: .2, f: 'laptop', fi: .25, scr: 1 },
  w3:      { ...onScr(6.3, L(.1, .35, 0)), sx: .17, syn: .2, f: 'laptop', fi: .25, scr: 2 },
  bio:     { p: L(-1.0, 5.4, 6.6), t: L(-3.5, 0, 1.7), tn: L(-4.7, .4, .9), sx: -.2, f: 'bio', fi: .4, scr: -1, dof: .6 },
  contact: { p: L(-2.4, 10.8, 14.4), t: L(-.2, .6, -.4), sx: -.2, f: 'none', fi: 0, scr: -1 },
};
const stopEls = [...document.querySelectorAll('[data-stop]')], cards = [...document.querySelectorAll('.card')];

// close-ups for inspection (window.__desk.view(name))
const lid = MB.lid;
const CLOSE = {
  keyboard: () => ({ p: MB.mac.localToWorld(V(-3, 13, 15)), t: MB.mac.localToWorld(V(-1, 1, -4.5)), dof: .5 }),
  bezel: () => ({ p: lid.localToWorld(V(-6.5, 17.5, 12)), t: lid.localToWorld(V(-9.5, 19.5, 0)) }),
  macbook: () => ({ p: MB.mac.localToWorld(V(-18, 30, 42)), t: MB.mac.localToWorld(V(-1, 5, -3)) }),
  router: () => ({ p: V(-8, 24, 2), t: V(-26, 11.5, -38), dof: .4 }),
  tools: () => ({ p: V(-10, 22, 62), t: V(-16, 0, 34), dof: .8 }),
  notebook: () => ({ p: V(30, 44, 62), t: V(33, 0, 26), dof: .5 }),
  polaroids: () => ({ p: V(12, 19, 58), t: V(10, 0, 37), dof: .8 }),
  wall: () => ({ p: V(40, 52, 10), t: V(44, 52, -49) }),
  mug: () => ({ p: V(42, 22, 40), t: V(64, 4, 10), dof: .6 }),
  lamp: () => ({ p: V(-4, 44, 62), t: V(-48, 30, -24) }),
  plant: () => ({ p: V(-38, 23, -11), t: V(-47.5, 5.2, -38.5), dof: .5 }),
  turntable: () => ({ p: V(48, 34, 14), t: V(62, 5, -30), dof: .4 }),
  room: () => ({ p: V(10, 70, 185), t: V(12, 18, -30) }),
  // the router from every side (the back from above: the wall is 5 cm behind it)
  routerFront: () => ({ p: router.localToWorld(V(0, 16, 30)), t: router.localToWorld(V(0, 11.5, 0)) }),
  routerLeft: () => ({ p: router.localToWorld(V(-30, 16, 4)), t: router.localToWorld(V(0, 11.5, 0)) }),
  routerRight: () => ({ p: router.localToWorld(V(30, 16, 4)), t: router.localToWorld(V(0, 11.5, 0)) }),
  routerBack: () => ({ p: router.localToWorld(V(3, 44, -8)), t: router.localToWorld(V(0, 10, -2)) }),
  routerTop: () => ({ p: router.localToWorld(V(.1, 55, .6)), t: router.localToWorld(V(0, 20, 0)) }),
  pencil: () => ({ p: IP.ipad.localToWorld(V(IW / 2 + 9, 9, 7)), t: IP.ipad.localToWorld(V(IW / 2 + 2.3, .4, 3.5)), dof: .5 }),
  tweezers: () => ({ p: V(-14, 16, 44), t: V(-29, 0, 27), dof: .6 }),
  mugClose: () => ({ p: MG.root.localToWorld(V(-14, 12, 12)), t: MG.root.localToWorld(V(-1, 4.5, 0)), dof: .4 }),
  spill: () => ({ p: V(38, 34, 52), t: V(66, 3, 14) }),
  ipad: () => ({ p: IP.ipad.localToWorld(V(-14, 30, 30)), t: IP.ipad.localToWorld(V(1, 0, 0)) }),
  phone: () => ({ p: PH.phone.localToWorld(V(0, 24, 9)), t: PH.phone.localToWorld(V(0, .9, 0)) }),
};
let viewOverride = null;

/* ---------- MacBook screen switching ---------- */
// the projects' screenshots: fetched when the works come near (or after the first frame, once the
// page is idle), never before the first frame. A card may name its own: data-screen-src.
const shotUrl = i => (document.querySelector(`.card[data-screen="${i}"]`) || {}).dataset?.screenSrc || ASSET.shots[i];
const shots = [0, 1, 2].map(() => { const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ctx.aniso; return t; });
let shotsAsked = false;
function loadShots() {
  if (shotsAsked) return; shotsAsked = true;
  shots.forEach((t, i) => tex(shotUrl(i), x => { t.image = x.image; t.flipY = x.flipY; t.needsUpdate = true; renderer.initTexture(t); request(2); }));
}
{ const first = document.querySelector('.card, [data-stop^="w"]');
  if (first && 'IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); loadShots(); } }, { rootMargin: '150% 0px' }); io.observe(first); } }
const DU = MB.dispMat.userData.U;
let curScr = -2, fading = 0;
function setScreen(i) {
  if (i === curScr) return;
  const t = i < 0 ? editorTex : shots[i];
  DU.scrA.value = DU.scrMix.value > .5 ? DU.scrB.value : DU.scrA.value;
  DU.scrB.value = t; DU.scrMix.value = 0; fading = 1; curScr = i;
}
let hoverScr = null;
document.querySelectorAll('.card').forEach(c => { c.addEventListener('mouseenter', () => hoverScr = +c.dataset.screen); c.addEventListener('mouseleave', () => hoverScr = null); });

/* ---------- scroll → camera ---------- */
const sstep = x => x * x * (3 - 2 * x);
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const cur = { p: S.hero.p.clone(), t: S.hero.t.clone(), sx: S.hero.sx, sy: 0, fp: V(0, 0, 0), fi: 0, dof: 0, amb: 0 };
const goal = { p: V(0, 0, 0), t: V(0, 0, 0), sx: 0, sy: 0, fp: V(0, 0, 0), fi: 0, scr: -1, dof: 0, amb: 0 };
const pa = V(0, 0, 0), pb = V(0, 0, 0);
let W = 1, H = 1, narrow = false;
const cssR = new CSS3DRenderer(); cssR.domElement.className = 'pad-css'; document.body.append(cssR.domElement);
const cssScene = new THREE.Scene();
const ui = createPadUI(pad, { onClose: () => closePad() });
const cssObj = new CSS3DObject(ui.holder); cssScene.add(cssObj);
await tick();
// the app always goes back into its CSS3D holder before the camera comes down
function dock() { if (ui.el.parentNode !== ui.holder) ui.holder.append(ui.el); Object.assign(ui.el.style, { transform: '', left: '0px', top: '0px', position: 'absolute' }); }
// the CSS scene runs at 60× the world scale: centimetres as CSS pixels are too small for the
// browser's 3D hit testing to be reliable
const CSSK = 60, cssCam = new THREE.PerspectiveCamera();
function renderCss() { cssCam.copy(camera); cssCam.position.multiplyScalar(CSSK); cssCam.updateMatrixWorld(); cssR.render(cssScene, cssCam); }
// CSS3D lays the app on the glass while the camera comes down; once it is straight above, the
// projection is a plain rectangle, so the app is handed to a flat layer at exactly that rectangle
// (crisp text, and pointer hit testing that does not depend on the browser's 3D path)
const flat = document.createElement('div'); flat.className = 'pad-flat'; document.body.append(flat);
function flatten() {
  cssR.domElement.classList.add('on'); renderCss();
  dock(); const r = ui.el.getBoundingClientRect();
  flat.append(ui.el); Object.assign(ui.el.style, { transform: 'none', left: r.left + 'px', top: r.top + 'px' });
  cssR.domElement.classList.remove('on'); flat.classList.add('on');
}
// after a resize while open: re-lay the flat layer, but never under a stroke in progress
// (moving the element would drop its pointer capture)
function reflatten() { if (padMode !== 'open') return; if (ui.busy()) { requestAnimationFrame(reflatten); return; } flatten(); }
function resize() {
  W = innerWidth; H = innerHeight; narrow = W < 900; LAY.dirty = true; headH = 0;
  renderer.setPixelRatio(DPR); renderer.setSize(W, H, false);
  pipe.setSize(W, H, DPR); cssR.setSize(W, H);
  camera.aspect = W / H; camera.fov = narrow ? 44 : 35; camera.updateProjectionMatrix();
  if (padMode !== 'closed') computePadCam();
  if (padMode === 'open') requestAnimationFrame(reflatten);
  request(3);
}
// Where the stations and the cards are on the page, measured once and again only when the layout
// can have moved (a resize, the page's height changing, the fonts, the end of a scroll). The
// prototype read every box on every frame, which forces a layout after the sheet's script has
// touched the DOM in the same frame.
const LAY = { dirty: true, max: 0, stops: [], cards: [] };
const invalidate = () => { LAY.dirty = true; request(2); };
function measure() {
  const y = scrollY; LAY.dirty = false;
  LAY.max = document.documentElement.scrollHeight - innerHeight;
  LAY.stops = stopEls.map(el => { const r = el.getBoundingClientRect(); return { top: r.top + y, h: r.height }; });
  LAY.cards = cards.map(c => { const r = c.getBoundingClientRect(); return { top: r.top + y, h: r.height, screen: +c.dataset.screen }; });
}
if ('ResizeObserver' in window) { const ro = new ResizeObserver(invalidate); ro.observe(document.documentElement); ro.observe(document.querySelector('main')); }
document.fonts && document.fonts.addEventListener('loadingdone', invalidate);
addEventListener('scrollend', () => { LAY.dirty = true; });
function computeGoal() {
  if (LAY.dirty) measure();
  const y = scrollY, max = LAY.max;
  const anchors = LAY.stops.map((b, i) => {
    if (i === 0) return 0;
    const h = Math.min(b.h, innerHeight);
    return Math.min(max, Math.max(0, b.top + h / 2 - innerHeight / 2));
  });
  for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  let i = 0; while (i < anchors.length - 2 && y >= anchors[i + 1]) i++;
  let raw = (y - anchors[i]) / (anchors[i + 1] - anchors[i]); raw = Math.min(1, Math.max(0, raw));
  const f = RM.matches ? (raw < .5 ? 0 : 1) : sstep(Math.min(1, Math.max(0, (raw - .12) / .76)));
  const A = S[stopEls[i].dataset.stop], B = S[stopEls[i + 1].dataset.stop];
  const k = narrow ? 1 + (1 - Math.min(1, W / H)) * .75 : 1;
  const at = (X, out) => narrow && X.pn ? out.copy(X.pn) : out.copy(X.p).sub(X.t).multiplyScalar(k).add(X.t);
  at(A, pa); at(B, pb);
  const ta = narrow && A.tn || A.t, tb = narrow && B.tn || B.t;
  goal.p.lerpVectors(pa, pb, f); goal.t.lerpVectors(ta, tb, f);
  goal.sx = narrow ? 0 : A.sx + (B.sx - A.sx) * f;
  const syN = X => X.syn ?? (X.f === 'none' && X.scr < 0 ? .12 : (X.scr >= 0 ? -.05 : .2));
  const sya = narrow ? syN(A) : (A.sy || 0), syb = narrow ? syN(B) : (B.sy || 0);
  goal.sy = sya + (syb - sya) * f;
  goal.fp.lerpVectors(F[A.f === 'none' ? B.f : A.f], F[B.f === 'none' ? A.f : B.f], f);
  goal.fi = A.fi + (B.fi - A.fi) * f;
  goal.dof = (A.dof || 0) + ((B.dof || 0) - (A.dof || 0)) * f;
  goal.amb = (A.amb || 0) + ((B.amb || 0) - (A.amb || 0)) * f;
  const near = f < .5 ? A : B;
  goal.scr = near.scr;
  if (stopEls[i].dataset.stop[0] === 'w' || stopEls[i + 1].dataset.stop[0] === 'w') {
    let best = 1e9;
    for (const c of LAY.cards) { const top = c.top - y, d = Math.abs(top + c.h / 2 - innerHeight / 2); if (d < best && top + c.h > 0 && top < innerHeight) { best = d; goal.scr = c.screen; } }
    if (hoverScr !== null) goal.scr = hoverScr;
    if (near.scr < 0 && f < .5) goal.scr = -1;
  }
}
addEventListener('scroll', () => request(2), { passive: true });

/* ================= iPad mode ================= */
let padMode = 'closed', pMix = 0, pAnim = null, returnFocus = null, arrivePending = false;
const padCam = { p: V(0, 0, 0), t: V(0, 0, 0), up: V(0, 0, -1) };
const html = document.documentElement, padUi = document.getElementById('pad-ui');
const outside = [document.querySelector('.top'), document.querySelector('main'), document.querySelector('footer')];
function computePadCam() {
  IP.ipad.updateWorldMatrix(true, true);
  const land = W >= H;
  const c = IP.glass.getWorldPosition(V(0, 0, 0)), q = IP.ipad.getWorldQuaternion(new THREE.Quaternion());
  const n = V(0, 1, 0).applyQuaternion(q);
  const tan = Math.tan(camera.fov * Math.PI / 360), fill = land ? .93 : .96;
  const [longW, shortH] = land ? [ID, IW] : [IW, ID];
  const d = Math.max(shortH / (fill * 2 * tan), longW / (fill * 2 * tan * camera.aspect));
  padCam.p.copy(c).addScaledVector(n, d); padCam.t.copy(c);
  const upL = land ? V(-1, 0, 0) : V(0, 0, -1);
  padCam.up.copy(upL).applyQuaternion(q);
  // the HTML app, the size it appears on the page, lying on the glass
  const cssPerCm = H / (2 * (d - .03) * tan);
  ui.layout({ land, w: (land ? ISD : ISW) * cssPerCm, h: (land ? ISW : ISD) * cssPerCm, radius: ISR * cssPerCm });
  const Z = V(0, 1, 0), X = new THREE.Vector3().crossVectors(upL, Z);
  const basis = new THREE.Matrix4().makeBasis(X, upL, Z), qq = new THREE.Quaternion().setFromRotationMatrix(basis);
  cssObj.quaternion.copy(q).multiply(qq); cssObj.position.copy(c).addScaledVector(n, .03).multiplyScalar(CSSK); cssObj.scale.setScalar(CSSK / cssPerCm);
  pad.setOrient(land ? 'land' : 'port', clamp(.4 / (cssPerCm * ISW / 1536), 1, 1.45));
}
// every entry re-attaches everything (the app in its CSS3D holder, its surface, focus trap and
// inert page); every exit undoes it, so the tenth entry works like the first
function openPad() {
  if (padMode === 'open' || padMode === 'opening') return;
  // coming back while the camera is still rising keeps the focus target of the first entry
  if (padMode === 'closed') { const a = document.activeElement; returnFocus = a && !ui.el.contains(a) ? a : null; }
  padMode = 'opening'; arrivePending = false;
  flat.classList.remove('on'); dock(); computePadCam(); ui.attach();
  html.classList.add('ipad'); outside.forEach(el => el.inert = true);
  padUi.hidden = false; document.body.style.cursor = ''; hover = null;
  pAnim = { from: pMix, to: 1, t0: performance.now(), dur: reduced() ? 0 : 1250 };
  request(3);
}
function padArrived() { if (padMode !== 'open') return; ui.sync(); ui.update(); flatten(); ui.focus(); }
function closePad() {
  if (padMode !== 'open' && padMode !== 'opening') return;
  padMode = 'closing'; arrivePending = false; ui.detach();
  cssR.domElement.classList.remove('on'); flat.classList.remove('on'); dock();
  // the 3D screen shows what you drew, with the app's chrome, as a still
  pad.render(); padTex.needsUpdate = true;
  html.classList.remove('ipad'); outside.forEach(el => el.inert = false); padUi.hidden = true;
  if (returnFocus && returnFocus !== document.body && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  pAnim = { from: pMix, to: 0, t0: performance.now(), dur: reduced() ? 0 : 1050 };
  request(3);
}
// the keyboard's way in (the mouse clicks the tablet, or its dot, in the intermezzo)
document.getElementById('pad-btn').addEventListener('click', openPad);
addEventListener('keydown', e => {
  if (padMode === 'closed' || padMode === 'closing') return;
  if (e.key === 'Escape') { e.preventDefault(); if (ui.popOpen()) ui.closePop(true); else closePad(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? pad.redo() : pad.undo(); ui.sync(); }
});
addEventListener('wheel', e => { if (padMode !== 'closed') e.preventDefault(); }, { passive: false });
addEventListener('touchmove', e => { if (padMode !== 'closed' && !e.target.closest('.pa')) e.preventDefault(); }, { passive: false });

/* ---------- touching things on the desk: only in the intermezzo, with the sheet lifted ---------- */
// elsewhere the desk is a picture behind the words: no pointer, no clicks (the header's switches and the
// keyboard's desk buttons work everywhere)
const atDesk = () => padMode === 'closed' && (window.__lift || 0) > .9;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const BLOCK = 'a,button,input,textarea,label,.pane,.card,.copy,.window h2,.top,footer,.svc-head h2,.pad-ui,.pa';
const targets = [['ipad', IP.ipad], ['mug', MG.root], ['lamp', LP.lamp], ['turntable', TTB.hit], ['plant', plant], ['phone', PH.phone]];
// → { n: name } or null
function pick(target, x, y) {
  if (!atDesk() || !target || !target.closest || target.closest(BLOCK)) return null;
  ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
  let best = null;
  for (const [n, o] of targets) { const h = ray.intersectObject(o, true)[0]; if (h && (!best || h.distance < best.d)) best = { n, d: h.distance, h }; }
  return best && { n: best.n };
}

/* ---------- hover: the pointer, picked at most once per animation frame and only after it moved ---------- */
let hover = null, moved = null;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  moved = { target: e.target, x: e.clientX, y: e.clientY };
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { moved = { target: null, x: 0, y: 0 }; });
function hoverTick() {
  // scrolled away from the desk under a still pointer: drop the hover
  if (hover && !atDesk()) { hover = null; document.body.style.cursor = ''; }
  if (!moved) return;
  const m = moved; moved = null;
  hover = pick(m.target, m.x, m.y);
  document.body.style.cursor = hover ? 'pointer' : '';
}
// what touching each thing does (the object itself, or its hotspot)
function act(n) {
  if (n === 'ipad') openPad(); else if (n === 'mug') MG.click(); else if (n === 'lamp') setLamp((lampIdx + 1) % 3);
  else if (n === 'turntable') toggleTT();
  else if (n === 'plant') plant.poke();
  else if (n === 'phone') PH.screen.toggle(reduced() || SHOT);
  request(3);
}
addEventListener('click', e => {
  const p = pick(e.target, e.clientX, e.clientY); if (!p) return;
  act(p.n);
});

const winP = V(0, 0, 0);

/* ---------- the laptop's screen, seen through a window cut to its shape at each project ---------- */
// the display's four corners in the world (the laptop never moves); #scrwin is a hole in the sheet's
// mask, #scrrim its hairline. It opens as a card reaches the middle of the screen.
const scrWin = document.getElementById('scrwin'), scrRim = document.getElementById('scrrim');
const SCR_CORNERS = (() => {
  const q = MB.glass.getWorldQuaternion(new THREE.Quaternion()), rx = V(1, 0, 0).applyQuaternion(q), uy = V(0, 1, 0).applyQuaternion(q);
  return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => scrC.clone().addScaledVector(rx, a * SCR_W / 2).addScaledVector(uy, b * SCR_H / 2).addScaledVector(scrN, .05));
})();
let scrA = -1;
function placeScr() {
  let a = 0;
  if (padMode === 'closed') { const y = scrollY; for (const c of LAY.cards) { const top = c.top - y; a = Math.max(a, sstep(clamp(Math.min(H * .7 - top, top + c.h - H * .3) / (H * .25), 0, 1))); } }
  const ar = Math.round(a * 50) / 50;
  if (ar === 0 && scrA === 0) return;
  const d = SCR_CORNERS.map(c => { winP.copy(c).project(camera); return `${((winP.x + 1) / 2 * W).toFixed(1)} ${((1 - winP.y) / 2 * H).toFixed(1)}`; });
  const path = 'M' + d.join('L') + 'Z';
  scrWin.setAttribute('d', path); scrRim.setAttribute('d', path);
  if (ar !== scrA) { const v = Math.round((1 - ar) * 255); scrWin.setAttribute('fill', `rgb(${v},${v},${v})`); scrWin.setAttribute('stroke', `rgb(${v},${v},${v})`); scrRim.setAttribute('stroke-opacity', (ar * .3).toFixed(3)); scrA = ar; }
}

/* ---------- the intermezzo's hotspots: a dot on each thing you can touch, and what it does ---------- */
// projected from the objects, dots only: decorative (aria-hidden, out of the tab order), still
// clickable; the keyboard has the switches in .scene-ctl. Shown only while the sheet is off the
// desk (window.__lift, from the sheet script).
const hsWrap = document.getElementById('hotspots');
const HS_AT = {
  lamp: LP.barCenter.clone().add(V(0, 1.6, 0)),
  ipad: IP.ipad.localToWorld(V(0, IH, 0)),
  plant: plant.localToWorld(V(0, 12, 0)),
  phone: PH.phone.localToWorld(V(0, 1, 0)),
  turntable: TTB.spin.getWorldPosition(V(0, 0, 0)).add(V(0, 3, 0)),
  mug: MG.root.localToWorld(V(0, 10.6, 0)),
};
const hs = [...hsWrap.querySelectorAll('.hs')].map(el => ({ el, n: el.dataset.hs, p: HS_AT[el.dataset.hs], x: 0, y: 0, vis: false }));
hs.forEach(h => {
  h.el.addEventListener('click', () => act(h.n));
});
let hsOn = false;
const hsP = V(0, 0, 0), head = document.querySelector('.top'); let headH = 0;
function placeHotspots() {
  const on = padMode === 'closed' && (window.__lift || 0) > .9;
  if (on !== hsOn) { hsWrap.classList.toggle('on', on); hsOn = on; }
  if (!on) return;
  const top = headH || (headH = head.offsetHeight);
  for (const h of hs) {
    hsP.copy(h.p).project(camera);
    h.x = (hsP.x + 1) / 2 * W; h.y = (1 - hsP.y) / 2 * H;
    h.vis = hsP.z < 1 && h.x > 12 && h.x < W - 12 && h.y > top + 12 && h.y < H - 12;
    h.el.classList.toggle('vis', h.vis);
    h.el.style.transform = `translate(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px)`;
  }
}

/* ---------- the loop: render only when something changed ---------- */
const clock = new THREE.Clock(); let first = true;
const camP = V(0, 0, 0), camT = V(0, 0, 0), UP = V(0, 1, 0), focusOff = V(14, 46, 30);
const lastCam = new Float32Array(20), frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), mugSphere = new THREE.Sphere(V(61, 5, 3), 8), ttSphere = new THREE.Sphere(V(61, 8, -29.4), 28);
addEventListener('resize', resize); resize();
let ftAcc = 0, ftN = 0, slowFor = 0, lastRipple = 0, renders = 0;
function cameraChanged() {
  const e = camera.matrixWorld.elements, p = camera.projectionMatrix.elements; let ch = false;
  for (let i = 0; i < 16; i++) { const v = i < 12 ? e[i] : e[i]; if (Math.abs(lastCam[i] - v) > 1e-5) ch = true; lastCam[i] = v; }
  const vo = camera.view ? camera.view.offsetX + camera.view.offsetY * 7 : 0; if (Math.abs(lastCam[16] - vo) > 1e-3) ch = true; lastCam[16] = vo;
  if (Math.abs(lastCam[17] - p[5]) > 1e-6) ch = true; lastCam[17] = p[5];
  return ch;
}
// nothing to draw while the canvas is not on screen (hidden by the page, or the tab in the background)
let onScreen = true;
if ('IntersectionObserver' in window) new IntersectionObserver(es => { onScreen = es[es.length - 1].isIntersecting; if (onScreen) request(2); }).observe(canvas);
let firstFrame = null; const firstDrawn = new Promise(r => { firstFrame = r; });
function frame() {
  if (lost) return;
  requestAnimationFrame(frame);
  if (document.hidden || !onScreen) return;
  const dt = Math.min(.05, clock.getDelta()), time = clock.elapsedTime;
  hoverTick();

  if (pAnim) {
    const t = pAnim.dur ? clamp((performance.now() - pAnim.t0) / pAnim.dur, 0, 1) : 1;
    pMix = pAnim.from + (pAnim.to - pAnim.from) * t;
    if (t >= 1) { pAnim = null; if (padMode === 'opening') { padMode = 'open'; arrivePending = true; } else if (padMode === 'closing') padMode = 'closed'; }
    request(1);
  }
  computeGoal();
  const snap = first || SHOT || RM.matches; first = false;
  const a = snap ? 1 : 1 - Math.pow(.0025, dt);
  cur.p.lerp(goal.p, a); cur.t.lerp(goal.t, a); cur.fp.lerp(goal.fp, a);
  for (const k of ['sx', 'sy', 'fi', 'dof', 'amb']) cur[k] += (goal[k] - cur[k]) * a;

  camP.copy(cur.p); camT.copy(cur.t); camera.up.copy(UP);
  let sxv = cur.sx, syv = cur.sy, dof = cur.dof;
  if (viewOverride) { const v = CLOSE[viewOverride](); camP.copy(v.p); camT.copy(v.t); sxv = 0; syv = 0; dof = v.dof || 0; }
  if (pMix > 0) {
    const e = ease(pMix);
    camP.lerp(padCam.p, e); camT.lerp(padCam.t, e); camera.up.lerp(padCam.up, e).normalize(); sxv *= 1 - e; syv *= 1 - e; dof *= 1 - e;
  }
  camera.position.copy(camP); camera.lookAt(camT);
  camera.setViewOffset(W, H, -sxv * W, syv * H, W, H);
  camera.updateMatrixWorld();
  const camMoved = cameraChanged(); if (camMoved) request(1);
  if (arrivePending) { arrivePending = false; padArrived(); }

  // lamp
  if (lampCur !== lampGoal) { lampCur += Math.sign(lampGoal - lampCur) * Math.min(Math.abs(lampGoal - lampCur), dt * 3); applyLamp(lampCur); }
  focus.target.position.copy(cur.fp); focus.position.copy(cur.fp).add(focusOff); focus.intensity = cur.fi * 1200 * (pMix > 0 ? 1 - pMix : 1);
  focus.angle = .5 + .35 * cur.amb; hemi.intensity = hemiBase + .35 * cur.amb;
  MB.scrLight.intensity = goal.scr >= 0 ? .9 : .35;

  IP.dispMat.specularIntensity = .75 - .6 * pMix;
  // while the HTML app is up, redraw its canvas only; the 3D texture waits for the close
  if (padMode === 'open') ui.update();
  else if (padMode === 'opening' && pMix > .55) { cssR.domElement.classList.add('on'); ui.update(); renderCss(); }
  else if (pad.dirty && padMode === 'closed') { pad.render(); padTex.needsUpdate = true; request(1); }

  setScreen(goal.scr);
  if (fading) { DU.scrMix.value = (SHOT || RM.matches) ? 1 : Math.min(1, DU.scrMix.value + dt * 3.5); if (DU.scrMix.value >= 1) fading = 0; request(1); }

  if (MG.update(RM.matches ? 0 : dt, time)) requestShadow(1);
  // the turntable is on at load: a turning platter alone needs a frame (not a shadow pass), and only in view
  const tu = TTB.update(RM.matches ? 0 : dt);
  if (tu > 1) requestShadow(1);
  else if (tu) { pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); if (frustum.intersectsSphere(ttSphere)) spinOnly = true; }
  if (plant.tick(RM.matches || SHOT ? 0 : dt)) request(1);
  if (PH.screen.tick(RM.matches || SHOT ? 0 : dt)) request(1);
  // the coffee's idle ripple: a few frames a second, only if the mug is in view
  if (!RM.matches && !SHOT && MG.state() === 'full' && time - lastRipple > 1 / 12) {
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    if (frustum.intersectsSphere(mugSphere)) { request(1); lastRipple = time; }
  }
  const now = performance.now(), spin = spinOnly; spinOnly = false;
  if (want <= 0 && !SHOT && !(spin && now - lastDraw >= SPIN_MS)) return;
  lastDraw = now;
  want = Math.max(0, want - 1);
  if (shadowWant > 0) { renderer.shadowMap.needsUpdate = true; shadowWant--; }

  pipe.bokeh.enabled = dof > .02;
  if (pipe.bokeh.enabled) { const u = pipe.bokeh.uniforms; u.focus.value = camera.position.distanceTo(camT); u.aperture.value = .00012 * dof; u.maxblur.value = .007 * dof; }
  const t0 = performance.now();
  pipe.composer.render(dt);
  // the first frame counts once it is on screen: the next animation frame comes after it is presented
  if (firstFrame) { const f = firstFrame; firstFrame = null; requestAnimationFrame(() => f()); }
  placeScr(); placeHotspots();
  renders++; window.__renders = renders;
  // adaptive resolution while frames keep coming: drop the pixel ratio if they are slow
  if (!SHOT && dt < .1) { ftAcc += dt; ftN++; if (ftN >= 40) { const avg = ftAcc / ftN; ftAcc = 0; ftN = 0; if (avg > .02 && DPR > 1) { slowFor++; if (slowFor >= 2) { DPR = Math.max(1, +(DPR - .25).toFixed(2)); resize(); slowFor = 0; } } else slowFor = 0; } }
  window.__frames = (window.__frames || 0) + 1;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { clock.getDelta(); request(2); } });

window.__desk = {
  view: n => { viewOverride = n; first = true; html.classList.toggle('inspect', !!n); request(3); },
  open: openPad, close: closePad, state: () => padMode,
  lamp: i => setLamp(i), mug: () => { MG.click(); request(2); }, mugState: () => MG.state(),
  mugSim: sec => { for (let t = 0; t < sec; t += 1 / 60) MG.update(1 / 60, t); requestShadow(2); },
  plant: () => { plant.poke(); request(2); }, phone: phoneHit, phoneBroken: () => PH.screen.broken(), plantSim: sec => { for (let t = 0; t < sec; t += 1 / 60) plant.tick(1 / 60); request(2); },
  tt: () => toggleTT(false), ttPlaying: () => TTB.playing(), act,
  hotspots: () => hs.map(h => ({ n: h.n, vis: h.vis && hsOn, x: Math.round(h.x), y: Math.round(h.y) })),
  // where a touchable thing is on screen now (for tests): the hotspot's point, or the lamp's bar / the mug's body
  xy: n => { const p = (n === 'lamp' ? LP.barCenter.clone() : n === 'mug' ? MG.root.localToWorld(V(0, 5, 0)) : HS_AT[n].clone()).project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, z: p.z }; },
  atDesk,
  // where the record's label (or a spot on the plinth) is on screen (for tests)
  labelXY: (deck = false) => { const p = deck ? TTB.tt.localToWorld(V(-15, 6.2, 11)) : TTB.spin.getWorldPosition(V(0, 0, 0)).add(V(0, 2.4, 0)); p.project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, z: p.z }; }, ttSim: sec => { for (let t = 0; t < sec; t += 1 / 60) TTB.update(1 / 60); requestShadow(2); },
  pad, ui, pipe,
  uiToClient: (ux, uy) => {
    const r = ui.el.querySelector('.pa-art').getBoundingClientRect(), land = pad.orient === 'land';
    return { x: r.left + ux / (land ? 2048 : 1536) * r.width, y: r.top + uy / (land ? 1536 : 2048) * r.height };
  },
  collisions: () => collisions({ desk: DESK, wallZ: DESK.wallZ }),
  info: () => ({ dpr: DPR, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
  perf: (n = 10) => {
    const gl = renderer.getContext(), px = new Uint8Array(4); renderer.info.autoReset = false;
    let calls = 0, tris = 0; const times = [];
    for (let i = 0; i < n; i++) {
      renderer.info.reset(); const t0 = performance.now();
      camera.position.x += .05; camera.updateMatrixWorld(); renderer.shadowMap.needsUpdate = i === 0;
      pipe.composer.render(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      times.push(performance.now() - t0); if (i === 1) { calls = renderer.info.render.calls; tris = renderer.info.render.triangles; }
    }
    renderer.info.autoReset = true; times.sort((a, b) => a - b);
    return { msMedian: +times[n >> 1].toFixed(1), calls, tris, passes: pipe.composer.passes.filter(p => p.enabled).length, shadowAuto: renderer.shadowMap.autoUpdate, programs: renderer.info.programs.length, dpr: DPR };
  },
  // move the camera very slowly, render each step, and compare consecutive frames pixel by pixel
  flashTest: (n = 8, step = .15) => {
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, buf = [new Uint8Array(w * h * 4), new Uint8Array(w * h * 4)], out = [];
    for (let i = 0; i < n; i++) {
      camera.position.x += step; camera.position.y += step * .3; camera.updateMatrixWorld();
      pipe.composer.render(1 / 60); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf[i % 2]);
      if (i) { const A = buf[i % 2], B = buf[(i + 1) % 2]; let big = 0, max = 0, sum = 0;
        for (let p = 0; p < A.length; p += 4) { const d = Math.abs((A[p] + A[p + 1] + A[p + 2]) - (B[p] + B[p + 1] + B[p + 2])) / 3; sum += d; if (d > max) max = d; if (d > 60) big++; }
        out.push({ meanDiff: +(sum / (A.length / 4)).toFixed(2), maxDiff: max, pixelsOver60: big }); }
    }
    return out;
  },
};

/* ================= before the first frame ================= */
// 1. the textures: the workers' jobs (each one moves the progress line) and the record's prints
// (the polaroids' photos come after the first frame: they are a few pixels at the first station)
{
  let done = 0; const seen = new Set();
  const count = () => { done++; progress(.2 + .45 * Math.min(1, done / Math.max(1, seen.size))); };
  // (a finished job can start another: the canvases' weave waits for their glyphs)
  let n = -1;
  while (n !== pending.length) { n = pending.length; for (const p of pending) if (!seen.has(p)) { seen.add(p); p.then(count, count); } await Promise.allSettled([...pending]); }
  const wait = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  await wait(TTB.art, 4000);
}
progress(.65);
// 2. on the GPU, a few at a time, so no single task uploads them all
{
  const all = new Set(jobTextures());
  scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) for (const v of Object.values(m)) if (v && v.isTexture) all.add(v); });
  all.add(LP.spot.map);
  let t0 = performance.now();
  for (const t of all) {
    if (!t.image || t.version === 0) continue;
    renderer.initTexture(t);
    if (performance.now() - t0 > 12) { await tick(); t0 = performance.now(); }
  }
  releaseBitmaps();
}
progress(.75);
// 3. every shader program, compiled in parallel where the browser can (KHR_parallel_shader_compile)
// and waited for without blocking: the scene's materials as the composer renders them (into its
// buffer), and the post passes' own, including the depth-of-field ones a later station needs
await tick();
{
  computeGoal(); camera.position.copy(goal.p); camera.lookAt(goal.t); camera.updateMatrixWorld();
  // the passes' full-screen quads (drawn with no lights) and the scene-wide overrides (the AO's
  // normals, the depth of field's depth: drawn over the scene's objects, so with its lights)
  const geo = new THREE.PlaneGeometry(2, 2), quads = new THREE.Group(), overrides = new THREE.Group(), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  for (const m of [pipe.gtao.gtaoMaterial, pipe.gtao.pdMaterial, pipe.gtao.blendMaterial, pipe.gtao.copyMaterial, pipe.gtao.depthRenderMaterial, pipe.bokeh.materialBokeh]) if (m) quads.add(new THREE.Mesh(geo, m));
  for (const m of [pipe.gtao.normalMaterial, pipe.bokeh.materialDepth]) if (m) { overrides.add(new THREE.Mesh(geo, m)); overrides.add(new THREE.InstancedMesh(geo, m, 1)); }
  const toScreen = new THREE.Mesh(geo, pipe.finish.material);
  // one object at a time (building a program's source is itself a few ms of string work), with the
  // scene as the source of the lights and the environment. compile(object, camera, scene) also
  // counts the lights inside `object`, which are already in the scene: passed through a view that
  // shows its meshes and hides its lights, so each program is the one the frame will ask for.
  const meshesOf = o => ({ traverse: f => o.traverse(f), traverseVisible() {} });
  // the output pass sets its defines on its first render: set them now, the same way
  const out = pipe.composer.passes.find(p => p.material && p.material.name === 'OutputShader');
  if (out) { out._outputColorSpace = renderer.outputColorSpace; out._toneMapping = renderer.toneMapping; out.material.defines = { SRGB_TRANSFER: '', AGX_TONE_MAPPING: '' }; out.material.needsUpdate = true; quads.add(new THREE.Mesh(geo, out.material)); }
  const jobs = [];
  for (const o of [...scene.children, overrides, quads]) {
    renderer.setRenderTarget(pipe.composer.renderTarget1);
    jobs.push(o === quads ? renderer.compileAsync(quads, ortho) : renderer.compileAsync(meshesOf(o), camera, scene));
    renderer.setRenderTarget(null);
    await tick();
  }
  jobs.push(renderer.compileAsync(toScreen, ortho));
  await Promise.all(jobs);
  // what the first frame would otherwise do all at once: read each program's uniforms and
  // attributes back (once linked, a quick query), and compute every geometry's bounding sphere
  let t0 = performance.now();
  const warm = new Set(), geos = new Set();
  scene.traverse(o => { if (o.geometry) geos.add(o.isInstancedMesh ? o : o.geometry); for (const m of o.material ? [].concat(o.material) : []) warm.add(m); });
  for (const m of [...warm, ...quads.children.map(q => q.material), ...overrides.children.map(q => q.material), toScreen.material]) {
    const p = renderer.properties.get(m).currentProgram;
    if (p) p.getUniforms();
    if (performance.now() - t0 > 12) { await tick(); t0 = performance.now(); }
  }
  for (const g of geos) {
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (performance.now() - t0 > 12) { await tick(); t0 = performance.now(); }
  }
}
progress(.95);
const compiled = renderer.info.programs.map(p => p.cacheKey);
// 4. the first frame
requestAnimationFrame(frame);
await firstDrawn;
progress(1);
window.__deskReady = true;
window.__desk.programs = () => ({ compiled: compiled.length, now: renderer.info.programs.length, late: renderer.info.programs.filter(p => !compiled.includes(p.cacheKey)).map(p => { const a = p.cacheKey.split(','); let best = null, bi = -1; for (const c of compiled) { const b = c.split(','); let i = 0; while (i < a.length && a[i] === b[i]) i++; if (i > bi) { bi = i; best = b; } } return p.name + ' @' + bi + ': late=' + a.slice(bi, bi + 3).join(',') + ' compiled=' + (best ? best.slice(bi, bi + 3).join(',') : '') + ' | ' + a.slice(Math.max(0, bi - 6), bi).join(','); }) });

// after it: the polaroids' photos; when the page is idle, the other lamp levels' reflections, the
// drawing app's sketch for a phone held upright, and (if nobody scrolled there yet) the screenshots
(async () => {
  for (const g of [pol1, pol2, pol3]) g.userData.photo.userData.load();
  await idle(); if (!lost) env(1);
  await idle(); if (!lost) env(2);
  if (innerHeight > innerWidth && !sketchAsked.port) { await idle(); sketchAsked.port = true; await sketchFor('port'); }
  // the workers' part is done: their memory goes back (a later sketch, after a rotation, is painted here)
  pool.close();
  await new Promise(r => setTimeout(r, 2500)); await idle(4000); loadShots();
  if (/[?&](debug|shot)/.test(location.search)) { const c = collisions({ desk: DESK, wallZ: DESK.wallZ }); if (c.length) console.warn('[desk] intersections:', c); else console.info('[desk] nothing intersects'); }
})();
return { renderer, stats: pool.stats };
}
