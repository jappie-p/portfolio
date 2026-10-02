import * as THREE from "three";
import { outerH, outerW, type Room } from "../layout";
import { HEAD, LIGHT, NOISE, OUT, VERT } from "./glsl";
import type { Shared } from "./lights";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
${OUT}
${LIGHT}
${NOISE}
uniform vec4 uFrame[4];
uniform float uFrameZ[4];
uniform vec3 uWall;

float box(vec2 p, vec4 f) {
  vec2 e = abs(p - f.xy) - f.zw;
  return length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
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
  // plaster: a faint bump the grazing light rakes across
  vec3 n = normalize(vec3((a.b - 0.5) * 0.05 + (b.b - 0.5) * 0.05, (a.a - 0.5) * 0.05 + (b.a - 0.5) * 0.05, 1.0));
  vec3 albedo = uWall * (0.9 + 0.14 * a.g + 0.08 * b.r);

  vec3 light = uAmbient * (0.6 + 0.4 * smoothstep(4.0, 0.0, p.y));
  for (int i = 0; i < SPOTS; i++) {
    vec3 d = uSpotPos[i] - p;
    float d2 = dot(d, d);
    vec3 L = d * inversesqrt(d2);
    float facing = dot(-L, uSpotDir[i]);
    float lambert = max(dot(n, L), 0.0);
    // the halo every spot spills round its beam, so the wall between works
    // falls into shadow instead of a void
    float halo = smoothstep(0.2, 1.0, facing);
    light += uSpotCol[i] * (halo * halo * 0.05 / d2) * lambert;
    float cone = smoothstep(uSpotCone[i].x, uSpotCone[i].y, facing);
    if (cone <= 0.0) continue;
    // a little light still reaches the shadow, off the floor and the walls
    float s = i > 0 ? mix(0.3, 1.0, shadow(i - 1, p, uSpotPos[i])) : 1.0;
    light += uSpotCol[i] * (cone * cone / d2) * lambert * s;
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

/** Write each work's outline (and how far it stands out) for the shadows. */
export function placeFrames(slots: FrameSlots, room: Room, lift: number[]) {
  room.works.forEach((w, i) => {
    slots.uFrame.value[i].set(w.x, w.y, outerW(w) / 2, outerH(w) / 2);
    slots.uFrameZ.value[i] = w.depth + (lift[i] ?? 0);
  });
}

/** The long wall: warm charcoal plaster, lit only by the spots. */
export function makeWall(shared: Shared, slots: FrameSlots) {
  const geometry = new THREE.PlaneGeometry(40, 7);
  geometry.translate(4, 3.5, 0);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...shared, ...slots, uWall: { value: new THREE.Color(0.068, 0.068, 0.071) } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
