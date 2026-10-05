import * as THREE from "three";
import { HEAD, LIGHT, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";
import { CAST_GLSL, caster, type Shades } from "../shadows";
import { EXPOSE, TURN } from "./glsl";

/** Most sprites one set of blocks carries: their poses are a uniform array. */
export const SPRITES = 12;

/** Pixel art: rows top to bottom, a character per cell ("." for none), and
 *  each character's colour in sRGB. */
export type Pixels = { rows: readonly string[]; palette: Readonly<Record<string, string>> };

/** A loose block, in its sprite's space: where it floats (metres), its size
 *  and colour, how far it drifts, how fast it tumbles (radians a second) and
 *  how dark a shadow it throws (a speck throws a faint one). */
export type Loose = { at: readonly [number, number, number]; size: number; color: string; drift: number; tumble: number; shade: number };

// which of the eight cells round a block, in its sprite's plane, are filled:
// a bit each. Sprites are one block thick, so nothing is in front or behind.
const FILLED = /* glsl */ `
bool filled(int near, vec3 d) {
  if (abs(d.z) > 0.5) return false;
  int k = int(round(d.x)) + 1 + 3 * (int(round(d.y)) + 1);
  if (k == 4) return true;
  return ((near >> (k > 4 ? k - 1 : k)) & 1) == 1;
}
`;

const PLACE = /* glsl */ `
#define SPRITES ${SPRITES}
in vec3 position;
in vec3 normal;
in vec2 uv;
in vec3 aTanU;
in vec3 aTanV;
in vec4 aCell;
in vec4 aColor;
in vec4 aDrift;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 uSprite[SPRITES];
uniform float uTime;
uniform float uSpread;
${FILLED}
${TURN}
// this vertex in the world: its sprite carries the block, and a loose block
// drifts and tumbles on its own besides (spread pushes loose ones further
// out of the picture); the block's axes come out in basis
vec3 place(out mat3 basis) {
  mat4 m = modelMatrix * uSprite[int(aCell.w)];
  float ph = aDrift.x * 6.2832;
  vec3 drift = aDrift.y * vec3(sin(uTime * 0.43 + ph), sin(uTime * 0.31 + ph * 1.7), sin(uTime * 0.37 + ph * 2.3));
  mat3 r = turn(normalize(vec3(sin(ph * 3.0), cos(ph * 2.0), 0.6)), aDrift.z * uTime + ph);
  basis = mat3(m) * r * aDrift.w;
  vec3 at = vec3(aCell.xy, aCell.z * (1.0 + uSpread)) + drift;
  return (m * vec4(at, 1.0)).xyz + basis * position;
}
`;

const VERT = /* glsl */ `${HEAD}
${PLACE}
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec3 vColor;
flat out int vNear;
flat out vec3 vN;
flat out vec3 vU;
flat out vec3 vV;
flat out mat3 vBasis;
void main() {
  mat3 basis;
  vec3 w = place(basis);
  int near = int(aColor.a + 0.5);
  vWorld = w;
  vNormal = normalize(basis * normal);
  vUv = uv;
  vColor = aColor.rgb;
  vNear = near;
  vN = normal;
  vU = aTanU;
  vV = aTanV;
  vBasis = basis;
  // a face against a filled cell is inside the sprite: dropped
  gl_Position = filled(near, normal) ? vec4(0.0, 0.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
in vec3 vColor;
flat in int vNear;
flat in vec3 vN;
flat in vec3 vU;
flat in vec3 vV;
flat in mat3 vBasis;
uniform vec3 cameraPosition;
uniform float uFade;
${OUT}
${LIGHT}
${EXPOSE}
${FILLED}
// how much of the pixel the sprite covers across this face's edge toward t:
// on the outline (round that edge the surface turns away from the eye) it
// fades over a pixel, as there is no multisampling; edges within stay whole
float cover(vec3 t, float d, float px, vec3 V) {
  if (filled(vNear, t + vN) || filled(vNear, t)) return 1.0;
  if (dot(vBasis * t, V) > 0.0) return 1.0;
  return clamp(d / px, 0.0, 1.0);
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  vec2 px = max(fwidth(vUv), vec2(1e-5));
  float a = cover(-vU, vUv.x, px.x, V) * cover(vU, 1.0 - vUv.x, px.x, V) * cover(-vV, vUv.y, px.y, V) * cover(vV, 1.0 - vUv.y, px.y, V) * uFade;
  if (a < 0.004) discard;
  // the faces toward the lamp brightest, a little plastic sheen on them
  vec3 L;
  float direct = exposed(vWorld, n, L);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 40.0) * min(direct, 1.0);
  vec3 col = vColor * (uAmbient * 4.0 + uLevel * (0.07 + 0.85 * direct)) + vec3(1.0, 0.95, 0.88) * spec * 0.16 * uLevel;
  emit(col, a);
}
`;

const CAST_VERT = /* glsl */ `${HEAD}
${PLACE}
${LIGHT}
${CAST_GLSL}
in float aShade;
uniform int uWork;
uniform float uFade;
void main() {
  mat3 basis;
  vec3 w = place(basis);
  gl_Position = filled(int(aColor.a + 0.5), normal) ? vec4(0.0, 0.0, 2.0, 1.0) : fromLamp(uWork, w, aShade * uFade);
}
`;

/** The unit cube face by face, each face knowing its own axes: the back, the
 *  sides, then the front, so the front's soft outline lands on its sides. */
const FACES: [number[], number[], number[]][] = [
  // normal, u, v
  [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
];

function cube() {
  const g = new THREE.InstancedBufferGeometry();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const tu: number[] = [];
  const tv: number[] = [];
  const index: number[] = [];
  FACES.forEach(([n, u, v], f) => {
    for (const [a, b] of [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]) {
      for (let k = 0; k < 3; k++) pos.push(n[k] * 0.5 + (a - 0.5) * u[k] + (b - 0.5) * v[k]);
      nor.push(...n);
      uv.push(a, b);
      tu.push(...u);
      tv.push(...v);
    }
    index.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3);
  });
  g.setIndex(index);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aTanU", new THREE.Float32BufferAttribute(tu, 3));
  g.setAttribute("aTanV", new THREE.Float32BufferAttribute(tv, 3));
  return g;
}

/** A small seeded hash, 0..1: each block a touch lighter or darker, like pixels. */
const hash = (a: number, b: number, c: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Every block of the sprites (pixel art, centred on its sprite's origin, a
 *  block per cell) and the loose ones (carried by sprite `scatter`). */
function cells(sprites: Pixels[], loose: Loose[], scatter: number) {
  const cell: number[] = [];
  const color: number[] = [];
  const drift: number[] = [];
  const shade: number[] = [];
  const c = new THREE.Color();
  sprites.forEach(({ rows, palette }, sprite) => {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const at = (x: number, y: number) => y >= 0 && y < h && (rows[y][x] ?? ".") !== ".";
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === ".") return;
        // the eight cells round it, bottom row first, as the shader counts them
        let near = 0;
        let bit = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            if (at(x + dx, y - dy)) near |= 1 << bit;
            bit++;
          }
        c.set(palette[ch] ?? "#ff00ff").multiplyScalar(0.95 + 0.1 * hash(sprite, x, y));
        cell.push(x - (w - 1) / 2, (h - 1) / 2 - y, 0, sprite);
        color.push(c.r, c.g, c.b, near);
        drift.push(0, 0, 0, 1);
        shade.push(1);
      }),
    );
  });
  loose.forEach((b, i) => {
    c.set(b.color);
    cell.push(b.at[0], b.at[1], b.at[2], scatter);
    color.push(c.r, c.g, c.b, 0);
    drift.push((i * 0.618034) % 1, b.drift, b.tumble, b.size);
    shade.push(b.shade);
  });
  return { cell, color, drift, shade };
}

/** What a print's spot lights the blocks with: its index, level and exposure. */
export type Lamp = { uSpot: { value: number }; uLevel: { value: number }; uNorm: { value: number } };

/**
 * Pixel art as blocks: every block of every sprite in one instanced draw,
 * posed per sprite (uSprite), lit by the print's spot; and the same blocks
 * again on layer SHADE, as that spot sees them, for the shadows they cast.
 * Their outline is feathered in the shader: no multisampling here.
 */
export function makeBlocks(shared: Shared, lamp: Lamp, shades: Shades["uniforms"], sprites: Pixels[], loose: Loose[]) {
  const scatter = sprites.length;
  const { cell, color, drift, shade } = cells(sprites, loose, scatter);
  const geometry = cube();
  geometry.setAttribute("aCell", new THREE.InstancedBufferAttribute(new Float32Array(cell), 4));
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(new Float32Array(color), 4));
  geometry.setAttribute("aDrift", new THREE.InstancedBufferAttribute(new Float32Array(drift), 4));
  geometry.setAttribute("aShade", new THREE.InstancedBufferAttribute(new Float32Array(shade), 1));
  geometry.instanceCount = cell.length / 4;

  const poses = Array.from({ length: SPRITES }, () => new THREE.Matrix4());
  const motion = { uSprite: { value: poses }, uSpread: { value: 0 }, uFade: { value: 1 } };
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, ...motion, uSpot: lamp.uSpot, uLevel: lamp.uLevel, uNorm: lamp.uNorm },
      transparent: true,
    }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  mesh.renderOrder = 1;
  const shadow = caster(geometry, CAST_VERT, { ...shared, ...motion, ...shades, uWork: { value: lamp.uSpot.value - 1 } });
  return { mesh, shadow, poses, scatter, spread: motion.uSpread, fade: motion.uFade };
}

export type Blocks = ReturnType<typeof makeBlocks>;
