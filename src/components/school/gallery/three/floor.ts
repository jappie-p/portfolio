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
  vec4 pool = grain(p.xz * 0.11 + 0.37);

  // big stone tiles, their seams a hair darker and drier (a pixel wide at most)
  vec2 cell = abs(fract(p.xz / 0.9 + 0.5) - 0.5) * 0.9;
  float d = min(cell.x, cell.y);
  float seam = 1.0 - clamp((d - 0.0025) / max(fwidth(d), 1e-5), 0.0, 1.0);
  // wet: in patches it lies as a sheet of water, a near mirror; elsewhere
  // damp, the reflection drawn out into streaks
  float wet = smoothstep(0.36, 0.56, pool.g);
  vec2 uv = vMirror.xy / vMirror.w + (vec2(w.b, w.a) - 0.5) * mix(0.003, 0.0008, wet);
  vec3 sharp = texture(uSharp, uv).rgb;
  vec3 soft = texture(uSoft, uv).rgb;
  float haze = clamp(mix(0.55 + 0.4 * smoothstep(0.0, 2.6, p.z) + (a.g - 0.5) * 0.3, 0.3, wet * 0.85), 0.0, 1.0);
  vec3 mirror = mix(sharp, soft, haze) * mix(1.0, 0.6, smoothstep(1.0, 6.0, p.z));
  float fresnel = 0.05 + 0.95 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
  float gloss = mix(0.55, 1.0, fresnel) * mix(0.72, 1.0, wet) * (1.0 - 0.55 * seam);

  // what the spots spill onto the floor, and what the works give off
  vec3 light = uAmbient + glows(p, vec3(0.0, 1.0, 0.0));
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    vec3 c = spot(i, p, L);
    light += c * max(L.y, 0.0);
  }
  vec3 albedo = uFloor * (0.82 + 0.3 * a.r + 0.1 * b.g) * (1.0 - 0.35 * wet) * (1.0 - 0.3 * seam);
  vec3 col = albedo * light + mirror * gloss * (1.05 + 0.15 * a.r);
  emit(col, 1.0);
}
`;

/** The floor: dark wet stone in big tiles, reflecting the room strongly,
 *  sharp in its puddles and drawn out into long streaks elsewhere. */
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
      uFloor: { value: new THREE.Color(0.04, 0.037, 0.034) },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
