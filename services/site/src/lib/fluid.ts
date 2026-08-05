import * as THREE from "three";

/**
 * The paper background: a Navier–Stokes fluid solved on the GPU, tinted so
 * it reads as ink bleeding through a sheet rather than a colour field. The
 * pointer pushes velocity into it; if nobody moves, it stirs itself.
 *
 * Standard ping-pong FBO pipeline — advect, curl, vorticity confinement,
 * divergence, Jacobi pressure, gradient subtract, display.
 */
export type FluidOptions = {
    /** 0–2, scales how hard the pointer pushes. */
    strength?: number;
    /** Ink colour. */
    tint?: string;
    /** Return true to skip a frame — used while the work stage covers the page. */
    paused?: () => boolean;
};

export function initFluid(canvas: HTMLCanvasElement, opts: FluidOptions = {}) {
    const strength = opts.strength ?? 1;
    const paused = opts.paused ?? (() => false);

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: false,
            preserveDrawingBuffer: true,
        });
    } catch {
        // No WebGL — the page is plain paper, which is a fine outcome.
        return () => {};
    }
    renderer.autoClear = false;
    renderer.setPixelRatio(1);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    scene.add(quad);

    const blit = (mat: THREE.Material, target: THREE.WebGLRenderTarget | null) => {
        quad.material = mat;
        renderer.setRenderTarget(target);
        renderer.render(scene, cam);
    };

    const VERT =
        "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
    const prog = (frag: string, uniforms: Record<string, { value: unknown }>) =>
        new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: "precision highp float;\nvarying vec2 vUv;\n" + frag,
            uniforms,
            depthTest: false,
            depthWrite: false,
        });

    const advectMat = prog(
        `
        uniform sampler2D uVelocity; uniform sampler2D uSource;
        uniform vec2 uTexel; uniform float uDt; uniform float uDissipation;
        void main(){
          vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
          gl_FragColor = uDissipation * texture2D(uSource, coord);
        }`,
        {
            uVelocity: { value: null },
            uSource: { value: null },
            uTexel: { value: new THREE.Vector2() },
            uDt: { value: 0.016 },
            uDissipation: { value: 1 },
        },
    );

    const splatMat = prog(
        `
        uniform sampler2D uTarget; uniform float uAspect; uniform float uRadius;
        uniform vec3 uColor; uniform vec2 uPoint;
        void main(){
          vec2 p = vUv - uPoint;
          p.x *= uAspect;
          vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
          gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
        }`,
        {
            uTarget: { value: null },
            uAspect: { value: 1 },
            uRadius: { value: 0.0002 },
            uColor: { value: new THREE.Vector3() },
            uPoint: { value: new THREE.Vector2() },
        },
    );

    const curlMat = prog(
        `
        uniform sampler2D uVelocity; uniform vec2 uTexel;
        void main(){
          float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
          float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
          float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
          float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
          gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
        }`,
        { uVelocity: { value: null }, uTexel: { value: new THREE.Vector2() } },
    );

    const vortMat = prog(
        `
        uniform sampler2D uVelocity; uniform sampler2D uCurl;
        uniform vec2 uTexel; uniform float uCurlStrength; uniform float uDt;
        void main(){
          float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
          float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
          float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
          float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
          float C = texture2D(uCurl, vUv).x;
          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 1e-4;
          force *= uCurlStrength * C;
          force.y *= -1.0;
          vec2 vel = texture2D(uVelocity, vUv).xy;
          // Confinement is the one term that ADDS energy, and above a
          // certain speed it adds more than dissipation removes — the field
          // then feeds itself into a page-wide jet that ignores the pointer
          // (drift growing with zero input, caught by the fluid log). Fade
          // the force out as speed rises: full curl at stroke speeds
          // (~100–450), a quarter of it up where the runaway used to live,
          // so decay always wins before the blow-up regime.
          force *= 1.0 / (1.0 + dot(vel, vel) / (450.0 * 450.0));
          vel += force * uDt;
          gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
        }`,
        {
            uVelocity: { value: null },
            uCurl: { value: null },
            uTexel: { value: new THREE.Vector2() },
            uCurlStrength: { value: 22 },
            uDt: { value: 0.016 },
        },
    );

    const divMat = prog(
        `
        uniform sampler2D uVelocity; uniform vec2 uTexel;
        void main(){
          float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
          float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
          float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
          float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
          gl_FragColor = vec4(0.5 * ((R - L) + (T - B)), 0.0, 0.0, 1.0);
        }`,
        { uVelocity: { value: null }, uTexel: { value: new THREE.Vector2() } },
    );

    const clearMat = prog(
        `
        uniform sampler2D uTexture; uniform float uValue;
        void main(){ gl_FragColor = uValue * texture2D(uTexture, vUv); }`,
        { uTexture: { value: null }, uValue: { value: 0.82 } },
    );

    const pressureMat = prog(
        `
        uniform sampler2D uPressure; uniform sampler2D uDivergence; uniform vec2 uTexel;
        void main(){
          float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
          float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
          float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
          float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
          float div = texture2D(uDivergence, vUv).x;
          gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
        }`,
        {
            uPressure: { value: null },
            uDivergence: { value: null },
            uTexel: { value: new THREE.Vector2() },
        },
    );

    const gradMat = prog(
        `
        uniform sampler2D uPressure; uniform sampler2D uVelocity; uniform vec2 uTexel;
        void main(){
          float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
          float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
          float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
          float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
          vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B) * 0.5;
          gl_FragColor = vec4(vel, 0.0, 1.0);
        }`,
        {
            uPressure: { value: null },
            uVelocity: { value: null },
            uTexel: { value: new THREE.Vector2() },
        },
    );

    const displayMat = prog(
        `
        uniform sampler2D uDye; uniform sampler2D uVelocity; uniform vec3 uInk; uniform vec2 uTexel;
        void main(){
          vec3 dye = texture2D(uDye, vUv).rgb;
          float dens = clamp(dye.r, 0.0, 1.0);
          float lx = texture2D(uDye, vUv - vec2(uTexel.x, 0.0)).r;
          float ly = texture2D(uDye, vUv - vec2(0.0, uTexel.y)).r;
          float edge = clamp((abs(dens - lx) + abs(dens - ly)) * 5.0, 0.0, 1.0);
          vec3 paper = vec3(1.0);
          vec3 col = mix(paper, uInk, dens * 0.5);
          col = mix(col, uInk * 0.94, edge * 0.16);
          float v = length(texture2D(uVelocity, vUv).xy);
          col -= clamp(v * 0.006, 0.0, 0.022);
          gl_FragColor = vec4(col, 1.0);
        }`,
        {
            uDye: { value: null },
            uVelocity: { value: null },
            uInk: { value: new THREE.Color(opts.tint ?? "#d9d3c6") },
            uTexel: { value: new THREE.Vector2() },
        },
    );

    // ------------------------------------------------------------------ //
    // Dev-only diagnostics, switched from the Astro toolbar ("Log the
    // fluid" in src/devtools/settings.ts). Everything below the flag is
    // behind `import.meta.env.DEV`, so a production build carries none of
    // it. One line per event (splat, wipe, rebuild, dropped teleport) and,
    // once a second, a reading of the velocity field itself — mean drift
    // vector, peak speed, NaN count — taken through an 8-bit probe pass
    // because half-float readback is driver lottery.
    const DEBUG =
        import.meta.env.DEV && localStorage.getItem("portfolio:dev:fluid-log") === "1";

    /** Packs velocity into bytes: xy → [0,1] over ±1500, blue flags NaN. */
    const probeMat = DEBUG
        ? prog(
              `
        uniform sampler2D uVelocity;
        void main(){
          vec2 v = texture2D(uVelocity, vUv).xy;
          float bad = (v.x != v.x || v.y != v.y) ? 1.0 : 0.0;
          vec2 n = clamp(v / 1500.0, -1.0, 1.0) * 0.5 + 0.5;
          gl_FragColor = vec4(n, bad, 1.0);
        }`,
              { uVelocity: { value: null } },
          )
        : null;

    const t0 = performance.now();
    const dlog = (msg: string) =>
        console.log(
            `%c[fluid ${((performance.now() - t0) / 1000).toFixed(1).padStart(6, " ")}s]%c ${msg}`,
            "color:#96703c;font-weight:600",
            "",
        );
    const stats = { frames: 0, dtMax: 0, ptr: 0, ptrMax: 0, auto: 0, drops: 0 };

    const rt = (w: number, h: number) =>
        new THREE.WebGLRenderTarget(w, h, {
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            depthBuffer: false,
            stencilBuffer: false,
        });

    type Double = {
        a: THREE.WebGLRenderTarget;
        b: THREE.WebGLRenderTarget;
        readonly read: THREE.WebGLRenderTarget;
        readonly write: THREE.WebGLRenderTarget;
        swap(): void;
    };
    const dbl = (w: number, h: number): Double => ({
        a: rt(w, h),
        b: rt(w, h),
        get read() {
            return this.a;
        },
        get write() {
            return this.b;
        },
        swap() {
            const t = this.a;
            this.a = this.b;
            this.b = t;
        },
    });

    let velocity: Double, dye: Double, pressure: Double;
    let divergence: THREE.WebGLRenderTarget, curl: THREE.WebGLRenderTarget;
    let probe: THREE.WebGLRenderTarget | null = null;
    let probeBuf: Uint8Array;
    const simTexel = new THREE.Vector2();
    const dyeTexel = new THREE.Vector2();
    let aspect = 1;

    const build = () => {
        const r = canvas.getBoundingClientRect();
        if (!r.width) return;
        renderer.setSize(r.width, r.height, false);
        aspect = r.width / r.height;
        const res = (n: number): [number, number] =>
            aspect > 1 ? [Math.round(n * aspect), n] : [n, Math.round(n / aspect)];
        const [sw, sh] = res(140);
        const [dw, dh] = res(420);
        for (const d of [velocity, dye, pressure]) {
            if (d) {
                d.a.dispose();
                d.b.dispose();
            }
        }
        divergence?.dispose();
        curl?.dispose();
        velocity = dbl(sw, sh);
        dye = dbl(dw, dh);
        pressure = dbl(sw, sh);
        divergence = rt(sw, sh);
        curl = rt(sw, sh);
        simTexel.set(1 / sw, 1 / sh);
        dyeTexel.set(1 / dw, 1 / dh);
        if (DEBUG) {
            probe?.dispose();
            // Plain 8-bit target the probe pass packs velocity into.
            probe = new THREE.WebGLRenderTarget(sw, sh, {
                depthBuffer: false,
                stencilBuffer: false,
            });
            probeBuf = new Uint8Array(sw * sh * 4);
            dlog(`build ${r.width}×${r.height} → sim ${sw}×${sh}, dye ${dw}×${dh} (fields wiped)`);
        }
    };
    build();

    type Splat = { x: number; y: number; dx: number; dy: number };
    const splats: Splat[] = [];
    let px: number | null = null;
    let py: number | null = null;

    const onPointer = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = 1 - (e.clientY - r.top) / r.height;
        // Nothing is stepping while the work stage covers the page. Recording
        // splats anyway would queue up every move made behind the black and
        // fire them all in a single frame on the way back — a surge that
        // reads as the ink collapsing rather than following the pointer.
        if (px !== null && py !== null && !paused()) {
            // A fifth of the screen between two move events isn't a movement,
            // it's a re-entry: the pointer left for the browser's own chrome,
            // another window or another monitor, and `px` is wherever it was
            // last seen. Scaled up and splatted, that phantom stroke is a jet
            // strong enough to shove the whole field one way for seconds —
            // the ink "stops following the mouse". Real motion between two
            // events is an order of magnitude below this, so nothing genuine
            // is ever discarded; the event still re-anchors below.
            if (Math.hypot(x - px, y - py) < 0.2) {
                const dx = (x - px) * 5200;
                const dy = (y - py) * 5200;
                splats.push({ x, y, dx, dy });
                if (DEBUG) {
                    stats.ptr += 1;
                    stats.ptrMax = Math.max(stats.ptrMax, Math.hypot(dx, dy));
                }
            } else if (DEBUG) {
                stats.drops += 1;
                dlog(
                    `DROP teleport Δ=(${(x - px).toFixed(2)}, ${(y - py).toFixed(2)}) → re-anchor at (${x.toFixed(2)}, ${y.toFixed(2)})`,
                );
            }
        }
        px = x;
        py = y;
    };

    // Losing the pointer (or the whole window) drops the anchor entirely, so
    // coming back always starts a fresh stroke instead of continuing a stale
    // one. The distance guard above stays as the backstop for the cases that
    // fire no leave event — dev tools, some browser chrome.
    const onLeave = () => {
        if (DEBUG && px !== null) dlog("anchor reset (pointer left / window blurred)");
        px = py = null;
    };

    addEventListener("resize", build);
    addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    addEventListener("blur", onLeave);

    const doSplat = (sp: Splat) => {
        splatMat.uniforms.uAspect.value = aspect;
        (splatMat.uniforms.uPoint.value as THREE.Vector2).set(sp.x, sp.y);
        splatMat.uniforms.uRadius.value = 0.0006 / (aspect > 1 ? 1 : aspect);
        splatMat.uniforms.uTarget.value = velocity.read.texture;
        (splatMat.uniforms.uColor.value as THREE.Vector3).set(
            sp.dx * strength,
            sp.dy * strength,
            0,
        );
        blit(splatMat, velocity.write);
        velocity.swap();

        splatMat.uniforms.uTarget.value = dye.read.texture;
        const amt = Math.min(0.6, (Math.hypot(sp.dx, sp.dy) / 2600) * strength + 0.07);
        (splatMat.uniforms.uColor.value as THREE.Vector3).set(amt, amt, amt);
        blit(splatMat, dye.write);
        dye.swap();
    };

    /** Zeroes both halves of a ping-pong pair. */
    const wipe = (d: Double) => {
        clearMat.uniforms.uValue.value = 0;
        for (let i = 0; i < 2; i++) {
            clearMat.uniforms.uTexture.value = d.read.texture;
            blit(clearMat, d.write);
            d.swap();
        }
        clearMat.uniforms.uValue.value = 0.82; // the pressure pass reads this
    };

    let nextAuto = performance.now() + 900;
    let last = performance.now();
    let raf = 0;
    let stopped = false;
    let wasPaused = false;
    let nextLog = performance.now() + 1000;

    /**
     * Renders the probe pass and reads it back, then prints the second's
     * summary: what went in (splats) next to what the field is doing (mean
     * drift vector, peak speed, NaN pixels). A drift that grows while the
     * splat columns stay quiet is the sim misbehaving on its own; a drift
     * that follows a logged splat is an input problem.
     */
    const logSecond = () => {
        if (!probeMat || !probe) return;
        probeMat.uniforms.uVelocity.value = velocity.read.texture;
        blit(probeMat, probe);
        const { width: w, height: h } = probe;
        renderer.readRenderTargetPixels(probe, 0, 0, w, h, probeBuf);
        let sx = 0;
        let sy = 0;
        let peak = 0;
        let nan = 0;
        const n = w * h;
        for (let i = 0; i < n; i++) {
            const vx = (probeBuf[i * 4] / 255 - 0.5) * 3000;
            const vy = (probeBuf[i * 4 + 1] / 255 - 0.5) * 3000;
            if (probeBuf[i * 4 + 2] > 0) nan += 1;
            sx += vx;
            sy += vy;
            const m = Math.abs(vx) + Math.abs(vy);
            if (m > peak) peak = m;
        }
        const fmt = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(0);
        dlog(
            `${String(stats.frames).padStart(3)}f dt≤${Math.round(stats.dtMax * 1000)}ms | ` +
                `ptr ${String(stats.ptr).padStart(3)} splats ≤${Math.round(stats.ptrMax)} | ` +
                `auto ${stats.auto} | drops ${stats.drops} | ` +
                `field μ=(${fmt(sx / n)}, ${fmt(sy / n)}) peak ${peak >= 2990 ? "≥3000" : Math.round(peak)} NaN ${nan}` +
                (nan ? " ⚠ FIELD CORRUPT" : ""),
        );
        stats.frames = stats.dtMax = stats.ptr = stats.ptrMax = stats.auto = stats.drops = 0;
    };

    const tick = () => {
        if (stopped) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const rawDt = (now - last) / 1000;
        const dt = Math.min(0.017, rawDt);
        last = now;
        if (!velocity) return;
        if (DEBUG) {
            stats.frames += 1;
            // The real gap, not the clamped one — a stall shows here.
            stats.dtMax = Math.max(stats.dtMax, rawDt);
        }

        if (paused()) {
            wasPaused = true;
            return;
        }

        // Coming back out from behind the work stage, the velocity and dye
        // fields are exactly as they were left however long ago — resuming on
        // top of them replays that old motion as if it were happening now.
        // Start from clean paper instead. The iris is still ~98% closed at
        // this point, so there is nothing on screen to see it happen.
        if (wasPaused) {
            wasPaused = false;
            splats.length = 0;
            px = py = null; // the next move starts a fresh delta
            nextAuto = now + 1400;
            wipe(velocity);
            wipe(dye);
            wipe(pressure);
            if (DEBUG) dlog("resume from pause → fields wiped, anchor reset");
        }

        // A page nobody is touching still moves — an occasional nudge from a
        // random direction keeps the paper alive.
        if (now > nextAuto) {
            nextAuto = now + 2200 + Math.random() * 2600;
            const ang = Math.random() * Math.PI * 2;
            const auto = {
                x: 0.15 + Math.random() * 0.7,
                y: 0.15 + Math.random() * 0.7,
                dx: Math.cos(ang) * 620,
                dy: Math.sin(ang) * 620,
            };
            splats.push(auto);
            if (DEBUG) {
                stats.auto += 1;
                dlog(
                    `auto nudge at (${auto.x.toFixed(2)}, ${auto.y.toFixed(2)}) dir ${Math.round((ang * 180) / Math.PI)}°`,
                );
            }
        }
        while (splats.length) doSplat(splats.shift()!);

        curlMat.uniforms.uVelocity.value = velocity.read.texture;
        (curlMat.uniforms.uTexel.value as THREE.Vector2).copy(simTexel);
        blit(curlMat, curl);

        vortMat.uniforms.uVelocity.value = velocity.read.texture;
        vortMat.uniforms.uCurl.value = curl.texture;
        (vortMat.uniforms.uTexel.value as THREE.Vector2).copy(simTexel);
        vortMat.uniforms.uDt.value = dt;
        blit(vortMat, velocity.write);
        velocity.swap();

        divMat.uniforms.uVelocity.value = velocity.read.texture;
        (divMat.uniforms.uTexel.value as THREE.Vector2).copy(simTexel);
        blit(divMat, divergence);

        clearMat.uniforms.uTexture.value = pressure.read.texture;
        blit(clearMat, pressure.write);
        pressure.swap();

        pressureMat.uniforms.uDivergence.value = divergence.texture;
        (pressureMat.uniforms.uTexel.value as THREE.Vector2).copy(simTexel);
        for (let i = 0; i < 18; i++) {
            pressureMat.uniforms.uPressure.value = pressure.read.texture;
            blit(pressureMat, pressure.write);
            pressure.swap();
        }

        gradMat.uniforms.uPressure.value = pressure.read.texture;
        gradMat.uniforms.uVelocity.value = velocity.read.texture;
        (gradMat.uniforms.uTexel.value as THREE.Vector2).copy(simTexel);
        blit(gradMat, velocity.write);
        velocity.swap();

        (advectMat.uniforms.uTexel.value as THREE.Vector2).copy(simTexel);
        advectMat.uniforms.uDt.value = dt;
        advectMat.uniforms.uVelocity.value = velocity.read.texture;
        advectMat.uniforms.uSource.value = velocity.read.texture;
        advectMat.uniforms.uDissipation.value = 1 - 0.22 * dt;
        blit(advectMat, velocity.write);
        velocity.swap();

        advectMat.uniforms.uVelocity.value = velocity.read.texture;
        advectMat.uniforms.uSource.value = dye.read.texture;
        (advectMat.uniforms.uTexel.value as THREE.Vector2).copy(dyeTexel);
        advectMat.uniforms.uDissipation.value = 1 - 0.62 * dt;
        blit(advectMat, dye.write);
        dye.swap();

        displayMat.uniforms.uDye.value = dye.read.texture;
        displayMat.uniforms.uVelocity.value = velocity.read.texture;
        (displayMat.uniforms.uTexel.value as THREE.Vector2).copy(dyeTexel);
        blit(displayMat, null);

        if (DEBUG && now > nextLog) {
            nextLog = now + 1000;
            logSecond();
        }
    };
    if (DEBUG) {
        dlog(
            "diagnostics on (toolbar → Portfolio → Log the fluid). " +
                "Per second: frames, worst frame gap, pointer splats (count, strongest), " +
                "auto nudges, dropped teleports, field mean drift / peak speed / NaN pixels.",
        );
    }
    tick();

    return () => {
        stopped = true;
        cancelAnimationFrame(raf);
        removeEventListener("resize", build);
        removeEventListener("pointermove", onPointer);
        document.removeEventListener("pointerleave", onLeave);
        removeEventListener("blur", onLeave);
        for (const d of [velocity, dye, pressure]) {
            if (d) {
                d.a.dispose();
                d.b.dispose();
            }
        }
        divergence?.dispose();
        curl?.dispose();
        probe?.dispose();
        renderer.dispose();
    };
}
