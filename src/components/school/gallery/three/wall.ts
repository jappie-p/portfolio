import * as THREE from "three";
import { outerH, outerW, type Room } from "../layout";
import { BAYS, type Exhibit } from "./exhibit";
import { HEAD, LIGHT, NOISE, OUT, VERT } from "./glsl";
import type { Shared } from "./lights";
import { SHADE_GLSL, type Shades } from "./shadows";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
${OUT}
${LIGHT}
${NOISE}
${SHADE_GLSL}
#define BAYS ${BAYS}
uniform vec4 uFrame[4];
uniform float uFrameZ[4];
uniform vec3 uWall;
uniform vec2 uBay[BAYS];
uniform vec3 uPaint[BAYS];
uniform vec3 uInk[BAYS];
uniform vec4 uTitle[BAYS];
uniform vec4 uTitleUv[BAYS];
uniform float uTurn;
uniform sampler2D uLetters;

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

  // each print's stretch of paint, fading into the next over a hand's width;
  // the name lettered on the stretch this point is on
  vec3 paint = uWall;
  vec3 ink = vec3(0.0);
  vec4 title = vec4(0.0, -20.0, 1.0, 1.0);
  vec4 tuv = vec4(0.0);
  for (int i = 0; i < BAYS; i++) {
    float k = smoothstep(uBay[i].x - 0.13, uBay[i].x + 0.13, p.x) - smoothstep(uBay[i].y - 0.13, uBay[i].y + 0.13, p.x);
    paint += (uPaint[i] - uWall) * k;
    if (p.x > uTitle[i].x && p.x < uTitle[i].x + uTitle[i].z) {
      title = uTitle[i];
      tuv = uTitleUv[i];
      ink = uInk[i];
    }
  }
  vec2 s = (p.xy - title.xy) / title.zw;
  // turned, the name reads up the wall; the mip comes from the wall's own
  // position, so it never jumps at the edge of the name's box
  bool turned = uTurn > 0.5;
  vec2 st = turned ? vec2(s.y, 1.0 - s.x) : s;
  vec2 gx = dFdx(p.xy) / title.zw;
  vec2 gy = dFdy(p.xy) / title.zw;
  gx = (turned ? vec2(gx.y, -gx.x) : gx) * tuv.zw;
  gy = (turned ? vec2(gy.y, -gy.x) : gy) * tuv.zw;
  float letter = textureGrad(uLetters, tuv.xy + clamp(st, 0.0, 1.0) * tuv.zw, gx, gy).r * step(0.0, min(s.x, s.y)) * step(max(s.x, s.y), 1.0);

  // plaster: a faint bump the grazing light rakes across; the vinyl lies flat on it
  vec3 n = normalize(vec3(((a.b - 0.5) * 0.05 + (b.b - 0.5) * 0.05) * (1.0 - letter), ((a.a - 0.5) * 0.05 + (b.a - 0.5) * 0.05) * (1.0 - letter), 1.0));
  vec3 albedo = mix(paint * (0.9 + 0.14 * a.g + 0.08 * b.r), ink * (0.97 + 0.03 * b.r), letter);

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

/** Write each work's outline (and how far it stands out) for the shadows. */
export function placeFrames(slots: FrameSlots, room: Room, lift: number[]) {
  room.works.forEach((w, i) => {
    slots.uFrame.value[i].set(w.x, w.y, outerW(w) / 2, outerH(w) / 2);
    slots.uFrameZ.value[i] = w.depth + (lift[i] ?? 0);
  });
}

/** The long wall: charcoal plaster painted a colour behind each print, its
 *  name lettered on it, lit only by the spots. */
export function makeWall(shared: Shared, slots: FrameSlots, exhibit: Exhibit, shades: Shades) {
  const geometry = new THREE.PlaneGeometry(40, 7);
  geometry.translate(4, 3.5, 0);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...shared, ...slots, ...exhibit, ...shades.uniforms, uWall: { value: new THREE.Color(0.068, 0.068, 0.071) } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
