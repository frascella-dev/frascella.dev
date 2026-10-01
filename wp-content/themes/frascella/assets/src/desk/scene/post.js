// Renderer, PCSS soft shadows, and the photographic post chain:
// render (MSAA, half float) → GTAO → bloom (emissive only) → [bokeh] → AgX + sRGB → vignette, grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* PCSS: percentage-closer soft shadows for the spot light (the lamp). A blocker search
   estimates how far the occluder is from the receiver, and the filter widens with it:
   hard where the mug meets the desk, soft far from it. The spot's shadow camera near/far
   are baked in as defines so the depths can be linearised. */
export function installPCSS({ near, far, blocker = 16, pcf = 28 }) {
  const fn = `
#define PCSS_NEAR ${near.toFixed(2)}
#define PCSS_FAR ${far.toFixed(2)}
float pcssLin( float d ) { return PCSS_NEAR * PCSS_FAR / ( PCSS_FAR - d * ( PCSS_FAR - PCSS_NEAR ) ); }
vec2 pcssVogel( int i, int n, float phi ) { float r = sqrt( ( float( i ) + .5 ) / float( n ) ); float t = float( i ) * 2.39996323 + phi; return r * vec2( cos( t ), sin( t ) ); }
float PCSS( sampler2D sm, vec4 c, vec2 texel, float lightTexels ) {
  float phi = 6.2831853 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( .06711056, .00583715 ) ) ) );
  float zR = pcssLin( c.z );
  float lightUV = lightTexels * texel.x;
  float search = lightUV * clamp( ( zR - PCSS_NEAR ) / zR, .15, 1. );
  float sum = 0., n = 0.;
  for ( int i = 0; i < ${blocker}; i ++ ) {
    float d = unpackRGBAToDepth( texture2D( sm, c.xy + pcssVogel( i, ${blocker}, phi ) * search ) );
    if ( d < c.z ) { sum += pcssLin( d ); n += 1.; }
  }
  if ( n < .5 ) return 1.;
  float zB = sum / n;
  float pen = clamp( ( zR - zB ) / zB * lightUV * 1.4, texel.x * 1.2, lightUV * .9 );
  float s = 0.;
  for ( int i = 0; i < ${pcf}; i ++ ) s += step( c.z, unpackRGBAToDepth( texture2D( sm, c.xy + pcssVogel( i, ${pcf}, phi + 1.7 ) * pen ) ) );
  return s / float( ${pcf} );
}
`;
  let s = THREE.ShaderChunk.shadowmap_pars_fragment;
  s = s.replace('float getShadow(', fn + '\nfloat getShadow(');
  s = s.replace('#if defined( SHADOWMAP_TYPE_PCF )', '#if defined( SHADOWMAP_TYPE_PCF )\n\t\t\tshadow = PCSS( shadowMap, shadowCoord, vec2( 1.0 ) / shadowMapSize, shadowRadius );\n\t\t#elif defined( PCSS_UNUSED_PCF )');
  THREE.ShaderChunk.shadowmap_pars_fragment = s;
}

const FinishShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: .32 }, grainAmt: { value: .018 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, grainAmt; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (any(isnan(c)) || any(isinf(c))) c = vec3(0.);        // never let a bad pixel flash
      c = clamp(c, 0., 1.);
      // a gentle print curve: lift nothing, deepen the lower mids a touch
      c = mix(c, c * c * (3. - 2. * c), .18);
      vec2 q = (vUv - .5) * vec2(res.x / res.y, 1.);
      float v = 1. - vig * smoothstep(.35, 1.25, length(q));
      c *= v;
      // film grain, strongest in the mid tones; fixed, so a still frame stays still
      float l = dot(c, vec3(.2126, .7152, .0722));
      float g = (h(gl_FragCoord.xy) + h(gl_FragCoord.xy * 1.37 + 17.) - 1.);
      c += g * grainAmt * (.35 + 1.3 * l * (1. - l));
      gl_FragColor = vec4(c, 1.);
    }`,
};

export function createPipeline(renderer, scene, camera, { shot }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: shot || devicePixelRatio >= 1.75 ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  const render = new RenderPass(scene, camera);
  composer.addPass(render);

  const gtao = new GTAOPass(scene, camera, size.x, size.y);
  gtao.updateGtaoMaterial({ radius: 3.2, distanceExponent: 1.6, thickness: 2.5, scale: 1.15, samples: 8, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
  gtao.blendIntensity = .92;
  // AO at a reduced resolution: it is low frequency, and the denoiser smooths it
  const aoScale = { v: 1 };
  const gSet = gtao.setSize.bind(gtao); gtao.setSize = (w, h) => gSet(Math.max(1, Math.round(w * aoScale.v)), Math.max(1, Math.round(h * aoScale.v)));
  composer.addPass(gtao);


  const bokeh = new BokehPass(scene, camera, { focus: 60, aperture: .0006, maxblur: .006 });
  bokeh.enabled = false;
  composer.addPass(bokeh);

  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);

  return {
    composer, gtao, bokeh, finish, aoScale,
    setSize(w, h, dpr) {
      aoScale.v = dpr > 1.3 ? .5 : .75;
      composer.setPixelRatio(dpr); composer.setSize(w, h);
      finish.uniforms.res.value.set(w, h);
    },
  };
}
