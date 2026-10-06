import * as THREE from "three";
import { HEAD, LIGHT, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";
import { CAST_GLSL, caster, type Shades } from "../shadows";
import { EXPOSE, TURN } from "./glsl";
import type { Lamp } from "./voxels";

/** Seconds a piece takes from leaving the picture to fading away. */
const LIFE = 14;

const MOVE = /* glsl */ `
in vec3 position;
in vec2 uv;
// where it leaves the picture (x, y), its phase, and 1 for foil
in vec4 aFrom;
// its drift, metres a second (across, up, out of the picture), and its spin
in vec4 aWay;
// its colour and its size
in vec4 aTint;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uSpread;
uniform float uFace;
${TURN}
// each piece leaves the picture and drifts out and down for one life,
// fluttering and turning over, then starts again unseen: it fades in as it
// lifts off the picture and out before it starts over
vec3 confetto(out vec3 normal, out float alpha) {
  float life = fract(uTime / ${LIFE}.0 + aFrom.z);
  float t = life * ${LIFE}.0;
  float ph = aFrom.z * 6.2832;
  vec3 p = vec3(aFrom.xy, 0.004) + aWay.xyz * t;
  p.x += 0.012 * sin(t * (0.9 + aFrom.z) + ph);
  p.y += 0.006 * sin(t * (1.3 + aFrom.z) + ph * 2.0);
  p.z *= 1.0 + uSpread;
  mat3 r = turn(normalize(vec3(sin(ph * 5.0), cos(ph * 3.0), sin(ph * 7.0) + 0.3)), aWay.w * t + ph);
  alpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.72, 1.0, life));
  normal = mat3(modelMatrix) * (r * vec3(0.0, 0.0, 1.0));
  vec3 corner = r * vec3(position.x * aTint.w, position.y * aTint.w * 0.55, 0.0);
  return (modelMatrix * vec4(p + corner + vec3(0.0, 0.0, uFace), 1.0)).xyz;
}
`;

const VERT = /* glsl */ `${HEAD}
${MOVE}
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec4 vTint;
out float vAlpha;
out float vFoil;
void main() {
  vec3 n;
  float alpha;
  vec3 w = confetto(n, alpha);
  vWorld = w;
  vNormal = n;
  vUv = uv;
  vTint = aTint;
  vAlpha = alpha;
  vFoil = aFrom.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
in vec4 vTint;
in float vAlpha;
in float vFoil;
uniform vec3 cameraPosition;
uniform float uFade;
${OUT}
${LIGHT}
${EXPOSE}
void main() {
  // feathered over a pixel round its edge: seen edge on it thins away
  // rather than flicker
  vec2 edge = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-5));
  float a = clamp(min(edge.x, edge.y), 0.0, 1.0) * vAlpha * uFade;
  if (a < 0.004) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  n *= dot(n, V) < 0.0 ? -1.0 : 1.0;
  vec3 L;
  float light = reach(vWorld, L);
  // paper lets a little light through from its lit side; foil glints as it turns
  float side = max(dot(n, L), 0.0) + max(-dot(n, L), 0.0) * 0.3 * (1.0 - vFoil);
  float glint = pow(max(dot(reflect(-L, n), V), 0.0), mix(10.0, 40.0, vFoil)) * mix(0.15, 2.4, vFoil);
  vec3 base = vTint.rgb * mix(1.0, 0.45, vFoil);
  // the stage's own light still on them as they leave it, so their colour
  // reads out of the spot too
  vec3 col = base * (uAmbient * 4.0 + uLevel * (0.16 + 0.85 * light * side)) + mix(vec3(1.0, 0.96, 0.9), vTint.rgb, vFoil) * glint * light * uLevel;
  emit(col, a);
}
`;

const CAST_VERT = /* glsl */ `${HEAD}
${MOVE}
${LIGHT}
${CAST_GLSL}
uniform int uWork;
uniform float uFade;
void main() {
  vec3 n;
  float alpha;
  vec3 w = confetto(n, alpha);
  gl_Position = fromLamp(uWork, w, 0.45 * alpha * uFade);
}
`;

/** The stage's colours: magenta, violet, cyan, a hot pink, white, blue. */
const PAPER = ["#ff2fb4", "#9b4dff", "#39d8ff", "#ff5fd2", "#f6f2ff", "#5a6bff", "#d23cff"];
const FOIL = ["#e9b8ff", "#c8f2ff"];

/** Where the pieces leave the picture, how they drift and what they are:
 *  most from round the stage, drifting out and spreading a little, on the
 *  way to the right; four in ten from near its sides (most of them its
 *  right), caught in the stage's air: fast enough sideways to cross the
 *  frame and out over the wall, some carried up over its top. */
function pieces(count: number) {
  let seed = 4127;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const from: number[] = [];
  const way: number[] = [];
  const tint: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const edge = i % 10 < 4;
    const sx = rand() < 0.25 ? -1 : 1;
    const x = edge ? sx * (0.42 + 0.16 * rand()) : (rand() * 2 - 1) * 0.42;
    const y = edge ? -0.15 + 0.6 * rand() : 0.05 + 0.48 * rand();
    const foil = rand() < 0.25;
    c.set(foil ? FOIL[i % FOIL.length] : PAPER[i % PAPER.length]);
    from.push(x, y, (i * 0.6180339) % 1, foil ? 1 : 0);
    way.push(
      edge ? sx * (0.024 + 0.04 * rand()) : (x / 0.42) * (0.004 + 0.01 * rand()) + 0.004 + 0.008 * rand(),
      edge && sx > 0 ? -0.006 + 0.026 * rand() : -0.012 + 0.016 * rand(),
      0.012 + 0.016 * rand(),
      (1.2 + 2 * rand()) * (rand() < 0.5 ? -1 : 1),
    );
    tint.push(c.r, c.g, c.b, 0.034 + 0.02 * rand());
  }
  return { from, way, tint };
}

/** Confetti flying out of a picture, every piece in one instanced draw, lit
 *  by the print's spot; and again as the spot sees it, for faint shadows. */
export function makeConfetti(shared: Shared, lamp: Lamp, shades: Shades["uniforms"], count: number, face: number) {
  const { from, way, tint } = pieces(count);
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(quad.getIndex());
  geometry.setAttribute("position", quad.getAttribute("position"));
  geometry.setAttribute("uv", quad.getAttribute("uv"));
  geometry.setAttribute("aFrom", new THREE.InstancedBufferAttribute(new Float32Array(from), 4));
  geometry.setAttribute("aWay", new THREE.InstancedBufferAttribute(new Float32Array(way), 4));
  geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(new Float32Array(tint), 4));
  geometry.instanceCount = count;
  const motion = { uSpread: { value: 0 }, uFade: { value: 1 }, uFace: { value: face } };
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, ...motion, uSpot: lamp.uSpot, uLevel: lamp.uLevel, uNorm: lamp.uNorm },
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  mesh.renderOrder = 1;
  const shadow = caster(geometry, CAST_VERT, { ...shared, ...shades, ...motion, uWork: { value: lamp.uSpot.value - 1 } });
  return { mesh, shadow, spread: motion.uSpread, fade: motion.uFade };
}
