import * as THREE from "three";
import { HEAD, OUT } from "../glsl";
import type { Shared } from "../lights";

const VERT = /* glsl */ `${HEAD}
// x along the ray 0..1, y across it -1..1
in vec3 position;
// where it leaves the lamp (x, y), its heading and its length
in vec4 aRay;
// its colour, and a phase so the two never move together
in vec4 aTint;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uFace;
uniform float uReach;
out vec2 vAt;
out vec4 vTint;
void main() {
  // a moving head sweeping slowly to and fro, narrow at the lamp and
  // opening out as it goes
  float a = aRay.z + 0.04 * sin(uTime * 0.23 + aTint.w * 6.2832);
  vec2 dir = vec2(cos(a), sin(a));
  vec2 side = vec2(-dir.y, dir.x);
  vec2 p = aRay.xy + dir * position.x * aRay.w * uReach + side * position.y * mix(0.008, 0.05, position.x);
  vAt = position.xy;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, uFace, 1.0);
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec2 vAt;
in vec4 vTint;
uniform float uTime;
uniform float uLevel;
uniform float uFade;
${OUT}
void main() {
  // a beam's crisp edge with a brighter core; taking over from the beam
  // painted in the picture near its edge and fading out over the wall;
  // breathing a little, like a lamp on a slow chase
  float y = abs(vAt.y);
  float across = smoothstep(1.0, 0.45, y) * (0.65 + 0.35 * exp(-y * y * 5.0));
  float along = smoothstep(0.12, 0.3, vAt.x) * (1.0 - smoothstep(0.55, 1.0, vAt.x));
  float pulse = 0.8 + 0.2 * sin(uTime * 0.9 + vTint.w * 6.2832);
  glow(vTint.rgb * across * along * pulse * uLevel * uFade);
}
`;

/** A ray of the stage's light: where it leaves its lamp in the picture
 *  (metres from the picture's centre), its heading, its length, its colour
 *  (linear, as bright as it gets) and a phase. */
export type Ray = { from: [number, number]; heading: number; length: number; color: [number, number, number]; phase: number };

const STEPS = 8;

/** Stage light spilling out of a picture: each ray a soft strip of added
 *  light, lying just in front of the frame, so it crosses the frame's edge
 *  and runs out over the wall. One draw for all of them. */
export function makeRays(shared: Shared, level: { value: number }, rays: Ray[], face: number) {
  const pos: number[] = [];
  const ray: number[] = [];
  const tint: number[] = [];
  const index: number[] = [];
  rays.forEach((r, i) => {
    const base = i * (STEPS + 1) * 2;
    for (let k = 0; k <= STEPS; k++) {
      for (const y of [-1, 1]) {
        pos.push(k / STEPS, y, 0);
        ray.push(r.from[0], r.from[1], r.heading, r.length);
        tint.push(...r.color, r.phase);
      }
      const a = base + k * 2;
      if (k < STEPS) index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("aRay", new THREE.Float32BufferAttribute(ray, 4));
  geometry.setAttribute("aTint", new THREE.Float32BufferAttribute(tint, 4));
  const uniforms = { uFade: { value: 1 }, uReach: { value: 1 } };
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, ...uniforms, uLevel: level, uFace: { value: face } },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return { mesh, ...uniforms };
}
