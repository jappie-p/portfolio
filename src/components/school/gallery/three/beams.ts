import * as THREE from "three";
import { HEAD, NOISE, OUT, VERT } from "./glsl";
import type { Shared, Spot } from "./lights";
import { MIRRORED } from "./reflector";
import type { FrameSlots } from "./wall";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 cameraPosition;
uniform vec3 uApex;
uniform vec3 uAxis;
uniform vec3 uColor;
uniform float uTime;
uniform vec4 uFrame[4];
${OUT}
${NOISE}
float box(vec2 p, vec4 f) {
  vec2 e = abs(p - f.xy) - f.zw;
  return length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
}
void main() {
  // the cone runs on into the wall and the floor: only the air in front shows
  if (vWorld.z < 0.0 || vWorld.y < 0.0) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  float along = max(dot(vWorld - uApex, uAxis), 0.0);
  // the chord through the cone thins to nothing at its silhouette
  float body = pow(abs(dot(normalize(vNormal), V)), 1.7);
  // the light spreads as it travels; no hard tip at the lamp, no seam at the wall
  float fall = 1.0 / (0.3 + along * 1.1);
  float ends = smoothstep(0.05, 0.6, along) * smoothstep(0.0, 0.45, vWorld.z) * smoothstep(0.0, 0.3, vWorld.y);
  // slow haze drifting through it
  float haze = 0.62 + 0.55 * grain(vWorld.xy * vec2(0.5, 0.22) + vec2(uTime * 0.011, -uTime * 0.006)).g;
  // the air in front of a print stays clear, so the work keeps its blacks
  vec3 ray = vWorld - cameraPosition;
  vec2 hit = cameraPosition.xy + ray.xy * (cameraPosition.z / max(cameraPosition.z - vWorld.z, 1e-3));
  float clear = 1.0;
  for (int w = 0; w < 4; w++) clear = min(clear, smoothstep(-0.05, 0.25, box(hit, uFrame[w])));
  glow(uColor * body * fall * ends * haze * mix(0.12, 1.0, clear));
}
`;

/** Faint beams of light from each spot to the wall, as if the air held a
 *  little dust: additive, soft at the edges, fading into the wall. */
export function makeBeam(shared: Shared, slots: FrameSlots, s: Spot, strength: number) {
  const along = s.pos.z / Math.max(-s.dir.z, 0.05);
  const len = along * 1.35;
  const r = len * Math.tan((s.outer * 0.82 * Math.PI) / 180);
  const geometry = new THREE.CylinderGeometry(0.035, r, len, 48, 1, true);
  geometry.translate(0, -len / 2, 0);
  const color = new THREE.Vector3(1, 0.86, 0.7).multiplyScalar(strength);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...shared, uFrame: slots.uFrame, uApex: { value: s.pos.clone() }, uAxis: { value: s.dir.clone() }, uColor: { value: color } },
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
