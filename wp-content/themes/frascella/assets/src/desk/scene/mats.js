// Shared materials. Every surface carries some micro-roughness variation; nothing is pure black or white.
import * as THREE from 'three';
import { jt } from './jobs.js';

export const M = {};

export function initMats() {
  // most surfaces here are extrusions whose UVs are in cm: one smudge tile per 22 cm; the 0..1 UV
  // versions are clones (one upload for both). (The prototype also painted a fibre map nothing used.)
  const smudgeTex = jt('smudge1', 'c', { srgb: false, repeat: [1 / 22, 1 / 22], cost: 25 });
  const smudgeTex2 = jt('smudge2', 'c', { srgb: false, repeat: [1 / 22, 1 / 22], cost: 22 });
  M.smudge = smudgeTex; M.smudge2 = smudgeTex2;
  M.smudgeUV = smudgeTex.clone(); M.smudgeUV.repeat.set(1, 1);
  M.smudge2UV = smudgeTex2.clone(); M.smudge2UV.repeat.set(1, 1);

  // space black anodised aluminium, bead blasted: a dielectric film over metal, satin, isotropic
  M.alBlack = new THREE.MeshPhysicalMaterial({ color: 0x2c2c30, metalness: .82, roughness: .46, roughnessMap: smudgeTex, clearcoat: .18, clearcoatRoughness: .5, envMapIntensity: 1 });
  M.alSilver = new THREE.MeshPhysicalMaterial({ color: 0xbfc1c4, metalness: .92, roughness: .36, roughnessMap: smudgeTex2, envMapIntensity: 1 });
  M.titanium = new THREE.MeshPhysicalMaterial({ color: 0x9d978e, metalness: .95, roughness: .3, roughnessMap: smudgeTex2, envMapIntensity: 1 });
  M.steel = new THREE.MeshPhysicalMaterial({ color: 0xb6b9bd, metalness: 1, roughness: .24, roughnessMap: smudgeTex2 });
  M.darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x3a3b3e, metalness: .9, roughness: .34, roughnessMap: smudgeTex2 });
  M.powderBlack = new THREE.MeshPhysicalMaterial({ color: 0x232326, metalness: .25, roughness: .58, roughnessMap: smudgeTex2, clearcoat: .1, clearcoatRoughness: .6 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .85 });
  M.well = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: .8 });
  M.darkGlass = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: .05, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, ior: 1.52 });
  M.lens = new THREE.MeshPhysicalMaterial({ color: 0x0b0e18, roughness: .02, clearcoat: 1, clearcoatRoughness: 0, iridescence: .7, iridescenceIOR: 1.7, ior: 1.6 });
  // glass over a print or a window: black diffuse, reflections added on top
  M.reflGlass = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .05, metalness: 0, specularIntensity: .6, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  M.whitePlastic = new THREE.MeshPhysicalMaterial({ color: 0xe6e3dd, roughness: .6, roughnessMap: smudgeTex2, specularIntensity: .55, sheen: .15, sheenRoughness: .8, sheenColor: new THREE.Color(0xffffff) });
  M.blackPlastic = new THREE.MeshPhysicalMaterial({ color: 0x232326, roughness: .5, roughnessMap: smudgeTex2, specularIntensity: .5 });
  M.paperWhite = new THREE.MeshStandardMaterial({ color: 0xebe6dc, roughness: .85 });
  return M;
}

// A glass front whose emissive part is a display: one surface, so the bezel, the picture and the
// reflections can never z-fight. `glass` = [w, h] of the glass (its 0..1 UVs), `scr` = [w, h, cx, cy]
// of the lit area inside it (cm, from the glass centre, +y up), `r` its corner radius; `notch` = [w, h]
// cut down from the top edge, `notchR` = [radius of its lower corners, radius of the fillets at the top].
export function displayMaterial({ glass, scr, r, topOnly = false, notch = null, notchR = [.25, .12], island = null, bright = 1.4, tex = null }) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: .06, metalness: 0, ior: 1.5, specularIntensity: .75, clearcoat: .0, emissive: 0xffffff, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const U = {
    scrA: { value: tex }, scrB: { value: tex }, scrMix: { value: 0 }, scrBright: { value: bright },
    glassSize: { value: new THREE.Vector2(glass[0], glass[1]) }, scrRect: { value: new THREE.Vector4(...scr) }, scrR: { value: r },
    notch: { value: new THREE.Vector2(...(notch || [0, 0])) }, notchR: { value: new THREE.Vector2(...notchR) }, island: { value: new THREE.Vector4(...(island || [0, 0, 0, 0])) },
  };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGlassUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvGlassUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vGlassUv; uniform sampler2D scrA, scrB; uniform float scrMix, scrBright, scrR; uniform vec2 glassSize, notch, notchR; uniform vec4 scrRect, island;
      float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }`)
      .replace('#include <emissivemap_fragment>', `
      {
        vec2 p = (vGlassUv - .5) * glassSize - scrRect.zw;           // cm from the display centre
        vec2 hb = scrRect.xy * .5;
        float d = sdRound(p, hb, scrR);
        ${topOnly ? 'if (p.y < 0.) d = max(abs(p.x) - hb.x, abs(p.y) - hb.y);' : ''}
        float aa = fwidth(d) * .8 + 1e-4;
        float on = 1. - smoothstep(-aa, aa, d);
        ${notch ? `{
          // the notch: the bezel carried down (q.y = depth under the panel's top edge), straight sides,
          // rounded lower corners, and small concave fillets where its sides meet the panel's top edge
          vec2 q = vec2(abs(p.x), hb.y - p.y);
          float nd = sdRound(q - vec2(0., (notch.y - 1.) * .5), vec2(notch.x * .5, (notch.y + 1.) * .5), notchR.x);
          vec2 u = max(vec2(notchR.y - nd, notchR.y - q.y), 0.);
          float blk = max(notchR.y, min(nd, q.y)) - length(u);    // round union with the bezel
          on *= smoothstep(-aa, aa, blk); }` : ''}
        ${island ? `{ float id = sdRound(p - island.zw, island.xy * .5, island.y * .5); on *= smoothstep(-aa, aa, id); }` : ''}
        vec2 suv = p / scrRect.xy + .5;
        vec3 s = mix(texture2D(scrA, suv).rgb, texture2D(scrB, suv).rgb, scrMix);
        // the panel falls off slightly at its edges
        float edge = smoothstep(0., .015, suv.x) * smoothstep(1., .985, suv.x) * smoothstep(0., .015, suv.y) * smoothstep(1., .985, suv.y);
        totalEmissiveRadiance = s * scrBright * on * (.9 + .1 * edge);
      }`);
  };
  m.customProgramCacheKey = () => `disp-${topOnly}-${!!notch}-${!!island}`;
  return m;
}
