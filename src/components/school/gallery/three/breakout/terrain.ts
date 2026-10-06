import * as THREE from "three";
import { HEAD, LIGHT, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";
import { CAST_GLSL, caster, type Shades } from "../shadows";

/** One block's side, metres. */
export const BLOCK = 0.088;
/** How many of the glowing blocks in its grass light the grass round them. */
export const LAMPS = 20;

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
out vec3 vLocal;
out vec3 vNormal;
out vec2 vUv;
flat out int vFace;
flat out float vSeed;
void main() {
  int face = faceOf(normal);
  vLocal = aBlock.xyz + position * ${BLOCK};
  vec4 w = modelMatrix * vec4(vLocal, 1.0);
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
in vec3 vLocal;
in vec3 vNormal;
in vec2 vUv;
flat in int vFace;
flat in float vSeed;
uniform int uWork;
uniform float uLevel;
// the glowing blocks sitting in the grass (the slope's own space), and how bright
uniform vec4 uLamps[${LAMPS}];
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
  vec3 grass = mix(vec3(0.045, 0.24, 0.012), vec3(0.12, 0.5, 0.03), h) * (h > 0.93 ? 1.35 : 1.0);
  vec3 earth = mix(vec3(0.07, 0.032, 0.014), vec3(0.15, 0.075, 0.032), h) * (h < 0.08 ? 0.6 : 1.0);
  // the grass hangs two or three pixels over the side, here and there a drip further
  float hang = 5.0 - step(0.5, hash(vec3(texel.x, 7.0, vSeed))) - step(0.82, hash(vec3(texel.x, 3.0, vSeed)));
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
  // and the glowing blocks light the grass round them, warm
  vec3 lamps = vec3(0.0);
  for (int i = 0; i < ${LAMPS}; i++) {
    vec3 d = uLamps[i].xyz - vLocal;
    float d2 = dot(d, d);
    lamps += vec3(1.0, 0.78, 0.3) * uLamps[i].w * (0.25 + 0.75 * max(dot(n, d * inversesqrt(d2)), 0.0)) / (d2 * 60.0 + 0.4);
  }
  light += lamps * 0.4 * uLevel;
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
 *  (m, the slope's own space), how many columns and rows, each column's
 *  height in blocks, and (if given) the block it starts from, for a shelf
 *  standing out over nothing. */
export type Slope = { x0: number; z0: number; columns: number; rows: number; height: (i: number, k: number) => number; base?: (i: number, k: number) => number };

/** Every block of the slope that shows a face, with the faces it shows; and
 *  the top of every column, for things to stand on. */
function blocks(s: Slope) {
  const out0 = (i: number, k: number) => i < 0 || k < 0 || i >= s.columns || k >= s.rows;
  const h = (i: number, k: number) => (out0(i, k) ? 0 : Math.max(0, Math.round(s.height(i, k))));
  const b = (i: number, k: number) => (out0(i, k) || !s.base ? 0 : Math.max(0, Math.round(s.base(i, k))));
  // nothing there at block l of this column
  const open = (i: number, k: number, l: number) => l >= h(i, k) || l < b(i, k);
  const out: number[] = [];
  const seeds: number[] = [];
  const tops: THREE.Vector3[] = [];
  for (let i = 0; i < s.columns; i++)
    for (let k = 0; k < s.rows; k++) {
      const top = h(i, k);
      const base = Math.min(b(i, k), top);
      const x = s.x0 + (i + 0.5) * BLOCK;
      const z = s.z0 + (k + 0.5) * BLOCK;
      if (top > 0) tops.push(new THREE.Vector3(x, top * BLOCK, z));
      for (let l = base; l < top; l++) {
        // the faces that show: where there is nothing that way (never the
        // floor below, nor the back toward the wall, which nobody sees)
        const faces =
          (open(i + 1, k, l) ? 1 : 0) |
          (open(i - 1, k, l) ? 2 : 0) |
          (l === top - 1 ? 4 : 0) |
          (l === base && base > 0 ? 8 : 0) |
          (open(i, k + 1, l) ? 16 : 0) |
          (k > 0 && open(i, k - 1, l) ? 32 : 0);
        if (!faces) continue;
        out.push(x, (l + 0.5) * BLOCK, z, faces);
        seeds.push((i * 7.31 + k * 3.17 + l * 1.73) % 1);
      }
    }
  return { out, seeds, tops };
}

/** A slope of grass blocks stepping down to the floor, the game's own
 *  blocks: lit by the spots, the works' glow and the glowing blocks in it
 *  (`lamps`, set once they are placed; `level` their work's light), seen in
 *  the floor, its shadow thrown on the wall behind. One draw for every block. */
export function makeTerrain(shared: Shared, shades: Shades["uniforms"], work: number, slope: Slope, level: { value: number }) {
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
  const lamps = { value: Array.from({ length: LAMPS }, () => new THREE.Vector4(0, -10, 0, 0)) };
  const mesh = new THREE.Mesh(
    g,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, uWork: { value: work }, uLevel: level, uLamps: lamps },
    }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  const shadow = caster(g, CAST_VERT, { ...shared, ...shades, uWork: { value: work } });
  return {
    mesh,
    shadow,
    tops,
    /** the glowing blocks that light it: where, and how brightly */
    light(at: { at: readonly [number, number, number]; glow: number }[]) {
      at.slice(0, LAMPS).forEach((p, i) => lamps.value[i].set(p.at[0], p.at[1], p.at[2], p.glow));
    },
  };
}
