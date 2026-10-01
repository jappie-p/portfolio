import * as THREE from "three";

const MAX_GLOWS = 6;

/** A full-screen quad at the far plane, outside the camera's culling. */
function screenQuad(material: THREE.Material, z: number, order: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  m.frustumCulled = false;
  m.renderOrder = order;
  m.userData.z = z;
  return m;
}

const QUAD_VERT = /* glsl */ `
uniform float uZ;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, uZ, 1.0);
}
`;

const VOID_FRAG = /* glsl */ `
#include <common>
uniform vec2 uSize;
uniform vec4 uGlow[${MAX_GLOWS}];
uniform vec3 uGlowColor[${MAX_GLOWS}];
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
varying vec2 vUv;
#include <dithering_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float d = clamp(vUv.x * 0.35 + (1.0 - vUv.y) * 0.65, 0.0, 1.0);
  vec3 col = d < 0.5 ? mix(uTop, uMid, d * 2.0) : mix(uMid, uBottom, d * 2.0 - 1.0);
  for (int i = 0; i < ${MAX_GLOWS}; i++) {
    vec4 g = uGlow[i];
    if (g.z <= 0.0) continue;
    float t = clamp(length(px - g.xy) / g.z, 0.0, 1.0);
    float f = (1.0 - t) * (1.0 - t);
    col += uGlowColor[i] * g.w * f * f;
  }
  // a velvet tooth, so the dark never looks like flat plastic
  col *= 1.0 + (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.16;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <dithering_fragment>
}
`;

/** The velvet dark the geode sits in, with the soft lights behind the
 *  frame and spilling off the walls. Opaque, so transmissive crystals
 *  refract it. */
export function voidQuad(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: VOID_FRAG,
    uniforms: {
      uZ: { value: 0.9999 },
      uSize: { value: new THREE.Vector2(1, 1) },
      uGlow: { value: Array.from({ length: MAX_GLOWS }, () => new THREE.Vector4()) },
      uGlowColor: { value: Array.from({ length: MAX_GLOWS }, () => new THREE.Color()) },
      uTop: { value: new THREE.Color("#07060d") },
      uMid: { value: new THREE.Color("#0b0814") },
      uBottom: { value: new THREE.Color("#07060c") },
    },
    depthWrite: false,
    toneMapped: false,
    dithering: true,
  });
  return screenQuad(material, 0.9999, -10);
}

export function setVoid(quad: THREE.Mesh, w: number, h: number, glows: { x: number; y: number; r: number; color: string; a: number }[]) {
  const u = (quad.material as THREE.ShaderMaterial).uniforms;
  u.uSize.value.set(w, h);
  for (let i = 0; i < MAX_GLOWS; i++) {
    const g = glows[i];
    (u.uGlow.value[i] as THREE.Vector4).set(g?.x ?? 0, g?.y ?? 0, g?.r ?? 0, g?.a ?? 0);
    (u.uGlowColor.value[i] as THREE.Color).set(g?.color ?? "#000000");
  }
}

const VEIL_FRAG = /* glsl */ `
uniform vec2 uSize;
uniform float uHeader;
uniform vec3 uPage;
varying vec2 vUv;
void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  // under the site header: near black past the logo and menu, then back in
  float head = 1.0 - smoothstep(uHeader * 0.5, uHeader, px.y);
  float top = max(head, 1.0 - px.y / (uSize.y * 0.07)) ;
  float bottom = 1.0 - (uSize.y - px.y) / (uSize.y * 0.07);
  float side = uSize.x * 0.05;
  float left = 1.0 - px.x / side;
  float right = 1.0 - (uSize.x - px.x) / side;
  float edge = 1.0 - (1.0 - 0.5 * clamp(bottom, 0.0, 1.0)) * (1.0 - 0.5 * clamp(left, 0.0, 1.0)) * (1.0 - 0.5 * clamp(right, 0.0, 1.0));
  float a = max(clamp(top, 0.0, 1.0) * 0.94, edge);
  gl_FragColor = vec4(uPage, a);
  #include <colorspace_fragment>
}
`;

/** Darkens toward the page at the edges and under the header, over
 *  everything, so the panel meets its neighbours in the same dark. */
export function veilQuad(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: VEIL_FRAG,
    uniforms: {
      uZ: { value: -0.9999 },
      uSize: { value: new THREE.Vector2(1, 1) },
      uHeader: { value: 60 },
      uPage: { value: new THREE.Color("#05080d") },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  return screenQuad(material, -0.9999, 1000);
}

export function setVeil(quad: THREE.Mesh, w: number, h: number, header: number) {
  const u = (quad.material as THREE.ShaderMaterial).uniforms;
  u.uSize.value.set(w, h);
  u.uHeader.value = header;
}

const GLINT_VERT = /* glsl */ `
uniform vec3 uKey;
uniform vec3 uStrip;
uniform float uTime;
uniform float uScale;
attribute vec3 aNormal;
attribute float aSize;
attribute float aSeed;
varying float vI;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * aNormal);
  vec3 v = normalize(cameraPosition - wp.xyz);
  vec3 r = reflect(-v, n);
  float s = pow(max(dot(r, uKey), 0.0), 10.0) + 0.8 * pow(max(dot(r, uStrip), 0.0), 14.0);
  float tw = 0.6 + 0.4 * sin(uTime * (1.1 + aSeed * 2.3) + aSeed * 37.0);
  // now and then a facet flashes on its own, the way loose sparkle does
  float flick = pow(max(sin(uTime * (0.35 + aSeed * 0.5) + aSeed * 61.0), 0.0), 60.0);
  vI = max(min(1.3, s * tw), flick * 0.9) * step(0.0, dot(n, v));
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = vI < 0.004 ? 0.0 : aSize * uScale / -mv.z * (0.3 + vI);
}
`;

const GLINT_FRAG = /* glsl */ `
varying float vI;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float core = exp(-dot(p, p) * 16.0);
  float fall = 1.0 - smoothstep(0.0, 1.0, length(p));
  float rays = (exp(-abs(p.x) * 30.0) + exp(-abs(p.y) * 30.0)) * fall;
  float diag = (exp(-abs(p.x - p.y) * 36.0) + exp(-abs(p.x + p.y) * 36.0)) * (1.0 - smoothstep(0.0, 0.55, length(p))) * 0.4;
  float a = (core + rays * 0.8 + diag) * vI;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(1.0, 0.96, 1.0), a);
}
`;

/** Star glints where facets turn toward the key light or the strip light:
 *  they flash and go as the crystals sway. Shared by every glint field. */
export function glintMaterial(key: THREE.Vector3, strip: THREE.Vector3): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: GLINT_VERT,
    fragmentShader: GLINT_FRAG,
    uniforms: {
      uKey: { value: key.clone().normalize() },
      uStrip: { value: strip.clone().normalize() },
      uTime: { value: 0 },
      uScale: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}
