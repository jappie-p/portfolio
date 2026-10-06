import * as THREE from "three";
import { outerH, outerW, type Room } from "../layout";
import { HEAD, LIGHT, NOISE, OUT, VERT } from "./glsl";
import type { Shared } from "./lights";
import { standOff } from "./moulding";
import { SHADE_GLSL, type Shades } from "./shadows";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
${OUT}
${LIGHT}
${NOISE}
${SHADE_GLSL}
uniform vec4 uFrame[4];
uniform float uFrameZ[4];
uniform vec3 uWall;

float box(vec2 p, vec4 f) {
  vec2 e = abs(p - f.xy) - f.zw;
  return length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
}

// how much of a pixel a line of half-width w covers at distance d from it:
// thinner than a pixel far off, it fades instead of breaking up
float line(float d, float w) {
  float fw = max(fwidth(d), 1e-5);
  return (1.0 - smoothstep(w - fw, w + fw, d)) * min(w / fw, 1.0);
}

float hash2(vec2 q) {
  return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453);
}

// where the ray from the wall to the lamp crosses the frame's face: inside
// the frame means the frame stands in the light (soft at the edge)
float shadow(int w, vec3 p, vec3 lamp) {
  float d = uFrameZ[w];
  vec2 q = p.xy + (lamp.xy - p.xy) * (d / lamp.z);
  float soft = 0.01 + d * 0.3;
  return smoothstep(-soft, soft * 1.5, box(q, uFrame[w]));
}

void main() {
  vec3 p = vWorld;
  vec4 a = grain(p.xy * 0.37);
  vec4 b = grain(p.xy * 1.9 + 0.31);
  vec4 c = grain(p.xy * 0.085 + 0.7);
  vec4 s = grain(vec2(p.x * 0.7, p.y * 0.05) + 0.13);
  // rough concrete: a bump the grazing light rakes across
  vec3 n = normalize(vec3((a.b - 0.5) * 0.09 + (b.b - 0.5) * 0.08, (a.a - 0.5) * 0.09 + (b.a - 0.5) * 0.08, 1.0));
  // mottled, darker in broad stains, weathered in streaks running down from
  // high on the wall
  float tone = 0.8 + 0.24 * a.g + 0.12 * b.r - 0.3 * smoothstep(0.45, 0.8, c.g) - 0.16 * smoothstep(0.55, 0.85, s.g) * smoothstep(1.2, 3.4, p.y);
  // cast in place against panels 2.4 by 1.2 m: each pour its own shade, the
  // joints between them fine dark lines, the tie holes in rows of dots
  vec2 cell = p.xy / vec2(2.4, 1.2);
  vec2 f = fract(cell) * vec2(2.4, 1.2);
  tone *= 0.9 + 0.2 * hash2(floor(cell));
  float joint = max(line(min(f.x, 2.4 - f.x), 0.003), line(min(f.y, 1.2 - f.y), 0.003));
  vec2 tie = mod(f + vec2(0.3, 0.3), vec2(0.6)) - 0.3;
  float hole = line(length(tie), 0.011);
  tone *= 1.0 - 0.45 * joint - 0.35 * hole;
  vec3 albedo = uWall * tone;

  vec3 light = uAmbient * (0.6 + 0.4 * smoothstep(4.0, 0.0, p.y)) + glows(p, n);
  for (int i = 0; i < SPOTS; i++) {
    vec3 d = uSpotPos[i] - p;
    float d2 = dot(d, d);
    vec3 L = d * inversesqrt(d2);
    float facing = dot(-L, uSpotDir[i]);
    float lambert = max(dot(n, L), 0.0);
    // the halo every spot spills round its beam, so the wall between works
    // falls into shadow instead of a void
    float halo = smoothstep(0.2, 1.0, facing);
    light += uSpotCol[i] * (halo * halo * 0.03 / d2) * lambert;
    float cone = smoothstep(uSpotCone[i].x, uSpotCone[i].y, facing);
    if (cone <= 0.0) continue;
    // a little light still reaches the shadow, off the floor and the walls;
    // what breaks out of a print shades the wall round it too
    float lit = i > 0 ? mix(0.3, 1.0, shadow(i - 1, p, uSpotPos[i])) : 1.0;
    lit *= 1.0 - 0.7 * shade(i - 1, p);
    light += uSpotCol[i] * (cone * cone / d2) * lambert * lit;
  }

  // contact darkening round each frame and along the skirting
  float ao = 1.0;
  for (int w = 0; w < 4; w++) ao *= 1.0 - 0.22 * exp(-max(box(p.xy, uFrame[w]), 0.0) / 0.03);
  ao *= 1.0 - 0.5 * exp(-p.y / 0.09);
  emit(albedo * light * ao, 1.0);
}
`;

export type FrameSlots = { uFrame: { value: THREE.Vector4[] }; uFrameZ: { value: number[] } };

export function frameSlots(): FrameSlots {
  return { uFrame: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, -10, 0, 0)) }, uFrameZ: { value: [0, 0, 0, 0] } };
}

/** Write each work's outline (and how far its frame stands out) for the shadows. */
export function placeFrames(slots: FrameSlots, room: Room, lift: number[]) {
  room.works.forEach((w, i) => {
    slots.uFrame.value[i].set(w.x, w.y, outerW(w) / 2, outerH(w) / 2);
    slots.uFrameZ.value[i] = standOff(w) + (lift[i] ?? 0);
  });
}

/** The long wall: dark weathered concrete, lit only by the spots and what
 *  the works give off. */
export function makeWall(shared: Shared, slots: FrameSlots, shades: Shades) {
  const geometry = new THREE.PlaneGeometry(40, 7);
  geometry.translate(4, 3.5, 0);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...shared, ...slots, ...shades.uniforms, uWall: { value: new THREE.Color(0.064, 0.06, 0.056) } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
