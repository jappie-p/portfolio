import * as THREE from "three";
import { HEAD, LIGHT, OUT } from "./glsl";
import type { Shared, Spot } from "./lights";

const VERT = /* glsl */ `${HEAD}
in vec4 aSeed;
in vec4 aBase;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uPx;
uniform float uHaze;
${LIGHT}
out float vLight;
void main() {
  // each mote hovers round its own spot in the beam, slowly turning over
  float t = uTime * (0.6 + aSeed.w * 0.8);
  vec3 p = aBase.xyz + vec3(sin(t * 0.21 + aSeed.x * 40.0), sin(t * 0.13 + aSeed.y * 40.0) - 0.4 * fract(t * 0.004 + aSeed.z), sin(t * 0.17 + aSeed.z * 40.0)) * 0.12;
  vec3 L;
  vec3 c = spot(int(aBase.w), p, L);
  float flake = 0.25 + 0.75 * pow(abs(sin(t * (0.9 + aSeed.y) + aSeed.x * 20.0)), 3.0);
  // no glare of motes right at the lamp, where the light is fiercest
  float lamp = smoothstep(0.6, 1.4, distance(p, uSpotPos[int(aBase.w)]));
  vLight = min(dot(c, vec3(0.33)), 2.5) * lamp * flake * step(0.02, p.z) * step(0.0, p.y) * uHaze;
  vec4 view = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp((0.006 + aSeed.w * 0.006) * uPx / -view.z, 1.5, 7.0);
}
`;

const FRAG = /* glsl */ `${HEAD}
in float vLight;
${OUT}
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  glow(vec3(1.0, 0.9, 0.78) * vLight * a * a * 0.07);
}
`;

/** Dust drifting in the beams, catching the light only where the light is. */
export function makeDust(shared: Shared, spots: Spot[], perSpot = 70) {
  const seeds: number[] = [];
  const bases: number[] = [];
  let r = 12345;
  const rand = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  spots.forEach((s, i) => {
    if (s.power <= 0 || s.work < 0) return;
    u.crossVectors(s.dir, new THREE.Vector3(0, 0, 1)).normalize();
    v.crossVectors(s.dir, u).normalize();
    const reach = (s.pos.z / Math.max(-s.dir.z, 0.05)) * 0.95;
    const tan = Math.tan((s.outer * 0.8 * Math.PI) / 180);
    for (let k = 0; k < perSpot; k++) {
      const along = 0.35 + (reach - 0.35) * Math.sqrt(rand());
      const rad = Math.sqrt(rand()) * along * tan;
      const a = rand() * Math.PI * 2;
      const p = s.pos.clone().addScaledVector(s.dir, along).addScaledVector(u, Math.cos(a) * rad).addScaledVector(v, Math.sin(a) * rad);
      bases.push(p.x, p.y, p.z, i);
      seeds.push(rand(), rand(), rand(), rand());
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("aBase", new THREE.Float32BufferAttribute(bases, 4));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 4));
  // positions are computed in the shader; three only needs a count
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(bases.length * 0.75), 3));
  const uPx = { value: 1000 };
  const uHaze = { value: 1 };
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...shared, uPx, uHaze },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  return { points, uPx, uHaze };
}
