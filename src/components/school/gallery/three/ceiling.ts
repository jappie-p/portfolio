import * as THREE from "three";
import { HEAD, LIGHT, NOISE, OUT, VERT } from "./glsl";
import type { Shared } from "./lights";
import { MIRRORED } from "./reflector";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
${OUT}
${LIGHT}
${NOISE}
void main() {
  vec3 p = vWorld;
  vec3 n = vec3(0.0, -1.0, 0.0);
  vec4 a = grain(p.xz * 0.3);
  // near black, so it never reads as a panel behind the copy
  vec3 albedo = vec3(0.016, 0.016, 0.017) * (0.85 + 0.3 * a.g);
  // the lamps' light thrown back up round each can, faint, and what the
  // works give off (the festival's neon reaches up here)
  vec3 light = uAmbient * 2.0 + glows(p, n) * 2.2;
  for (int i = 0; i < SPOTS; i++) {
    vec3 d = uSpotPos[i] - p;
    light += uSpotCol[i] * 0.0012 / (0.3 + dot(d, d));
  }
  emit(albedo * light, 1.0);
}
`;

/** A dark plaster ceiling over the room, which the low view at the entrance
 *  looks up into; the floor shows it too. */
export function makeCeiling(shared: Shared) {
  const geometry = new THREE.PlaneGeometry(40, 12);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(4, 0, 6);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...shared } }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  return mesh;
}
