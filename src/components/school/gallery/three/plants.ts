import * as THREE from "three";
import { outerW, type Room } from "../layout";
import { HEAD, LIGHT, OUT } from "./glsl";
import type { Shared } from "./lights";
import { MIRRORED } from "./reflector";

const SEGMENTS = 8;

const LEAF_VERT = /* glsl */ `${HEAD}
// x along the leaf 0..1, y across it -0.5..0.5
in vec3 position;
// where it grows from (x, y, z) and the way it points (radians round y)
in vec4 aRoot;
// its length and width (m), how steeply it rises and how far it droops
in vec4 aShape;
// its green, and a seed
in vec4 aTint;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vLeaf;
out vec4 vTint;
// the leaf's spine t of the way along: out and up from the pot, arching over
// and drooping toward its tip; a slow sway in the air
vec3 spine(float t, vec2 dir, float sway) {
  float rise = aShape.z - aShape.w * t * t * 1.6;
  float a = aShape.x * t;
  return aRoot.xyz + vec3(dir * a * cos(rise * 0.7), 0.0).xzy + vec3(0.0, a * sin(rise) * 0.8, 0.0) + vec3(sway, 0.0, sway * 0.6) * t * t;
}
void main() {
  float yaw = aRoot.w;
  vec2 dir = vec2(cos(yaw), sin(yaw));
  float sway = 0.012 * sin(uTime * (0.6 + aTint.w) + aTint.w * 20.0);
  float t = position.x;
  vec3 p = spine(t, dir, sway);
  vec3 ahead = spine(min(t + 0.02, 1.0), dir, sway) - spine(max(t - 0.02, 0.0), dir, sway);
  vec3 across = normalize(vec3(-dir.y, 0.0, dir.x));
  // folded a little along its midrib
  vec3 n = normalize(cross(across, ahead));
  vec3 w = p + across * position.y * aShape.y + n * abs(position.y) * aShape.y * 0.25;
  vWorld = w;
  vNormal = n;
  vLeaf = vec2(t, position.y);
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

const LEAF_FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vLeaf;
in vec4 vTint;
uniform vec3 cameraPosition;
${OUT}
${LIGHT}
void main() {
  // a long leaf: widest a third of the way up, to a point at its tip,
  // feathered over a pixel round its edge
  float t = vLeaf.x;
  float wide = 0.5 * pow(sin(3.14159 * pow(t, 0.75)), 0.8);
  float edge = (wide - abs(vLeaf.y)) / max(fwidth(vLeaf.y), 1e-4);
  float a = clamp(edge, 0.0, 1.0);
  if (a < 0.02) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  n *= dot(n, V) < 0.0 ? -1.0 : 1.0;
  // a paler midrib, veins running out from it, darker toward the edge
  float rib = smoothstep(0.06, 0.0, abs(vLeaf.y));
  float veins = 0.5 + 0.5 * sin((t * 26.0 - abs(vLeaf.y) * 14.0) * 3.14159);
  vec3 albedo = vTint.rgb * (0.82 + 0.16 * veins + 0.5 * rib) * mix(1.0, 0.7, abs(vLeaf.y) * 2.0);
  vec3 light = uAmbient * 3.0 + glows(vWorld, n);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    vec3 c = spot(i, vWorld, L);
    // thin: what lights the far side shows through
    light += c * (max(dot(n, L), 0.0) + 0.35 * max(-dot(n, L), 0.0));
  }
  emit(albedo * light, a);
}
`;

const POT_FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 cameraPosition;
${OUT}
${LIGHT}
void main() {
  // dark glazed stoneware: a soft sheen where the light catches it
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 light = uAmbient * 3.0 + glows(vWorld, n);
  vec3 sheen = vec3(0.0);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    vec3 c = spot(i, vWorld, L);
    light += c * max(dot(n, L), 0.0);
    sheen += c * pow(max(dot(n, normalize(L + V)), 0.0), 24.0);
  }
  emit(vec3(0.03, 0.03, 0.032) * light + sheen * 0.05, 1.0);
}
`;

const POT_VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec3 normal;
in mat4 instanceMatrix;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec3 vWorld;
out vec3 vNormal;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/** A plant: where it stands on the floor (x, z), its pot's height (0: it
 *  grows out of the floor, among the ruins), and how big it grows. */
export type Plant = { x: number; z: number; pot: number; size: number };

/** Where the plants stand: between the bench and the ruins at the start,
 *  just past Zelda's slope of blocks, between the next two works and before
 *  the card's corner; and wild ones round the slope's foot. */
export function plantsFor(room: Room): Plant[] {
  const at = (id: string) => room.works.find((w) => w.id === id);
  const [z, k, f, b] = [at("zelda"), at("kiosk"), at("festival"), at("berlijn")];
  if (!z || !k || !f || !b) return [];
  return [
    { x: z.x - 1.55, z: 0.3, pot: 0.36, size: 1.15 },
    { x: (z.x + k.x) / 2 + 0.55, z: 0.3, pot: 0.32, size: 0.95 },
    { x: (k.x + f.x) / 2, z: 0.3, pot: 0.4, size: 1.1 },
    { x: (f.x + outerW(f) / 2 + b.x - outerW(b) / 2) / 2, z: 0.3, pot: 0.34, size: 1.0 },
    { x: z.x - 0.02, z: 0.5, pot: 0, size: 0.5 },
    { x: z.x + 0.3, z: 0.92, pot: 0, size: 0.45 },
    { x: z.x + 1.12, z: 0.86, pot: 0, size: 0.42 },
    { x: z.x + 1.8, z: 0.7, pot: 0, size: 0.55 },
  ];
}

/** Potted plants along the wall: broad arching leaves in a crown over a
 *  dark stoneware pot. Every leaf of every plant in one draw, every pot in
 *  another; lit by the spots and the works' glow, seen in the floor. */
export function makePlants(shared: Shared, plants: Plant[]) {
  let seed = 911;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const roots: number[] = [];
  const shapes: number[] = [];
  const tints: number[] = [];
  const greens = ["#2f6b2a", "#3c7d33", "#285c2b", "#4a8a3a", "#23502a"].map((h) => new THREE.Color(h));
  const potted = plants.filter((p) => p.pot > 0);
  const pots = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 0.78, 1, 20, 1, false).translate(0, 0.5, 0),
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: POT_VERT, fragmentShader: POT_FRAG, uniforms: { ...shared } }),
    potted.length,
  );
  const m = new THREE.Matrix4();
  const radius = (p: Plant) => 0.13 + 0.05 * p.size;
  potted.forEach((p, i) => {
    const r = radius(p);
    pots.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion(), new THREE.Vector3(r, p.pot, r)));
  });
  plants.forEach((p) => {
    const r = radius(p);
    const leaves = Math.round(14 + 10 * p.size);
    for (let k = 0; k < leaves; k++) {
      // round the crown, the inner ones standing taller
      const yaw = (k / leaves) * Math.PI * 2 + rand() * 0.5;
      const inner = rand();
      roots.push(p.x + Math.cos(yaw) * r * 0.3, p.pot - 0.02, p.z + Math.sin(yaw) * r * 0.3, yaw);
      shapes.push((0.32 + 0.42 * rand()) * p.size, (0.07 + 0.09 * rand()) * p.size, 0.6 + 0.8 * inner, 0.5 + 0.6 * rand());
      const c = greens[Math.floor(rand() * greens.length)];
      tints.push(c.r, c.g, c.b, rand());
    }
  });
  pots.instanceMatrix.needsUpdate = true;
  pots.frustumCulled = false;
  pots.layers.enable(MIRRORED);

  const strip = new THREE.PlaneGeometry(1, 1, SEGMENTS, 1).translate(0.5, 0, 0);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(strip.getIndex());
  geometry.setAttribute("position", strip.getAttribute("position"));
  geometry.setAttribute("aRoot", new THREE.InstancedBufferAttribute(new Float32Array(roots), 4));
  geometry.setAttribute("aShape", new THREE.InstancedBufferAttribute(new Float32Array(shapes), 4));
  geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(new Float32Array(tints), 4));
  geometry.instanceCount = roots.length / 4;
  const leaves = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: LEAF_VERT,
      fragmentShader: LEAF_FRAG,
      uniforms: { ...shared },
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  leaves.frustumCulled = false;
  leaves.layers.enable(MIRRORED);
  leaves.renderOrder = 1;
  const group = new THREE.Group();
  group.add(pots, leaves);
  return group;
}
