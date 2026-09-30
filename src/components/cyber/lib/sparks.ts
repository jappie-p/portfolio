import * as THREE from "three";
import { mulberry32 } from "./rng";
import type { SceneUniforms } from "./uniforms";

// Stateless GPU sparks: every particle is a pure function of time, so there is
// zero per-frame CPU work. Each one is a short streak (head + lagging tail).

export function buildSparkGeometry(count: number, groups: number) {
  const rnd = mulberry32(1337);
  const rand = new Float32Array(count * 2 * 4);
  const rank = new Float32Array(count * 2);
  const end = new Float32Array(count * 2);
  const group = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const r = [rnd(), rnd(), rnd(), rnd()];
    const k = rnd();
    const g = i % groups;
    for (let e = 0; e < 2; e++) {
      const v = i * 2 + e;
      rand.set(r, v * 4);
      rank[v] = k;
      end[v] = e;
      group[v] = g;
    }
  }
  const geo = new THREE.BufferGeometry();
  // position is unused by the shader, but three needs it for the draw range
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
  geo.setAttribute("aRank", new THREE.BufferAttribute(rank, 1));
  geo.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
  geo.setAttribute("aGroup", new THREE.BufferAttribute(group, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  return geo;
}

const VERT = /* glsl */ `
uniform float uTime;
uniform vec4 uImpacts[3];
uniform vec3 uNormal;
uniform vec3 uAlong;
attribute vec4 aRand;
attribute float aRank;
attribute float aEnd;
attribute float aGroup;
varying float vAlpha;
varying float vEnd;
vec3 hash3(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.xxy + p.yzz) * p.zyx);
}
void main() {
  int g = int(aGroup + 0.5);
  vec4 imp = uImpacts[g];
  float life = mix(0.35, 1.05, aRand.x);
  float t = uTime + aRand.y * 17.0;
  float cycle = floor(t / life);
  float age = t - cycle * life;
  vec3 r = hash3(vec3(aRand.z * 91.7, aRand.w * 53.3, cycle * 0.618));
  vec3 dir = normalize(
    uNormal * (0.25 + r.x * 1.2) +
    uAlong * (r.y * 2.0 - 0.8) * 1.4 +
    vec3(0.0, 1.0, 0.0) * (r.z * 2.0 - 0.8) * 1.3
  );
  float speed = mix(1.6, 7.5, hash3(r * 3.1).x);
  float ta = max(age - aEnd * (0.026 + 0.011 * speed), 0.0);
  float drag = 2.2;
  vec3 pos = imp.xyz + dir * speed * (1.0 - exp(-drag * ta)) / drag;
  pos.y -= 2.4 * ta * ta;
  pos.y = max(pos.y, 0.015);
  float heat = clamp(imp.w, 0.0, 1.2);
  float fade = 1.0 - age / life;
  vAlpha = fade * fade * step(aRank, heat * 0.85) * min(heat * 1.3, 1.0);
  vEnd = aEnd;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
`;

const FRAG = /* glsl */ `
varying float vAlpha;
varying float vEnd;
void main() {
  vec3 head = vec3(1.0, 0.8, 0.62) * 5.0;
  vec3 tail = vec3(1.0, 0.1, 0.08) * 1.4;
  gl_FragColor = vec4(mix(head, tail, vEnd) * vAlpha, 1.0);
}
`;

export function createSparkMaterial(u: SceneUniforms, normal: THREE.Vector3, along: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: u.uTime,
      uImpacts: u.uImpacts,
      uNormal: { value: normal },
      uAlong: { value: along },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
