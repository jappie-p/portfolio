import type * as THREE from "three";
import { bake, TILE_NOISE } from "./bake";

/** Honed slate, one tile in 0..1: soft broad mottling and long faint
 *  streaks along the cleavage in its colour, only a fine grain in relief. */
const FIELDS = /* glsl */ `
float broad(vec2 uv) { return tfbm(uv, vec2(4.0), 4); }
float streak(vec2 uv) { return tfbm(uv + vec2(0.0, broad(uv) * 0.04), vec2(2.0, 36.0), 4); }
float grain(vec2 uv) { return tfbm(uv, vec2(128.0), 3); }
`;

const GRAIN = /* glsl */ `
uniform float uSeed;
varying vec2 vUv;
${TILE_NOISE}
${FIELDS}
void main() {
  float v = 0.86 + (broad(vUv) - 0.5) * 0.3 + (streak(vUv) - 0.5) * 0.16 + (grain(vUv) - 0.5) * 0.1;
  gl_FragColor = vec4(vec3(v), 1.0);
}
`;

const NORMAL = /* glsl */ `
uniform float uSeed;
uniform float uTexel;
varying vec2 vUv;
${TILE_NOISE}
${FIELDS}
float relief(vec2 uv) { return grain(uv) * 0.7 + streak(uv) * 0.3; }
void main() {
  float hx = relief(vUv + vec2(uTexel, 0.0)) - relief(vUv - vec2(uTexel, 0.0));
  float hy = relief(vUv + vec2(0.0, uTexel)) - relief(vUv - vec2(0.0, uTexel));
  vec3 n = normalize(vec3(-hx * 4.0, -hy * 4.0, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}
`;

/** The slate's grain (albedo and roughness factor, grey) and normal map. */
export async function bakeSlate(gl: THREE.WebGLRenderer, size: number) {
  const seed = { value: 0.37 };
  const grain = await bake(gl, GRAIN, { size, uniforms: { uSeed: seed } });
  const normal = await bake(gl, NORMAL, { size, uniforms: { uSeed: seed, uTexel: { value: 1 / size } } });
  return { grain, normal };
}
