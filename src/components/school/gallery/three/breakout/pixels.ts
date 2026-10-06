import * as THREE from "three";
import { HEAD, LIGHT, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";

/** A lone pixel in the room: where (m, in its set's space), its size and
 *  colour, how brightly it glows (0: not at all, just lit), how far it
 *  wanders (0: it stays put, a firefly drifts and goes with the picture),
 *  and how wide its halo is, in sizes (9 if not given). */
export type Pixel = { at: readonly [number, number, number]; size: number; color: string; glow: number; drift: number; halo?: number };

const MOVE = /* glsl */ `
in vec3 position;
in vec4 aAt;
in vec4 aTint;
in vec4 aMove;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uFade;
uniform float uLevel;
// where this pixel is now: a firefly loops slowly through the air round
// where it was put, the others stay where they are
vec3 here() {
  float ph = aMove.y * 6.2832;
  float t = uTime * (0.25 + 0.2 * aMove.y);
  vec3 wander = aMove.x * vec3(sin(t + ph), sin(t * 1.3 + ph * 2.1) * 0.6, sin(t * 0.7 + ph * 3.7));
  return aAt.xyz + wander;
}
// its glow pulses a little, and comes and goes with its work's light; a
// wanderer goes as the project takes over
float pulse() {
  return (0.75 + 0.25 * sin(uTime * (1.4 + aMove.y) + aMove.y * 40.0)) * uLevel;
}
float fade() {
  return aMove.x > 0.0 ? uFade : 1.0;
}
`;

const CUBE_VERT = /* glsl */ `${HEAD}
${MOVE}
in vec3 normal;
out vec3 vWorld;
out vec3 vNormal;
out vec4 vTint;
out float vPulse;
out float vFade;
void main() {
  vec4 w = modelMatrix * vec4(here() + position * aAt.w, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vTint = aTint;
  vPulse = pulse();
  vFade = fade();
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const CUBE_FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec4 vTint;
in float vPulse;
in float vFade;
${OUT}
${LIGHT}
void main() {
  if (vFade < 0.004) discard;
  vec3 n = normalize(vNormal);
  vec3 light = uAmbient * 3.0 + glows(vWorld, n);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    light += spot(i, vWorld, L) * max(dot(n, L), 0.0);
  }
  vec3 col = vTint.rgb * light + vTint.rgb * vTint.a * vPulse;
  emit(col, vFade);
}
`;

const HALO_VERT = /* glsl */ `${HEAD}
${MOVE}
in vec2 uv;
out vec2 vUv;
out vec3 vGlow;
void main() {
  // a soft card round the glowing pixel, always facing the eye
  vec4 mv = viewMatrix * modelMatrix * vec4(here(), 1.0);
  mv.xy += position.xy * aAt.w * aMove.z;
  vUv = uv;
  vGlow = aTint.rgb * aTint.a * pulse() * fade();
  gl_Position = projectionMatrix * mv;
}
`;

const HALO_FRAG = /* glsl */ `${HEAD}
in vec2 vUv;
in vec3 vGlow;
${OUT}
void main() {
  float d = length(vUv - 0.5) * 2.0;
  glow(vGlow * (exp(-d * d * 7.0) * 0.12 + exp(-d * d * 40.0) * 0.22) * smoothstep(1.0, 0.7, d));
}
`;

function attributes(g: THREE.InstancedBufferGeometry, pixels: Pixel[]) {
  const at: number[] = [];
  const tint: number[] = [];
  const move: number[] = [];
  const c = new THREE.Color();
  pixels.forEach((p, i) => {
    c.set(p.color);
    at.push(...p.at, p.size);
    tint.push(c.r, c.g, c.b, p.glow);
    move.push(p.drift, (i * 0.618034) % 1, p.halo ?? 9, 0);
  });
  g.setAttribute("aAt", new THREE.InstancedBufferAttribute(new Float32Array(at), 4));
  g.setAttribute("aTint", new THREE.InstancedBufferAttribute(new Float32Array(tint), 4));
  g.setAttribute("aMove", new THREE.InstancedBufferAttribute(new Float32Array(move), 4));
  g.instanceCount = pixels.length;
}

/** Lone pixels as cubes: flowers on the grass, lit like the blocks; glowing
 *  ones that light themselves and wear a soft halo; fireflies that wander.
 *  Every cube in one draw, every halo in one more. `level`: the light of
 *  the work they belong to, which their glow follows. */
export function makePixels(shared: Shared, pixels: Pixel[], level: { value: number }) {
  const fade = { value: 1 };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cubes = new THREE.InstancedBufferGeometry();
  cubes.setIndex(box.getIndex());
  cubes.setAttribute("position", box.getAttribute("position"));
  cubes.setAttribute("normal", box.getAttribute("normal"));
  attributes(cubes, pixels);
  const mesh = new THREE.Mesh(
    cubes,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: CUBE_VERT,
      fragmentShader: CUBE_FRAG,
      uniforms: { ...shared, uFade: fade, uLevel: level },
      transparent: true,
    }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  mesh.renderOrder = 1;

  const lit = pixels.filter((p) => p.glow > 0 && (p.halo ?? 9) > 0);
  const card = new THREE.PlaneGeometry(1, 1);
  const halos = new THREE.InstancedBufferGeometry();
  halos.setIndex(card.getIndex());
  halos.setAttribute("position", card.getAttribute("position"));
  halos.setAttribute("uv", card.getAttribute("uv"));
  attributes(halos, lit);
  const glow = new THREE.Mesh(
    halos,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      uniforms: { ...shared, uFade: fade, uLevel: level },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.frustumCulled = false;
  glow.layers.enable(MIRRORED);
  glow.renderOrder = 3;
  return { mesh, glow, fade };
}
