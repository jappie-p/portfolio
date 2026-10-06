import * as THREE from "three";
import { HEAD, LIGHT, OUT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";

/** A vine: the points it grows through (m, in its set's space), how big its
 *  leaves grow, how thickly, and whether it hangs over the picture (those
 *  leaves go as the project takes over). */
export type Vine = { path: readonly (readonly [number, number, number])[]; size: number; density: number; over?: boolean };

const VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec2 uv;
// where the leaf is and how big
in vec4 aAt;
// how it is turned, a quaternion
in vec4 aTurn;
// its green, and 1 if it hangs over the picture
in vec4 aTint;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec4 vTint;
vec3 rotate(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}
void main() {
  // stirring a little in the air
  float stir = 0.06 * sin(uTime * 0.9 + aAt.x * 13.0 + aAt.y * 7.0);
  vec3 local = rotate(aTurn, vec3(position.xy * aAt.w, position.y * aAt.w * stir));
  vec4 w = modelMatrix * vec4(aAt.xyz + local, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * rotate(aTurn, vec3(0.0, 0.0, 1.0)));
  vUv = uv;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
in vec4 vTint;
uniform vec3 cameraPosition;
uniform float uFade;
${OUT}
${LIGHT}
void main() {
  // an ivy leaf: three lobes, the middle one longest, on a short stalk;
  // feathered over a pixel round its edge
  vec2 p = (vUv - vec2(0.5, 0.42)) * 2.0;
  float a = atan(p.x, p.y);
  float r = 0.5 + 0.22 * cos(3.0 * a) + 0.12 * cos(a);
  float d = r - length(p);
  float cover = clamp(d / max(fwidth(d), 1e-4), 0.0, 1.0) * (vTint.a > 0.5 ? uFade : 1.0);
  if (cover < 0.02) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  n *= dot(n, V) < 0.0 ? -1.0 : 1.0;
  // pale veins from the stalk out to each lobe, a waxy sheen
  float vein = smoothstep(0.05, 0.0, abs(sin(a * 1.5)) * length(p)) * smoothstep(0.9, 0.2, length(p));
  vec3 albedo = vTint.rgb * (1.0 + 0.6 * vein);
  vec3 light = uAmbient * 3.0 + glows(vWorld, n);
  vec3 sheen = vec3(0.0);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    vec3 c = spot(i, vWorld, L);
    light += c * (max(dot(n, L), 0.0) + 0.3 * max(-dot(n, L), 0.0));
    sheen += c * pow(max(dot(n, normalize(L + V)), 0.0), 30.0);
  }
  emit(albedo * light + sheen * 0.04, cover);
}
`;

/** Point t (0..1) along a vine's path, by straight runs between its points. */
function along(path: Vine["path"], t: number, out: THREE.Vector3) {
  const n = path.length - 1;
  const f = Math.min(t * n, n - 1e-6);
  const i = Math.floor(f);
  const a = path[i];
  const b = path[i + 1];
  const k = f - i;
  return out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
}

/** Leaves along the vines: in pairs and small clusters, facing out from the
 *  wall at all angles, of a few greens. */
function leaves(vines: Vine[]) {
  let seed = 4421;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const greens = ["#2a5524", "#336a2b", "#3f7d33", "#22461f", "#4b8a3a"].map((h) => new THREE.Color(h));
  const at: number[] = [];
  const turn: number[] = [];
  const tint: number[] = [];
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const v of vines) {
    let length = 0;
    for (let i = 1; i < v.path.length; i++) length += Math.hypot(v.path[i][0] - v.path[i - 1][0], v.path[i][1] - v.path[i - 1][1], v.path[i][2] - v.path[i - 1][2]);
    const count = Math.round((length / 0.03) * v.density);
    for (let k = 0; k < count; k++) {
      along(v.path, (k + rand()) / count, p);
      const s = v.size * (0.6 + 0.6 * rand());
      p.x += (rand() - 0.5) * s * 1.4;
      p.y += (rand() - 0.5) * s * 1.4;
      p.z += rand() * s * 0.5;
      e.set((rand() - 0.5) * 1.3, (rand() - 0.5) * 1.3, (rand() - 0.5) * Math.PI * 1.6);
      q.setFromEuler(e);
      at.push(p.x, p.y, p.z, s);
      turn.push(q.x, q.y, q.z, q.w);
      const c = greens[Math.floor(rand() * greens.length)];
      tint.push(c.r, c.g, c.b, v.over ? 1 : 0);
    }
  }
  return { at, turn, tint };
}

/** Ivy over the vines' paths: every leaf one instance of a card, cut to an
 *  ivy leaf in the shader, lit by the spots and the works' glow. */
export function makeIvy(shared: Shared, vines: Vine[]) {
  const { at, turn, tint } = leaves(vines);
  const card = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.setIndex(card.getIndex());
  g.setAttribute("position", card.getAttribute("position"));
  g.setAttribute("uv", card.getAttribute("uv"));
  g.setAttribute("aAt", new THREE.InstancedBufferAttribute(new Float32Array(at), 4));
  g.setAttribute("aTurn", new THREE.InstancedBufferAttribute(new Float32Array(turn), 4));
  g.setAttribute("aTint", new THREE.InstancedBufferAttribute(new Float32Array(tint), 4));
  g.instanceCount = at.length / 4;
  const fade = { value: 1 };
  const mesh = new THREE.Mesh(
    g,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, uFade: fade },
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  mesh.frustumCulled = false;
  mesh.layers.enable(MIRRORED);
  mesh.renderOrder = 1;
  return { mesh, fade };
}
