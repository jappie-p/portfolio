import * as THREE from "three";
import { HEAD, LIGHT, NOISE, OUT } from "./glsl";
import type { Shared } from "./lights";
import type { Reflector } from "./reflector";

const VERT = /* glsl */ `${HEAD}
in vec3 position;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 uMirror;
out vec3 vWorld;
out vec4 vMirror;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vMirror = uMirror * w;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec4 vMirror;
uniform vec3 cameraPosition;
uniform sampler2D uSharp;
uniform sampler2D uSoft;
uniform vec3 uFloor;
${OUT}
${LIGHT}
${NOISE}
void main() {
  vec3 p = vWorld;
  vec3 V = normalize(cameraPosition - p);
  vec4 a = grain(p.xz * 0.21);
  vec4 b = grain(p.xz * 1.3 + 0.5);
  vec4 w = grain(p.xz * 0.045 + 0.2);

  // polished concrete: the reflection sways a little with the surface
  vec2 uv = vMirror.xy / vMirror.w + (vec2(w.b, w.a) - 0.5) * 0.0025;
  vec3 sharp = texture(uSharp, uv).rgb;
  vec3 soft = texture(uSoft, uv).rgb;
  // sharp where the wall meets the floor, glossier further out, in patches
  float haze = clamp(smoothstep(0.0, 2.4, p.z) * 0.9 + (a.g - 0.5) * 0.35 + 0.08, 0.0, 1.0);
  vec3 mirror = mix(sharp, soft, haze) * mix(1.0, 0.55, smoothstep(0.5, 4.0, p.z));
  float fresnel = 0.05 + 0.95 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);

  // what the spots spill onto the floor, and a whisper of bounce off the wall
  vec3 light = uAmbient;
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    vec3 c = spot(i, p, L);
    light += c * max(L.y, 0.0);
  }
  vec3 albedo = uFloor * (0.82 + 0.3 * a.r + 0.1 * b.g);
  vec3 col = albedo * light + mirror * mix(0.16, 0.6, fresnel) * (0.85 + 0.2 * a.r);
  emit(col, 1.0);
}
`;

/** The floor: dark polished concrete reflecting the wall, sharp at the
 *  skirting and blurring into streaks further out. */
export function makeFloor(shared: Shared, reflector: Reflector) {
  const geometry = new THREE.PlaneGeometry(40, 16);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(4, 0, 8);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      ...shared,
      uMirror: { value: reflector.matrix },
      uSharp: { value: reflector.sharp.texture },
      uSoft: { value: reflector.soft.texture },
      uFloor: { value: new THREE.Color(0.05, 0.048, 0.046) },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
