import * as THREE from "three";
import { HASH_GLSL } from "./glsl";
import type { SceneUniforms } from "./uniforms";

// Holographic HUD surfaces. Lines are drawn with screen-space derivatives so
// the borders stay about 1.5 device pixels wide at any distance or resolution.

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAME_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uSize;
uniform float uHeader;
uniform float uAlpha;
uniform float uGlow;
uniform float uTime;
varying vec2 vUv;
float hairline(float d, float at) {
  float px = fwidth(d);
  return 1.0 - smoothstep(px * 0.6, px * 1.8, abs(d - at));
}
void main() {
  vec2 p = vUv * uSize;
  vec2 e = min(p, uSize - p);
  float d = min(e.x, e.y);
  float border = hairline(d, fwidth(d) * 1.5);
  float arm = 0.16 * min(uSize.x, uSize.y);
  float corner = step(e.x, arm) * step(e.y, arm) * hairline(d, fwidth(d) * 2.5);
  float sep = hairline(p.y, uSize.y - uHeader) * step(0.05, vUv.x) * step(vUv.x, 0.95);
  float scan = 0.8 + 0.2 * sin(p.y * 180.0 - uTime * 3.0);
  vec3 fill = vec3(0.008, 0.02, 0.034) + uColor * (0.03 + 0.03 * vUv.y) * scan;
  float edgeGlow = exp(-d * 9.0) * 0.35;
  vec3 col = fill + uColor * (border * 1.4 + corner * 2.6 + sep * 0.7 + edgeGlow) * uGlow;
  float a = max(0.86, max(border, corner));
  gl_FragColor = vec4(col, a * uAlpha);
}
`;

export function createHudFrameMaterial(u: SceneUniforms, color: THREE.Color, size: [number, number], header: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAME_FRAG,
    uniforms: {
      uTime: u.uTime,
      uColor: { value: color },
      uSize: { value: new THREE.Vector2(...size) },
      uHeader: { value: header },
      uAlpha: { value: 1 },
      uGlow: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
  });
}

const CHART_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAttack;
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uAlpha;
varying vec2 vUv;
${HASH_GLSL}
float traffic(float x) {
  float t = uTime * 0.7;
  float v = 0.3 + 0.18 * cyNoise(x * 9.0 + t) + 0.1 * cyNoise(x * 23.0 - t * 1.7);
  float spikes = pow(cyNoise(x * 31.0 - uTime * 2.2), 3.0);
  return v + uAttack * (0.35 * spikes + 0.12);
}
void main() {
  float v = traffic(vUv.x);
  float dy = vUv.y - v;
  float px = fwidth(vUv.y);
  float stroke = 1.0 - smoothstep(px * 0.8, px * 2.2, abs(dy));
  float fill = step(dy, 0.0) * (0.08 + 0.3 * vUv.y);
  float grid = (1.0 - smoothstep(0.0, fwidth(vUv.x) * 1.5, abs(fract(vUv.x * 10.0) - 0.5) - 0.48)) * 0.06;
  vec3 col = mix(uColor, uHot, smoothstep(0.55, 0.75, v));
  vec3 outc = col * (stroke * 2.4 + fill * 0.6) + uColor * grid;
  gl_FragColor = vec4(outc, max(stroke, fill * 0.8) * uAlpha);
}
`;

export function createChartMaterial(u: SceneUniforms, color: THREE.Color, hot: THREE.Color) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: CHART_FRAG,
    uniforms: {
      uTime: u.uTime,
      uAttack: u.uAttack,
      uColor: { value: color },
      uHot: { value: hot },
      uAlpha: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

const GLYPH_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uIcon;
uniform float uGrid;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uHalo;
varying vec2 vUv;
void main() {
  vec2 cell = vec2(mod(uIcon, uGrid), floor(uIcon / uGrid + 0.01));
  vec2 g = texture2D(uAtlas, (cell + vec2(vUv.x, 1.0 - vUv.y)) / uGrid).rg;
  gl_FragColor = vec4(uColor * (g.x * 1.6 + g.y * uHalo) * uAlpha, 1.0);
}
`;

/** One icon (an atlas cell, or a whole single-glyph texture with grid = 1) on a quad, additive. */
export function createGlyphMaterial(atlas: THREE.Texture, icon: number, color: THREE.Color, grid = 4, halo = 0.3) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: GLYPH_FRAG,
    uniforms: {
      uAtlas: { value: atlas },
      uIcon: { value: icon },
      uGrid: { value: grid },
      uColor: { value: color },
      uAlpha: { value: 1 },
      uHalo: { value: halo },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
