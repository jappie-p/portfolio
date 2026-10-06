import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HEAD, OUT, VERT } from "./glsl";
import type { Shared, Spot } from "./lights";

type Track = { y: number; z: number };
import { MIRRORED } from "./reflector";

const METAL = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 cameraPosition;
${OUT}
void main() {
  // black anodised housings: almost nothing, a soft rim where they turn away
  vec3 n = normalize(vNormal);
  float rim = pow(1.0 - abs(dot(n, normalize(cameraPosition - vWorld))), 3.0);
  emit(vec3(0.008, 0.008, 0.009) + vec3(0.045, 0.042, 0.038) * rim, 1.0);
}
`;

const RAIL_VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform float uWidth;
out vec2 vUv;
void main() {
  // a ribbon along the rail that always turns its face to the eye
  vUv = uv;
  vec4 w = modelMatrix * vec4(position.x, 0.0, 0.0, 1.0);
  vec3 across = normalize(cross(vec3(1.0, 0.0, 0.0), cameraPosition - w.xyz));
  w.xyz += across * (uv.y - 0.5) * uWidth;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const RAIL_FRAG = /* glsl */ `${HEAD}
in vec2 vUv;
${OUT}
void main() {
  // feathered over a pixel at both edges: a thin line that never stairs
  float d = 0.5 - abs(vUv.y - 0.5);
  float a = clamp(d / max(fwidth(vUv.y), 1e-4), 0.0, 1.0);
  // the room's light on its underside, a sheen along the lower edge
  vec3 col = mix(vec3(0.01), vec3(0.05, 0.047, 0.043), smoothstep(0.35, 0.05, vUv.y));
  emit(col, a);
}
`;

const GLOW_VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uSize;
out vec2 vUv;
void main() {
  // a card that always faces the eye, at the lamp's mouth
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}
`;

const GLOW_FRAG = /* glsl */ `${HEAD}
in vec2 vUv;
uniform float uLevel;
uniform vec3 uTint;
${OUT}
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = (exp(-d * d * 14.0) + 0.18 * exp(-d * d * 3.5)) * smoothstep(1.0, 0.6, d);
  // the lamp's own white at its heart, its colour round it
  glow(mix(vec3(1.0, 0.92, 0.82), uTint, smoothstep(0.05, 0.5, d)) * a * uLevel * 0.5);
}
`;

/** Where a can hangs: its mouth at the spot, turned down its beam. */
function can(s: Pick<Spot, "pos" | "dir">, track: Track) {
  const g = new THREE.CylinderGeometry(0.042, 0.05, 0.17, 18, 1, false);
  g.translate(0, 0.085, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir.clone().negate()));
  g.translate(s.pos.x, s.pos.y, s.pos.z);
  // the stem up to the track, from the can's middle
  const mid = s.pos.clone().addScaledVector(s.dir, -0.085);
  const top = new THREE.Vector3(mid.x, track.y + 0.04, track.z);
  const stem = new THREE.CylinderGeometry(0.009, 0.009, top.distanceTo(mid), 6, 1, true);
  stem.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(mid).normalize()));
  stem.translate((top.x + mid.x) / 2, (top.y + mid.y) / 2, (top.z + mid.z) / 2);
  return [g, stem];
}

/** The lamps the track carries between the works: lit, but aimed low at the
 *  wall's foot, so they read as a row of points running off down the room
 *  (and again in the wet floor) without lighting anything the eye follows.
 *  Every `step` metres, clear of the spots' own cans. */
function spares(spots: Spot[], track: Track, from: number, to: number, step = 1.15) {
  const lit = spots.filter((s) => s.power > 0).map((s) => s.pos.x);
  const out: Pick<Spot, "pos" | "dir">[] = [];
  for (let x = from + step / 2; x < to; x += step) {
    if (lit.some((l) => Math.abs(l - x) < 0.55)) continue;
    const pos = new THREE.Vector3(x, track.y, track.z);
    out.push({ pos, dir: new THREE.Vector3(0, 0.6 - track.y, -track.z).normalize() });
  }
  return out;
}

/**
 * The lighting track along the ceiling and a can on it for every spot, with
 * a soft glow at each lamp's mouth (it follows the lamp's power and hover);
 * spare lamps fill the track between them.
 * The cans are one draw; the rail, a long thin line across the view, is a
 * ribbon feathered at its edges, since there is no multisampling.
 */
export function makeFixtures(shared: Shared, spots: Spot[], track: Track, from: number, to: number, withSpares = true) {
  const rail = new THREE.Mesh(
    new THREE.PlaneGeometry(to - from, 1, 64, 1),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: RAIL_VERT,
      fragmentShader: RAIL_FRAG,
      uniforms: { ...shared, uWidth: { value: 0.036 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  rail.position.set((from + to) / 2, track.y + 0.055, track.z);
  rail.frustumCulled = false;
  const spare = withSpares ? spares(spots, track, from, to) : [];
  // the downlight by the way in is set into the ceiling: no can
  const parts = [...spots.filter((s) => s.power > 0 && s.work >= 0), ...spare].flatMap((s) => can(s, track));
  const geometry = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  const metal = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: METAL, uniforms: { ...shared } }),
  );
  metal.frustumCulled = false;

  const card = new THREE.PlaneGeometry(1, 1);
  const shine = (level: { value: number }, tint: THREE.Color, size: number) =>
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: { ...shared, uLevel: level, uTint: { value: tint }, uSize: { value: size } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  const lamp = (s: Pick<Spot, "pos" | "dir">, material: THREE.RawShaderMaterial) => {
    const m = new THREE.Mesh(card, material);
    m.position.copy(s.pos).addScaledVector(s.dir, 0.03);
    m.frustumCulled = false;
    m.renderOrder = 4;
    return m;
  };
  const glows = spots.map((s) => {
    const level = { value: 0 };
    return { mesh: lamp(s, shine(level, s.color.clone(), s.work < 0 ? 0.24 : 0.3)), level };
  });
  // the spares share one glow, which comes on with the room and goes down with it
  const spareLevel = { value: 0 };
  const spareShine = shine(spareLevel, new THREE.Color(1.0, 0.78, 0.52), 0.24);
  const group = new THREE.Group();
  group.add(rail, metal, ...glows.map((g) => g.mesh), ...spare.map((s) => lamp(s, spareShine)));
  // the wet floor shows the lamps back, warm spots in the foreground
  group.children.forEach((o) => o.layers.enable(MIRRORED));
  return { group, glows, spareLevel };
}

export type Fixtures = ReturnType<typeof makeFixtures>;
