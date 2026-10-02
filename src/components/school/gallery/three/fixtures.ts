import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HEAD, OUT, VERT } from "./glsl";
import { TRACK, type Shared, type Spot } from "./lights";

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
${OUT}
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = (exp(-d * d * 14.0) + 0.18 * exp(-d * d * 3.5)) * smoothstep(1.0, 0.6, d);
  glow(vec3(1.0, 0.85, 0.66) * a * uLevel * 0.5);
}
`;

/** Where a can hangs: its mouth at the spot, turned down its beam. */
function can(s: Spot) {
  const g = new THREE.CylinderGeometry(0.042, 0.05, 0.17, 18, 1, false);
  g.translate(0, 0.085, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir.clone().negate()));
  g.translate(s.pos.x, s.pos.y, s.pos.z);
  // the stem up to the track, from the can's middle
  const mid = s.pos.clone().addScaledVector(s.dir, -0.085);
  const top = new THREE.Vector3(mid.x, TRACK.y + 0.04, TRACK.z);
  const stem = new THREE.CylinderGeometry(0.009, 0.009, top.distanceTo(mid), 6, 1, true);
  stem.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(mid).normalize()));
  stem.translate((top.x + mid.x) / 2, (top.y + mid.y) / 2, (top.z + mid.z) / 2);
  return [g, stem];
}

/**
 * The lighting track along the ceiling and a can on it for every spot, with
 * a soft glow at each lamp's mouth (it follows the lamp's power and hover).
 * The cans are one draw; the rail, a long thin line across the view, is a
 * ribbon feathered at its edges, since there is no multisampling.
 */
export function makeFixtures(shared: Shared, spots: Spot[], from: number, to: number) {
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
  rail.position.set((from + to) / 2, TRACK.y + 0.055, TRACK.z);
  rail.frustumCulled = false;
  const parts = spots.filter((s) => s.power > 0).flatMap(can);
  const geometry = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  const metal = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: METAL, uniforms: { ...shared } }),
  );
  metal.frustumCulled = false;

  const card = new THREE.PlaneGeometry(1, 1);
  const glows = spots.map((s) => {
    const level = { value: 0 };
    const m = new THREE.Mesh(
      card,
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        uniforms: { ...shared, uLevel: level, uSize: { value: s.work < 0 ? 0.3 : 0.42 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    m.position.copy(s.pos).addScaledVector(s.dir, 0.03);
    m.frustumCulled = false;
    m.renderOrder = 4;
    return { mesh: m, level };
  });
  const group = new THREE.Group();
  group.add(rail, metal, ...glows.map((g) => g.mesh));
  return { group, glows };
}

export type Fixtures = ReturnType<typeof makeFixtures>;
