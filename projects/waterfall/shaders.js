/* ============================================================
   Waterfall — GLSL library
   Every shader here is hand-written. No textures, no models:
   the whole gorge is noise, light, and time.
   ============================================================ */

/* Ashima / Ian McEwan 3D simplex noise. Public domain (MIT). */
export const NOISE_GLSL = /* glsl */`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += a * snoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v;
}

/* Exponential-squared fog, same curve as THREE.FogExp2 */
vec3 applyFog(vec3 col, vec3 fogColor, float density, float dist) {
  float f = 1.0 - exp(-density * density * dist * dist);
  return mix(col, fogColor, clamp(f, 0.0, 1.0));
}
`;

/* ------------------------------------------------------------
   The water sheet. A bent plane: the top curls back over the
   lip, the body stretches as it accelerates, the bottom frays
   into ropes and dissolves into the impact mist.
   ------------------------------------------------------------ */
export const WATER_VERT = /* glsl */`
uniform float uTime;
uniform float uHeight;     // plane height (world units)
uniform float uBendAt;     // uv.y where the sheet starts bending over the brink
uniform float uRadius;     // bend radius
varying vec2 vUv;
varying vec3 vWorld;
varying float vLipShade;

void main() {
  vUv = uv;
  vec3 p = position;
  // The sheet spreads as it falls: narrow at the crest, wide at the base.
  p.x *= 0.78 + 0.22 * pow(1.0 - uv.y, 0.7);
  float t = smoothstep(uBendAt - 0.1, uBendAt + 0.08, uv.y);
  if (uv.y > uBendAt) {
    // Bend the top of the sheet over the brink: a quarter-cylinder, then
    // flat back into the rock (where it is hidden).
    float s = (uv.y - uBendAt) * uHeight;           // arc length past the bend
    float phi = min(s / uRadius, 1.5707963);
    float rest = max(s - uRadius * 1.5707963, 0.0);
    float yk = (uBendAt - 0.5) * uHeight;
    p.y = yk + uRadius * sin(phi);
    p.z = -uRadius * (1.0 - cos(phi)) - rest;
  }
  // The crest is never a straight line.
  p.y += (sin(uv.x * 17.0 + 0.4) * 0.07 + sin(uv.x * 41.0 + 1.3) * 0.05 + sin(uv.x * 7.0) * 0.06) * t;
  // Breathing: the sheet bows outward a little as pulses of water pass.
  float pulse = sin(uv.y * 9.0 - uTime * 3.1) * 0.03 + sin(uv.y * 4.0 - uTime * 1.7) * 0.04;
  p.z += pulse * (1.0 - t) * smoothstep(0.0, 0.25, uv.y);
  vLipShade = t;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const WATER_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
uniform float uSpeed;
uniform float uWidthFray;   // 0..1: how ragged the side edges are
uniform float uOpacityTop;
uniform vec3  uDeep;        // translucent water colour
uniform vec3  uFoam;        // aerated foam colour (HDR > 1 blooms)
uniform vec3  uLightDir;
uniform vec3  uFogColor;
uniform float uFogDensity;
uniform vec3  uCamPos;
varying vec2 vUv;
varying vec3 vWorld;
varying float vLipShade;
${'${NOISE}'}

void main() {
  float f = 1.0 - vUv.y;                    // 0 at lip, 1 at the pool
  // Falling water accelerates: map f through a power so features stretch
  // the further they've fallen. Stronger stretch, faster scroll below.
  float fall = pow(f, 0.62);
  float flow = uTime * uSpeed;

  // --- body: three layers at different depths / speeds ---
  float body = fbm(vec3(vUv.x * 5.0, fall * 3.2 - flow * 1.0, 0.7));
  float mid  = fbm(vec3(vUv.x * 11.0 + 3.0, fall * 5.5 - flow * 1.55, 4.2));
  float fine = snoise(vec3(vUv.x * 42.0, fall * 9.0 - flow * 2.3, 9.1));
  float fine2 = snoise(vec3(vUv.x * 28.0 + 11.0, fall * 6.0 - flow * 1.9, 2.5));

  // --- long vertical streaks (thin bright ropes of water) ---
  float streak = smoothstep(0.25, 0.95, fine * 0.6 + fine2 * 0.4 + 0.15);
  streak = pow(streak, 2.2);

  // --- aeration: water whitens as it falls and as turbulence grows ---
  float turb = body * 0.55 + mid * 0.45;
  float foam = smoothstep(-0.15, 0.65, turb * 0.85 + f * 0.95 + 0.02);
  foam = max(foam, streak * smoothstep(0.05, 0.6, f));
  // The lip is glassy: dark, translucent, specular.
  foam *= 1.0 - vLipShade * 0.55;
  foam *= 0.45 + 0.55 * smoothstep(0.0, 0.4, f);   // the first drop is glassier

  // --- fake normals from the noise field for lighting ---
  float e = 0.012;
  float nx = fbm(vec3((vUv.x + e) * 5.0, fall * 3.2 - flow * 1.0, 0.7)) - body;
  float ny = fbm(vec3(vUv.x * 5.0, (fall + e) * 3.2 - flow * 1.0, 0.7)) - body;
  vec3 N = normalize(vec3(-nx * 18.0, -ny * 18.0, 1.0));
  vec3 L = normalize(uLightDir);
  float diff = max(dot(N, L), 0.0) * 0.55 + 0.45;
  vec3 V = normalize(uCamPos - vWorld);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 48.0);

  // --- sparkle: tiny sun-catching glints, more at the lip and mid-fall ---
  float glint = snoise(vec3(vUv.x * 90.0, fall * 40.0 - flow * 6.0, uTime * 0.4));
  glint = pow(smoothstep(0.72, 0.98, glint), 3.0) * (1.0 - f * 0.6);

  // --- colour ---
  vec3 lipCol = mix(uDeep * 0.75, vec3(0.78, 0.9, 0.92), diff * 0.7);   // glassy top, catches the sky
  vec3 fallCol = mix(uDeep * 0.9, uFoam, foam) * (0.35 + 0.65 * diff);
  vec3 col = mix(fallCol, lipCol, vLipShade);
  col += spec * (0.35 + foam * 0.65 + vLipShade * 0.8) * vec3(1.0, 0.98, 0.95);
  col += glint * vec3(1.4, 1.45, 1.5);

  // --- alpha: opaque foam, translucent glass, frayed edges, dissolve at base ---
  float edgeNoise = snoise(vec3(vUv.y * 3.0 - flow * 0.4, vUv.x * 2.0, 1.3)) * 0.5 + 0.5;
  float edgeW = mix(0.02, 0.16, uWidthFray) * (0.4 + edgeNoise) * (0.6 + f);
  float wobL = snoise(vec3(vUv.y * 6.0 - flow * 0.9, 0.3, 5.0)) * 0.07 * (0.4 + f);
  float wobR = snoise(vec3(vUv.y * 6.0 - flow * 0.9, 2.7, 8.0)) * 0.07 * (0.4 + f);
  float edge = smoothstep(0.0, edgeW, vUv.x + wobL) * smoothstep(0.0, edgeW, 1.0 - vUv.x + wobR);
  // Sheet breaks into separate ropes as it falls: a rising threshold on the body noise.
  float ropeThresh = mix(-0.9, 0.0, smoothstep(0.3, 1.0, f));
  float ropes = smoothstep(ropeThresh, ropeThresh + 0.35, turb + streak * 0.5);
  float alpha = mix(uOpacityTop, 1.0, foam) * edge * ropes;
  // Dissolve into the impact mist.
  alpha *= smoothstep(1.0, 0.86, f);
  // Lip stays readable even where foam is low.
  alpha = max(alpha, vLipShade * 0.9 * edge);

  float dist = length(uCamPos - vWorld);
  col = applyFog(col, uFogColor, uFogDensity, dist);
  gl_FragColor = vec4(col, alpha);
}
`;

/* ------------------------------------------------------------
   The pool. A planar reflection (THREE Reflector) with the
   mirror UVs perturbed by surface noise + rings from the impact,
   a fresnel blend into deep water, churned foam at the base,
   drifting foam streaks and a specular sun glint.
   ------------------------------------------------------------ */
export const POOL_VERT = /* glsl */`
uniform mat4 textureMatrix;
varying vec4 vMirror;
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vMirror = textureMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const POOL_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tDiffuse;
uniform vec3  color;
uniform float uTime;
uniform vec2  uImpact;      // xz of the main impact
uniform vec2  uImpact2;     // xz of the side fall impact
uniform vec3  uCamPos;
uniform vec3  uLightDir;
uniform vec3  uFogColor;
uniform float uFogDensity;
uniform float uReflect;     // 0..1 reflection strength
uniform vec4  uRipples[16]; // xy: world xz · z: birth time · w: strength
varying vec4 vMirror;
varying vec3 vWorld;
${'${NOISE}'}

void main() {
  vec2 p = vWorld.xz;
  float d  = length(p - uImpact);
  float d2 = length(p - uImpact2);

  // Surface: slow large swell + quick capillary ripples, both as gradients.
  float t = uTime;
  float swellA = snoise(vec3(p * 0.55, t * 0.22));
  float swellB = snoise(vec3(p * 0.55 + vec2(13.1, 7.7), t * 0.22));
  float capA = snoise(vec3(p * 2.6 + vec2(0.0, -t * 0.9), t * 0.9));
  float capB = snoise(vec3(p * 2.6 + vec2(5.0, 9.0 - t * 0.9), t * 0.9));
  // Expanding rings from the impacts, decaying with distance.
  float ring  = sin(d * 7.0 - t * 6.5) * exp(-d * 0.55) * smoothstep(0.0, 0.6, d);
  float ring2 = sin(d2 * 9.0 - t * 7.5) * exp(-d2 * 0.9) * smoothstep(0.0, 0.4, d2) * 0.6;
  // Agitation: everything near the fall is chaotic.
  float chaos = smoothstep(4.5, 0.5, d);
  vec2 slope = vec2(swellA, swellB) * 0.012
             + vec2(capA, capB) * (0.006 + chaos * 0.02)
             + normalize(p - uImpact + 1e-4) * (ring + ring2) * 0.02;

  // Rings the visitor makes: expanding wave packets from taps and wakes.
  float touch = 0.0;
  for (int i = 0; i < 16; i++) {
    vec4 rp = uRipples[i];
    float age = t - rp.z;
    if (rp.w < 0.001 || age < 0.0 || age > 3.5) continue;
    float rd = length(p - rp.xy);
    float band = rd - age * 1.5;
    float wave = sin(band * 8.0) * exp(-band * band * 5.0);
    float amp = rp.w * exp(-age * 1.3) * exp(-rd * 0.3);
    slope += normalize(p - rp.xy + 1e-4) * wave * amp * 0.05;
    touch += abs(wave) * amp;
  }

  // Perturbed planar reflection.
  vec4 m = vMirror;
  m.xy += slope * m.w * 1.4;
  vec3 refl = texture2DProj(tDiffuse, m).rgb;

  // Fresnel: looking straight down you see the dark pool, grazing you see the mirror.
  vec3 V = normalize(uCamPos - vWorld);
  vec3 N = normalize(vec3(-slope.x * 6.0, 1.0, -slope.y * 6.0));
  float fres = pow(1.0 - max(dot(V, N), 0.0), 2.6);
  fres = mix(0.18, 1.0, fres) * uReflect;

  // Deep water colour with a little sub-surface brightness near the fall.
  vec3 deep = color * (1.0 + chaos * 0.6);
  vec3 col = mix(deep, refl, fres);

  // Churned foam disc at the impact.
  float foamN = fbm(vec3(p * 1.7 + vec2(0.0, -t * 0.25), t * 0.55));
  float foam = smoothstep(2.8, 0.3, d) * smoothstep(-0.05, 0.55, foamN + (1.0 - d / 2.8) * 0.9);
  float foam2 = smoothstep(1.1, 0.1, d2) * smoothstep(0.0, 0.5, foamN + (1.0 - d2 / 1.1) * 0.8);
  foam = max(foam, foam2);
  // Foam streaks drifting away from the fall on the current.
  vec2 away = normalize(p - uImpact + 1e-4);
  float streak = fbm(vec3(p * 1.3 - away * t * 0.35, 3.3));
  streak = smoothstep(0.25, 0.7, streak) * smoothstep(7.0, 2.2, d) * 0.55;
  vec3 foamCol = vec3(1.05, 1.09, 1.12);
  col = mix(col, foamCol, clamp(foam * 0.95 + streak * 0.6, 0.0, 1.0));
  col += touch * vec3(0.10, 0.13, 0.15);   // a glisten where the visitor's rings run

  // Sun glint.
  vec3 L = normalize(uLightDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 160.0) * 1.6;
  col += spec * vec3(1.0, 0.97, 0.9) * (1.0 - foam * 0.5);

  float dist = length(uCamPos - vWorld);
  col = applyFog(col, uFogColor, uFogDensity, dist);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------------------------------
   Mist: soft point sprites born at the impact, rising and
   drifting on the wind, expanding and thinning as they go.
   Fully analytic (no per-frame CPU update).
   ------------------------------------------------------------ */
export const MIST_VERT = /* glsl */`
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;      // heightPx / (2 tan(fov/2))
uniform vec3  uOrigin;
uniform vec2  uSpread;     // x, z spread at birth
uniform float uRise;       // total rise height
uniform float uLife;       // seconds
uniform vec2  uWind;
attribute float aSeed;
attribute float aSize;
attribute vec3 aOffset;
varying float vAlpha;
varying float vSeed;
varying float vLit;
void main() {
  float life = fract(uTime / uLife + aSeed);       // 0..1
  vSeed = aSeed;
  float ease = 1.0 - pow(1.0 - life, 2.0);          // fast launch, slow finish
  vec3 p = uOrigin + aOffset * vec3(uSpread.x, 0.2, uSpread.y);
  p.y += ease * uRise * (0.6 + aSize * 0.4);
  // Drift: wind + turbulent wander keyed off the seed.
  p.x += uWind.x * life * 2.5 + sin(uTime * 0.7 + aSeed * 31.0) * 0.45 * life;
  p.z += uWind.y * life * 2.5 + cos(uTime * 0.55 + aSeed * 17.0) * 0.45 * life;
  // Spread outward from the impact as they rise.
  p.xz += normalize(aOffset.xz + 1e-3) * life * 1.8 * aSize;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float grow = 0.3 + life * 1.3;                // world-space diameter
  gl_PointSize = aSize * grow * uScale * uPixelRatio / max(-mv.z, 0.1);
  vAlpha = sin(life * 3.14159) * (0.09 - aSize * 0.03);
  vLit = 0.65 + 0.35 * aOffset.x;   // lit from the right/top
  gl_Position = projectionMatrix * mv;
}
`;

export const MIST_FRAG = /* glsl */`
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;
varying float vSeed;
varying float vLit;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q);
  // Very soft puff: gaussian-ish falloff, no visible rim.
  float a = exp(-r * r * 9.0) * smoothstep(0.5, 0.3, r);
  a *= vAlpha;
  gl_FragColor = vec4(uColor * vLit, a);
}
`;

/* ------------------------------------------------------------
   Spray: ballistic droplets kicked up at the impact.
   ------------------------------------------------------------ */
export const SPRAY_VERT = /* glsl */`
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform vec3  uOrigin;
uniform float uLife;
attribute float aSeed;
attribute vec3 aVel;
varying float vAlpha;
void main() {
  float life = fract(uTime / uLife + aSeed);
  float t = life * uLife;
  vec3 p = uOrigin + vec3((aSeed - 0.5) * 2.6, 0.0, (fract(aSeed * 7.31) - 0.5) * 1.4);
  p += aVel * t;
  p.y += -4.9 * t * t;                               // gravity
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.018 + fract(aSeed * 3.7) * 0.04) * uScale * uPixelRatio / max(-mv.z, 0.1);
  vAlpha = (1.0 - life) * step(0.0, p.y);          // vanish once back under the surface
  gl_Position = projectionMatrix * mv;
}
`;

export const SPRAY_FRAG = /* glsl */`
precision mediump float;
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, r) * vAlpha;
  gl_FragColor = vec4(vec3(1.2, 1.25, 1.3), a);
}
`;

/* ------------------------------------------------------------
   Mist banks: a handful of big camera-facing quads with
   evolving noise alpha. The "cloud at the base" look.
   ------------------------------------------------------------ */
export const BANK_VERT = /* glsl */`
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const BANK_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
uniform vec3  uColor;
uniform vec3  uFogColor;
uniform float uFogDensity;
uniform vec3  uCamPos;
varying vec2 vUv;
varying vec3 vWorld;
${'${NOISE}'}
void main() {
  vec2 q = vUv - 0.5;
  float shape = smoothstep(0.5, 0.12, length(q * vec2(1.0, 1.6)));
  float n = fbm(vec3(vUv * 2.6 + vec2(uSeed, -uTime * 0.09), uTime * 0.12 + uSeed));
  float a = shape * smoothstep(-0.25, 0.55, n + 0.1) * uOpacity;
  // brighter where the light comes from (upper right)
  float lit = 0.8 + 0.25 * (q.x + q.y);
  vec3 col = applyFog(uColor * lit, uFogColor, uFogDensity, length(uCamPos - vWorld));
  gl_FragColor = vec4(col, a);
}
`;

/* ------------------------------------------------------------
   Light shafts: thin additive planes from the top, softly
   breathing. Cheap volumetrics.
   ------------------------------------------------------------ */
export const SHAFT_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SHAFT_FRAG = /* glsl */`
precision mediump float;
uniform float uTime;
uniform float uSeed;
uniform float uStrength;
uniform vec3  uColor;
varying vec2 vUv;
void main() {
  float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
  across = pow(across, 1.6);
  float along = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
  float breathe = 0.75 + 0.25 * sin(uTime * 0.35 + uSeed * 6.0);
  float a = across * along * uStrength * breathe;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/* ------------------------------------------------------------
   Rainbow: a faint arc in the mist, only there when you look.
   ------------------------------------------------------------ */
export const RAINBOW_FRAG = /* glsl */`
precision mediump float;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
vec3 spectrum(float x) {
  // x 0..1 violet->red, soft, desaturated like a real bow
  vec3 c = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + x * 0.8 + 0.05));
  return c;
}
void main() {
  float band = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
  float ends = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
  float shimmer = 0.85 + 0.15 * sin(uTime * 0.8 + vUv.x * 9.0);
  vec3 col = spectrum(vUv.y);
  gl_FragColor = vec4(col, band * ends * uOpacity * shimmer);
}
`;

/* ------------------------------------------------------------
   Leaves: a thin drift of foliage let go from the canopy above
   the gorge. Each leaf flutters down on the wind, lands on the
   pool, and rides the current away from the falls. Analytic:
   the whole life of every leaf is a pure function of time.
   ------------------------------------------------------------ */
export const LEAF_VERT = /* glsl */`
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform vec2  uWind;
uniform float uLife;
attribute float aSeed;
varying float vFade;
varying float vSeed;
varying float vSpin;
void main() {
  float life = fract(uTime / uLife + aSeed);
  float t = life * uLife;
  float s1 = fract(aSeed * 7.13), s2 = fract(aSeed * 3.71), s3 = fract(aSeed * 13.77);
  // born high on the gorge sides, biased away from the sheets
  vec3 p0 = vec3(mix(-10.0, 11.0, s1), 8.5 + s2 * 4.0, mix(-0.5, 5.5, s3));
  float vFall = 0.5 + s2 * 0.35;
  float fallT = (p0.y - 0.02) / vFall;
  float tf = min(t, fallT);            // time spent in the air
  float dt = max(t - fallT, 0.0);      // time spent on the water
  vec3 p = p0;
  p.y = max(p0.y - vFall * t, 0.02);
  // flutter: a lazy helix, pushed by the wind
  p.xz += vec2(sin(tf * (1.2 + s1) + aSeed * 43.0) * 0.55,
               cos(tf * (0.9 + s2) + aSeed * 19.0) * 0.45)
        + uWind * tf * 0.5;
  // afloat: drift on the current away from the impact, bobbing
  vec2 away = normalize(p.xz - vec2(0.0, 0.9) + 1e-3);
  p.xz += (away * 0.25 + uWind * 0.4) * dt;
  if (dt > 0.0) p.y = 0.02 + sin(uTime * 1.7 + aSeed * 50.0) * 0.012;
  vSpin = tf * (1.5 + s3 * 3.5) + aSeed * 6.28;
  vSeed = aSeed;
  vFade = smoothstep(0.0, 0.04, life) * (1.0 - smoothstep(0.82, 1.0, life));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.09 + s3 * 0.05) * uScale * uPixelRatio / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
`;

export const LEAF_FRAG = /* glsl */`
precision mediump float;
varying float vFade;
varying float vSeed;
varying float vSpin;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float c = cos(vSpin), s = sin(vSpin);
  q = mat2(c, -s, s, c) * q;
  q.y *= mix(1.0, 3.2, abs(sin(vSpin * 0.7)));   // tumbling foreshortening
  float r = length(q * vec2(2.2, 3.6));
  float leaf = smoothstep(0.5, 0.38, r);
  if (leaf < 0.01) discard;
  vec3 olive = vec3(0.30, 0.36, 0.15);
  vec3 rust  = vec3(0.48, 0.30, 0.12);
  vec3 col = mix(olive, rust, fract(vSeed * 5.7));
  col *= 0.75 + 0.5 * (q.y + 0.5);               // lit from above
  col -= smoothstep(0.05, 0.0, abs(q.x)) * 0.06; // the midrib
  gl_FragColor = vec4(col, leaf * vFade);
}
`;

/* ------------------------------------------------------------
   Final grade: split-tone, vignette, grain. Runs after tone
   mapping so it behaves like a print, not a light.
   ------------------------------------------------------------ */
export const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: null },
    uGrain: { value: 0.035 },
    uVignette: { value: 0.85 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uGrain;
    uniform float uVignette;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      // shadows cool, highlights a touch warm
      c += (1.0 - l) * vec3(-0.012, 0.006, 0.022) + l * vec3(0.018, 0.008, -0.012);
      // vignette
      vec2 q = (vUv - 0.5) * vec2(1.0, 1.15);
      float v = 1.0 - dot(q, q) * uVignette;
      c *= smoothstep(0.0, 1.0, v) * 0.92 + 0.08;
      // grain (animated, fine)
      float g = hash(floor(vUv * uRes * 0.6) + fract(uTime) * 91.0);
      c += (g - 0.5) * uGrain * (1.0 - l * 0.6);
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function withNoise(src, octaves = 5) {
  return `#define OCTAVES ${octaves}\n` + src.replace('${NOISE}', NOISE_GLSL);
}
