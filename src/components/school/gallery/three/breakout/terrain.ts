import * as THREE from "three";
import { HEAD, LIGHT, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";
import { CAST_GLSL, caster, type Shades } from "../shadows";

/** One block's side, metres. */
export const BLOCK = 0.088;

const PLACE = /* glsl */ `
in vec3 position;
in vec3 normal;
in vec2 uv;
// its centre, and which of its faces show (a bit each: +x -x +y -y +z -z)
in vec4 aBlock;
in float aSeed;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
int faceOf(vec3 n) {
  return n.x > 0.5 ? 0 : n.x < -0.5 ? 1 : n.y > 0.5 ? 2 : n.y < -0.5 ? 3 : n.z > 0.5 ? 4 : 5;
}
bool shows(int face) {
  return ((int(aBlock.w + 0.5) >> face) & 1) == 1;
}
`;

const VERT = /* glsl */ `${HEAD}
${PLACE}
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
flat out int vFace;
flat out float vSeed;
void main() {
  int face = faceOf(normal);
  vec4 w = modelMatrix * vec4(aBlock.xyz + position * ${BLOCK}, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vFace = face;
  vSeed = aSeed;
  gl_Position = shows(face) ? projectionMatrix * viewMatrix * w : vec4(0.0, 0.0, 2.0, 1.0);
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
flat in int vFace;
flat in float vSeed;
uniform int uWork;
${OUT}
${LIGHT}
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
void main() {
  // the game's blocks: eight pixels a side, grass on top, earth below with
  // the grass hanging a pixel or two over its upper edge
  vec2 texel = floor(vUv * 8.0);
  float h = hash(vec3(texel, vSeed * 13.0 + float(vFace)));
  vec3 grass = mix(vec3(0.06, 0.18, 0.025), vec3(0.14, 0.34, 0.05), h) * (h > 0.93 ? 1.35 : 1.0);
  vec3 earth = mix(vec3(0.09, 0.045, 0.02), vec3(0.18, 0.095, 0.042), h) * (h < 0.08 ? 0.6 : 1.0);
  float hang = 6.0 - step(0.55, hash(vec3(texel.x, 7.0, vSeed)));
  vec3 albedo = vFace == 2 ? grass : vFace == 3 ? earth : (texel.y >= hang ? grass * 0.85 : earth);
  // each block's edges a touch darker, as the game draws them
  vec2 e = min(vUv, 1.0 - vUv);
  albedo *= mix(0.72, 1.0, smoothstep(0.0, 0.09, min(e.x, e.y)));
  vec3 n = normalize(vNormal);
  vec3 light = uAmbient * 3.0 + glows(vWorld, n);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    light += spot(i, vWorld, L) * max(dot(n, L), 0.0);
  }
  // its lamp's light thrown back off the floor and round the room: the faces
  // turned from the lamp still show their earth
  light += uSpotCol[uWork + 1] * 0.012 * (0.45 + 0.55 * max(n.z, 0.0));
  emit(albedo * light, 1.0);
}
`;

const CAST_VERT = /* glsl */ `${HEAD}
${PLACE}
${LIGHT}
${CAST_GLSL}
uniform int uWork;
void main() {
  vec4 w = modelMatrix * vec4(aBlock.xyz + position * ${BLOCK}, 1.0);
  gl_Position = shows(faceOf(normal)) ? fromLamp(uWork, w.xyz, 0.85) : vec4(0.0, 0.0, 2.0, 1.0);
}
`;

/** A slope of blocks: where its columns start along the wall and out from it
 *  (m, the slope's own space), how many columns and rows, and each column's
 *  height in blocks. */
export type Slope = { x0: number; z0: number; columns: number; rows: number; height: (i: number, k: number) => number };

/** Every block of the slope that shows a face, with the faces it shows; and
 *  the top of every column, for things to stand on. */
function blocks(s: Slope) {
  const h = (i: number, k: number) => (i < 0 || k < 0 || i >= s.columns || k >= s.rows ? 0 : Math.max(0, Math.round(s.height(i, k))));
  const out: number[] = [];
  const seeds: number[] = [];
  const tops: THREE.Vector3[] = [];
  for (let i = 0; i < s.columns; i++)
    for (let k = 0; k < s.rows; k++) {
      const top = h(i, k);
      const x = s.x0 + (i + 0.5) * BLOCK;
      const z = s.z0 + (k + 0.5) * BLOCK;
      if (top > 0) tops.push(new THREE.Vector3(x, top * BLOCK, z));
      for (let l = 0; l < top; l++) {
        // the faces that show: where the neighbour that way is lower (never
        // the floor below, nor the back toward the wall, which nobody sees)
        const faces =
          (h(i + 1, k) <= l ? 1 : 0) | (h(i - 1, k) <= l ? 2 : 0) | (l === top - 1 ? 4 : 0) | (h(i, k + 1) <= l ? 16 : 0) | (k > 0 && h(i, k - 1) <= l ? 32 : 0);
        if (!faces) continue;
        out.push(x, (l + 0.5) * BLOCK, z, faces);
        seeds.push((i * 7.31 + k * 3.17 + l * 1.73) % 1);
      }
    }
  return { out, seeds, tops };
}

/** A slope of grass blocks stepping down to the floor, the game's own
 *  blocks: lit by the spots and the works' glow, seen in the floor, its
 *  shadow thrown on the wall behind. One draw for every block. */
export function makeTerrain(shared: Shared, shades: Shades["uniforms"], work: number, slope: Slope) {
  const { out, seeds, tops } = blocks(slope);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.setIndex(box.getIndex());
  g.setAttribute("position", box.getAttribute("position"));
  g.setAttribute("normal", box.getAttribute("normal"));
  g.setAttribute("uv", box.getAttribute("uv"));
  g.setAttribute("aBlock", new THREE.InstancedBufferAttribute(new Float32Array(out), 4));
  g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1));
  g.instanceCount = out.length / 4;
  const mesh = new THREE.Mesh(
    g,
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...shared, uWork: { value: work } } }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  const shadow = caster(g, CAST_VERT, { ...shared, ...shades, uWork: { value: work } });
  return { mesh, shadow, tops };
}
