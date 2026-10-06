import * as THREE from "three";
import { HEAD, LIGHT, NOISE, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";
import { CAST_GLSL, asCaster, casterMaterial, type Shades } from "../shadows";

/** A stone: its centre and size (m, in its set's space) and its tilt about x, y and z. */
export type Stone = { at: readonly [number, number, number]; size: readonly [number, number, number]; turn?: readonly [number, number, number] };

const PLACE = /* glsl */ `
in vec3 position;
in vec3 normal;
in mat4 instanceMatrix;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
`;

const VERT = /* glsl */ `${HEAD}
${PLACE}
in float aTone;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vLocal;
out vec3 vSize;
out float vTone;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  mat3 m = mat3(modelMatrix) * mat3(instanceMatrix);
  vSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vNormal = normalize(m * (normal / vSize));
  vLocal = position;
  vTone = aTone;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec3 vLocal;
in vec3 vSize;
in float vTone;
${OUT}
${LIGHT}
${NOISE}
void main() {
  // weathered stone, each block its own shade: pitted (the light rakes the
  // pits), its edges worn pale and rounded off into dark joints, moss in
  // what faces up
  vec3 q = vLocal * vSize;
  vec4 a = grain(q.xy * 3.1 + q.z * 2.3 + vTone);
  vec4 b = grain(q.zy * 9.0 + q.x * 5.0 + 0.4);
  vec3 n = normalize(vNormal);
  vec3 t = normalize(cross(n, abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
  n = normalize(n + (t * (b.b - 0.5) + cross(n, t) * (b.a - 0.5)) * 0.9 + (t * (a.b - 0.5) + cross(n, t) * (a.a - 0.5)) * 0.5);
  // how far this pixel is from the nearest edge of the face it is on
  vec3 edge = (0.5 - abs(vLocal)) * vSize;
  vec3 m = abs(vLocal);
  float d = m.x > m.y && m.x > m.z ? min(edge.y, edge.z) : m.y > m.z ? min(edge.x, edge.z) : min(edge.x, edge.y);
  float worn = mix(0.25, 1.0, smoothstep(0.0, 0.007, d)) * mix(1.3, 1.0, smoothstep(0.007, 0.03, d));
  vec3 stone = mix(vec3(0.158, 0.146, 0.128), vec3(0.122, 0.12, 0.114), vTone) * (0.4 + 0.95 * a.g + 0.3 * b.r) * worn;
  // moss thick on what faces up, in patches down the sides, and in the joints
  float up = normalize(vNormal).y;
  float moss = smoothstep(0.0, 0.75, up * 0.9 + (a.r - 0.5) * 1.2 + 0.3 * (1.0 - smoothstep(0.0, 0.02, d))) * smoothstep(0.34, 0.62, b.g + 0.2);
  vec3 albedo = mix(stone, vec3(0.04, 0.16, 0.025) * (0.6 + 0.8 * b.r), moss);
  vec3 light = uAmbient * 4.0 + glows(vWorld, n);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    light += spot(i, vWorld, L) * max(dot(n, L), 0.0);
  }
  emit(albedo * light, 1.0);
}
`;

const CAST_VERT = /* glsl */ `${HEAD}
${PLACE}
${LIGHT}
${CAST_GLSL}
uniform int uWork;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = fromLamp(uWork, w.xyz, 0.9);
}
`;

/** Crumbling stone round a work: every block one instance, lit by the
 *  spots and the works' glow, seen in the floor, shading the wall behind. */
export function makeRuins(shared: Shared, shades: Shades["uniforms"], work: number, stones: Stone[]) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  // a shade of its own for every block
  box.setAttribute("aTone", new THREE.InstancedBufferAttribute(Float32Array.from(stones, (_, i) => (i * 0.618034) % 1), 1));
  const mesh = new THREE.InstancedMesh(
    box,
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...shared } }),
    stones.length,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  stones.forEach((s, i) => {
    e.set(...(s.turn ?? [0, 0, 0]));
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...s.at), q.setFromEuler(e), new THREE.Vector3(...s.size)));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  // the same blocks again for the shadow pass, sharing their placings
  const shadow = asCaster(new THREE.InstancedMesh(box, casterMaterial(CAST_VERT, { ...shared, ...shades, uWork: { value: work } }), stones.length));
  shadow.instanceMatrix = mesh.instanceMatrix;
  return { mesh, shadow };
}
