import * as THREE from "three";
import { outerH, outerW, type Work } from "../layout";
import { HEAD, LIGHT, NOISE, OUT } from "./glsl";
import type { Shared } from "./lights";

/** The moulding's profile across its bar, from its outer edge inward: how
 *  far in (m) and how far off the wall (m). A rounded bead outside, a broad
 *  frieze that carries the name, a small bead, and a sight edge that slopes
 *  down to just above the picture (which hangs 0.032 off the wall), so it
 *  never hides the picture's edge from in front. */
const PROFILE: [number, number][] = [
  [0, 0],
  [0, 0.06],
  [0.003, 0.07],
  [0.009, 0.077],
  [0.017, 0.078],
  [0.024, 0.073],
  [0.029, 0.065],
  [0.034, 0.064],
  [0.1, 0.068],
  [0.164, 0.064],
  [0.168, 0.067],
  [0.173, 0.069],
  [0.178, 0.066],
  [0.184, 0.052],
  [0.19, 0.039],
  [0.192, 0.0335],
];
/** Where the frieze runs across the bar. */
const FRIEZE = { from: 0.036, to: 0.162 };

/** How far a work's frame stands off the wall: a print's moulding, the card's plain frame. */
export const standOff = (w: Work) => (w.id === "berlijn" ? w.depth : PROFILE.reduce((m, [, z]) => Math.max(m, z), 0));

const VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec3 normal;
// how far along its side (m, from that side's left or lower end) and how far in from the outer edge
in vec2 aBar;
// which side: 0 top, 1 bottom, 2 left, 3 right
in float aSide;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vBar;
out float vSide;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vBar = aBar;
  vSide = aSide;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vBar;
in float vSide;
uniform vec3 cameraPosition;
uniform int uSpot;
uniform sampler2D uLetters;
// where the name sits on the top bar (along, in; width, height: m) and its place in the atlas
uniform vec4 uTitle;
uniform vec4 uTitleUv;
${OUT}
${LIGHT}
${NOISE}
void main() {
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float along = vBar.x;
  float inset = vBar.y;
  // carved: a bead and reel round the outer bead, a twist along the small one
  float bead = smoothstep(0.003, 0.009, inset) * (1.0 - smoothstep(0.022, 0.028, inset));
  float twist = smoothstep(0.165, 0.168, inset) * (1.0 - smoothstep(0.176, 0.179, inset));
  float carve = bead * sin(along * 349.0) * 0.55 + twist * sin((along + inset * 2.0) * 520.0) * 0.45;
  // the bar's own direction, for the carving to tilt the normal along
  vec3 run = vSide < 1.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  n = normalize(n + run * carve);

  // the name, gilt and raised on the top bar's frieze
  vec2 s = (vec2(along, inset) - uTitle.xy) / uTitle.zw;
  vec2 uv = uTitleUv.xy + clamp(vec2(s.x, 1.0 - s.y), 0.0, 1.0) * uTitleUv.zw;
  float letter = texture(uLetters, uv).r * step(0.0, min(s.x, s.y)) * step(max(s.x, s.y), 1.0) * step(vSide, 0.5);

  // dark bronzed wood: a fine grain running along the bar, worn lighter on the edges
  vec4 g = grain(vec2(along * 3.0, inset * 40.0) + vSide * 0.37);
  vec3 wood = vec3(0.05, 0.036, 0.025) * (0.75 + 0.5 * g.r) * (1.0 + 0.6 * bead);
  vec3 gilt = vec3(0.95, 0.72, 0.4);
  vec3 L;
  vec3 lamp = spot(uSpot, vWorld, L);
  float lambert = max(dot(n, L), 0.0);
  float nv = max(dot(n, V), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  vec3 H = normalize(L + V);
  float sheen = pow(max(dot(n, H), 0.0), mix(36.0, 70.0, letter));
  vec3 base = mix(wood, gilt * 0.35, letter);
  vec3 col = base * (uAmbient * 3.0 + glows(vWorld, n) + lamp * lambert);
  col += lamp * sheen * mix(vec3(0.12 + 0.5 * F), gilt * 1.3, letter);
  // the gilt glows a little, like the letters on a lit sign
  col += gilt * letter * 0.05;
  emit(col, 1.0);
}
`;

/** The profile swept round the frame's rectangle, mitred at the corners,
 *  centred on the work, the wall at z = 0 (in the work's group, shifted by
 *  the group's own offset `z0`). */
function sweep(w: Work, z0: number) {
  const ow = outerW(w) / 2;
  const oh = outerH(w) / 2;
  // the profile's normals (in-direction, out-of-wall), averaged at each point
  const seg = PROFILE.slice(1).map(([u, z], i) => {
    const du = u - PROFILE[i][0];
    const dz = z - PROFILE[i][1];
    const l = Math.hypot(du, dz) || 1;
    return [-dz / l, du / l];
  });
  const norms = PROFILE.map((_, j) => {
    const a = seg[Math.max(j - 1, 0)];
    const b = seg[Math.min(j, seg.length - 1)];
    const nu = a[0] + b[0];
    const nz = a[1] + b[1];
    const l = Math.hypot(nu, nz) || 1;
    return [nu / l, nz / l];
  });
  const pos: number[] = [];
  const nor: number[] = [];
  const bar: number[] = [];
  const side: number[] = [];
  const index: number[] = [];
  // each side: the direction along it, the direction in, and its half-lengths
  const sides: { along: [number, number]; inward: [number, number]; half: number; offset: number }[] = [
    { along: [1, 0], inward: [0, -1], half: ow, offset: oh },
    { along: [1, 0], inward: [0, 1], half: ow, offset: oh },
    { along: [0, 1], inward: [1, 0], half: oh, offset: ow },
    { along: [0, 1], inward: [-1, 0], half: oh, offset: ow },
  ];
  sides.forEach((sd, k) => {
    const base = pos.length / 3;
    PROFILE.forEach(([u, z], j) => {
      // mitred: at inset u the side runs between the inset rectangle's corners
      const len = sd.half - u;
      for (const end of [-1, 1]) {
        const a = end * len;
        const x = sd.along[0] * a - sd.inward[0] * (sd.offset - u);
        const y = sd.along[1] * a - sd.inward[1] * (sd.offset - u);
        pos.push(x, y, z - z0);
        const [nu, nz] = norms[j];
        nor.push(sd.inward[0] * nu, sd.inward[1] * nu, nz);
        bar.push(a + sd.half, u);
        side.push(k);
      }
    });
    for (let j = 0; j < PROFILE.length - 1; j++) {
      const a = base + j * 2;
      // wound to face out of the moulding, whichever side it is
      if (k === 1 || k === 3) index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aBar", new THREE.Float32BufferAttribute(bar, 2));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  return g;
}

/** Where a work's name is set on its top bar, and the atlas (and the row in
 *  it) it is cut from. */
export type BarTitle = { texture: THREE.Texture; rect: THREE.Vector4; uv: THREE.Vector4; row: number };

/** A print's frame: the moulded profile in dark bronzed wood, its name gilt
 *  on the top bar's frieze, lit by its own spot. `z0`: where the work's group
 *  puts the wall, relative to its origin. */
export function makeMoulding(w: Work, shared: Shared, spot: number, z0: number, title: BarTitle | null) {
  return new THREE.Mesh(
    sweep(w, z0),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        ...shared,
        uSpot: { value: spot },
        uLetters: { value: title?.texture ?? null },
        uTitle: { value: title?.rect ?? new THREE.Vector4(0, -1, 1, 1) },
        uTitleUv: { value: title?.uv ?? new THREE.Vector4() },
      },
    }),
  );
}

/** The frieze's extent across the bar, for setting a name on it. */
export const frieze = () => FRIEZE;
