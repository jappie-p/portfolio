import * as THREE from "three";
import { HEAD, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";

const VERT = /* glsl */ `${HEAD}
// x along the stream 0..1, y across it -1..1
in vec3 position;
// its curve: four control points (metres from the picture's centre, z out of its face)
in vec3 aP0;
in vec3 aP1;
in vec3 aP2;
in vec3 aP3;
// its colour (linear, as bright as it gets) and a phase
in vec4 aTint;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform float uTime;
uniform float uReach;
uniform float uWidth;
out vec2 vAt;
out vec4 vTint;
vec3 curve(float s) {
  float r = 1.0 - s;
  vec3 p = r * r * r * aP0 + 3.0 * r * r * s * aP1 + 3.0 * r * s * s * aP2 + s * s * s * aP3;
  // swaying, more the further it gets from the picture
  float t = uTime + aTint.w * 6.2832;
  p += s * vec3(0.0, 0.035 * sin(s * 7.0 - t * 0.9), 0.03 * sin(s * 5.0 + t * 0.7));
  return p;
}
void main() {
  float s = position.x * uReach;
  vec3 p = curve(s);
  vec3 ahead = curve(s + 0.01) - p;
  vec3 w = (modelMatrix * vec4(p, 1.0)).xyz;
  // a ribbon of light turned to face the eye: as wide seen from anywhere
  vec3 along = normalize(mat3(modelMatrix) * ahead);
  vec3 side = normalize(cross(along, cameraPosition - w));
  w += side * position.y * uWidth * mix(0.6, 1.25, s);
  vAt = vec2(s, position.y);
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
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
  // a thin white-hot core in a wide soft glow of its colour
  float y = vAt.y;
  float core = exp(-y * y * 38.0);
  float halo = exp(-y * y * 3.5) * (1.0 - y * y);
  // light running out along it in pulses, out of the picture into the room
  float run = fract(vAt.x * 2.2 - uTime * 0.45 + vTint.w);
  float pulse = 0.45 + 0.55 * pow(smoothstep(0.0, 0.8, run) * (1.0 - smoothstep(0.8, 1.0, run)), 2.0);
  // it leaves the picture's face softly and thins out at its end
  float ends = smoothstep(0.0, 0.12, vAt.x) * (1.0 - smoothstep(0.6, 1.0, vAt.x));
  vec3 c = vTint.rgb * (core * 1.4 + halo * 0.32) + vec3(1.0, 0.92, 1.0) * core * core * 0.5;
  glow(c * pulse * ends * uLevel * uFade);
}
`;

/** A stream of the stage's light: its curve (four control points, metres
 *  from the picture's centre, z out of its face), its colour (linear, as
 *  bright as it gets) and a phase so no two run together. */
export type Stream = { curve: [number, number, number][]; color: [number, number, number]; phase: number };

const STEPS = 64;

/**
 * Ribbons of the stage's light flowing out of a picture and into the room:
 * each a camera-facing strip of added light along a curve, swaying, with
 * pulses running out along it; seen in the floor too. One draw for all.
 */
export function makeStreams(shared: Shared, level: { value: number }, streams: Stream[], width: number) {
  const pos: number[] = [];
  const cp: number[][] = [[], [], [], []];
  const tint: number[] = [];
  const index: number[] = [];
  streams.forEach((st, i) => {
    const base = i * (STEPS + 1) * 2;
    for (let k = 0; k <= STEPS; k++) {
      for (const y of [-1, 1]) {
        pos.push(k / STEPS, y, 0);
        st.curve.forEach((p, j) => cp[j].push(...p));
        tint.push(...st.color, st.phase);
      }
      const a = base + k * 2;
      if (k < STEPS) index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  cp.forEach((c, j) => geometry.setAttribute(`aP${j}`, new THREE.Float32BufferAttribute(c, 3)));
  geometry.setAttribute("aTint", new THREE.Float32BufferAttribute(tint, 4));
  const uniforms = { uFade: { value: 1 }, uReach: { value: 1 } };
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, ...uniforms, uLevel: level, uWidth: { value: width } },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  mesh.renderOrder = 2;
  return { mesh, ...uniforms };
}
