import * as THREE from "three";
import { HEAD, NOISE, OUT, VERT } from "./glsl";
import type { Shared, Spot } from "./lights";
import { MIRRORED } from "./reflector";
import type { FrameSlots } from "./wall";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
uniform vec3 cameraPosition;
uniform vec3 uApex;
uniform vec3 uLamp;
uniform vec3 uAxis;
uniform vec2 uCone;
uniform vec2 uEdge;
uniform vec3 uColor;
uniform float uTime;
uniform vec4 uFrame[4];
${OUT}
${NOISE}
#define STEPS 6
float box(vec2 p, vec4 f) {
  vec2 e = abs(p - f.xy) - f.zw;
  return length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
}
void main() {
  // the cone runs on into the wall and the floor: only the air in front shows
  if (vWorld.z < 0.0 || vWorld.y < 0.0) discard;
  vec3 ro = cameraPosition;
  vec3 rd = vWorld - ro;
  float t0 = length(rd);
  rd /= t0;
  // the ray came into the cone here: where it leaves again (the far root on
  // the lit side of the apex), or meets the wall or the floor first
  vec3 co = ro - uApex;
  float c2 = uCone.x * uCone.x;
  float dv = dot(rd, uAxis);
  float cv = dot(co, uAxis);
  float qa = dv * dv - c2;
  qa = abs(qa) < 1e-5 ? 1e-5 : qa;
  float qb = dv * cv - c2 * dot(rd, co);
  float qc = cv * cv - c2 * dot(co, co);
  float root = sqrt(max(qb * qb - qa * qc, 0.0));
  float t1 = 1e3;
  float ta = (-qb - root) / qa;
  float tb = (-qb + root) / qa;
  if (ta > t0 + 1e-3 && dot(co + rd * ta, uAxis) > 0.0) t1 = min(t1, ta);
  if (tb > t0 + 1e-3 && dot(co + rd * tb, uAxis) > 0.0) t1 = min(t1, tb);
  if (rd.z < 0.0) t1 = min(t1, -ro.z / rd.z);
  if (rd.y < 0.0) t1 = min(t1, -ro.y / rd.y);
  t1 = clamp(t1, t0, t0 + 6.0);

  // the spot's light gathered along that chord: strong by the lamp, through
  // slow drifting haze, its edge a little crisper than the wash it leaves on
  // the wall (a lens spot's beam, read in the air). The chord thins to
  // nothing at the silhouette, so the cone keeps an edge without a seam.
  float len = t1 - t0;
  float sum = 0.0;
  for (int k = 0; k < STEPS; k++) {
    vec3 q = ro + rd * (t0 + len * (float(k) + 0.5) / float(STEPS));
    vec3 d = q - uLamp;
    float r2 = dot(d, d);
    float c = smoothstep(uEdge.x, uEdge.y, dot(d, uAxis) * inversesqrt(r2));
    float haze = 0.5 + 0.65 * grain(q.xy * vec2(0.42, 0.2) + q.z * 0.27 + vec2(uTime * 0.011, -uTime * 0.006)).g;
    sum += c * c * haze / (r2 + 0.1);
  }
  // the air in front of a print stays clear, so the work keeps its blacks
  vec2 hit = ro.xy + rd.xy * (ro.z / max(-rd.z, 1e-3));
  float clear = 1.0;
  for (int w = 0; w < 4; w++) clear = min(clear, smoothstep(-0.05, 0.25, box(hit, uFrame[w])));
  glow(uColor * sum * (len / float(STEPS)) * mix(0.2, 1.0, clear));
}
`;

/** A spot's cone of light through the haze, from the lamp's mouth to the
 *  wall: additive, lit along its depth, fading into the wall and the floor. */
export function makeBeam(shared: Shared, slots: FrameSlots, s: Spot, strength: number) {
  const rad = Math.PI / 180;
  const tan = Math.tan(s.outer * rad);
  const mouth = 0.03;
  // the cone's tip sits just behind the lamp, so its sides meet the mouth
  const back = mouth / tan;
  const len = (s.pos.z / Math.max(-s.dir.z, 0.05)) * 1.4;
  const geometry = new THREE.CylinderGeometry(mouth, (len + back) * tan, len, 48, 1, true);
  geometry.translate(0, -len / 2, 0);
  const color = new THREE.Vector3(1, 0.86, 0.7).multiplyScalar(strength);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      ...shared,
      uFrame: slots.uFrame,
      uApex: { value: s.pos.clone().addScaledVector(s.dir, -back) },
      uLamp: { value: s.pos.clone() },
      uAxis: { value: s.dir.clone() },
      uCone: { value: new THREE.Vector2(Math.cos(s.outer * rad), Math.cos(s.inner * rad)) },
      uEdge: { value: new THREE.Vector2(Math.cos(s.outer * rad), Math.cos(Math.max(s.outer * 0.7, s.inner) * rad)) },
      uColor: { value: color },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(s.pos);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), s.dir);
  mesh.layers.enable(MIRRORED);
  mesh.renderOrder = 2;
  return { mesh, color, base: strength };
}

export type Beam = ReturnType<typeof makeBeam>;
