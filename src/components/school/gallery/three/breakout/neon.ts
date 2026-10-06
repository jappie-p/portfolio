import * as THREE from "three";
import { HEAD, LIGHT, OUT, VERT } from "../glsl";
import type { Shared } from "../lights";
import { OFF, blurred } from "../foreground";
import { MIRRORED } from "../reflector";

/** How lit the gas is: a low hum, and now and then a stutter as if the
 *  transformer caught. The tubes and the board they light share it. */
const POWER = /* glsl */ `
uniform float uTime;
uniform float uLevel;
uniform float uFade;
float power() {
  float t = uTime;
  float hum = 0.95 + 0.05 * sin(t * 3.1) * sin(t * 1.7 + 1.0);
  float stutter = fract(t / 9.0) < 0.028 ? 0.3 + 0.7 * step(0.5, fract(t * 23.0)) : 1.0;
  return hum * stutter * uLevel;
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec2 vUv;
uniform sampler2D uMap;
uniform vec3 uColor;
${OUT}
${POWER}
void main() {
  // r: the tube, g: the light round it
  vec2 m = texture(uMap, vUv).rg;
  // the glass runs white-hot at its core, the gas's colour round it
  vec3 c = uColor * (m.r * 1.6 + m.g * 0.45) + vec3(1.0, 0.86, 0.95) * pow(m.r, 3.0) * 0.9;
  glow(c * power() * uFade);
}
`;

const BOARD = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec3 cameraPosition;
uniform sampler2D uMap;
uniform vec3 uColor;
// the board's front in the sign's texture (offset, size), and its size in metres
uniform vec4 uRect;
uniform vec2 uSize;
${OUT}
${LIGHT}
${POWER}
void main() {
  // gone before the project opens: nothing of it left in the depth either
  if (uFade < 0.004) discard;
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float front = smoothstep(0.6, 0.9, n.z);
  float on = power();
  // black satin steel, the room's spots faint on it
  vec3 light = uAmbient * 3.0;
  float sheen = 0.0;
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    vec3 c = spot(i, vWorld, L);
    light += c * max(dot(n, L), 0.0);
    sheen += dot(c, vec3(0.33)) * pow(max(dot(n, normalize(L + V)), 0.0), 24.0);
  }
  vec3 col = vec3(0.011, 0.009, 0.013) * light + vec3(0.02) * sheen;
  // the tubes' light thrown back off it, strongest right round them
  float g = texture(uMap, uRect.xy + vUv * uRect.zw).g;
  col += uColor * (0.5 * g + 0.018) * on * front;
  // a fine lip of light round its face, and the gas's glow down its edges
  vec2 e = min(vUv, 1.0 - vUv) * uSize;
  float d = min(e.x, e.y);
  float lip = 1.0 - smoothstep(0.0, 0.006 + fwidth(d), d);
  col += uColor * on * (front * lip * 0.5 + (1.0 - front) * 0.05);
  emit(col, uFade);
}
`;

/** The letters as a neon bender would run them, one tube each where it can:
 *  x across 0..width, y down 0..1 (cap height), as lines and curves. */
type Run = { w: number; draw: (g: CanvasRenderingContext2D, u: (x: number, y: number) => [number, number]) => void };
const line = (g: CanvasRenderingContext2D, u: (x: number, y: number) => [number, number], ...pts: [number, number][]) => {
  pts.forEach(([x, y], i) => (i ? g.lineTo(...u(x, y)) : g.moveTo(...u(x, y))));
};
const LETTERS: Record<string, Run> = {
  F: { w: 0.52, draw: (g, u) => (line(g, u, [0.52, 0], [0, 0], [0, 1]), line(g, u, [0, 0.48], [0.4, 0.48])) },
  E: { w: 0.52, draw: (g, u) => (line(g, u, [0.52, 0], [0, 0], [0, 1], [0.52, 1]), line(g, u, [0, 0.49], [0.42, 0.49])) },
  S: {
    w: 0.56,
    draw: (g, u) => {
      g.moveTo(...u(0.54, 0.13));
      g.bezierCurveTo(...u(0.44, -0.04), ...u(0.04, -0.03), ...u(0.04, 0.24));
      g.bezierCurveTo(...u(0.04, 0.49), ...u(0.56, 0.45), ...u(0.56, 0.74));
      g.bezierCurveTo(...u(0.56, 1.04), ...u(0.08, 1.05), ...u(0.0, 0.85));
    },
  },
  T: { w: 0.58, draw: (g, u) => (line(g, u, [0, 0], [0.58, 0]), line(g, u, [0.29, 0], [0.29, 1])) },
  I: { w: 0, draw: (g, u) => line(g, u, [0, 0], [0, 1]) },
  V: { w: 0.6, draw: (g, u) => line(g, u, [0, 0], [0.3, 1], [0.6, 0]) },
  A: { w: 0.6, draw: (g, u) => (line(g, u, [0, 1], [0.3, 0], [0.6, 1]), line(g, u, [0.11, 0.66], [0.49, 0.66])) },
  L: { w: 0.48, draw: (g, u) => line(g, u, [0, 0], [0, 1], [0.48, 1]) },
};
/** Between letters, in cap heights. */
const GAP = 0.3;

/** Pixels: the cap height in the texture, the clear margin the light needs
 *  round it, and how much finer than the first 140 px drawing it is. */
const CAP = 190;
const MARGIN = 80;
const K = CAP / 140;

/** The word bent in glass: the tube in red, the light it throws in green. */
function drawSign(word: string) {
  const runs = [...word].map((c) => LETTERS[c]).filter(Boolean);
  const span = runs.reduce((s, r) => s + r.w, 0) + GAP * (runs.length - 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(span * CAP + 2 * MARGIN);
  canvas.height = CAP + 2 * MARGIN;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  g.lineJoin = "round";
  const tubes = (g: CanvasRenderingContext2D, dx = 0) => {
    let x = MARGIN;
    g.beginPath();
    for (const r of runs) {
      const at = x;
      r.draw(g, (u, v) => [at + u * CAP + dx, MARGIN + v * CAP]);
      x += (r.w + GAP) * CAP;
    }
    g.stroke();
  };
  // the light: wide and soft, then close and brighter
  for (const [blur, width, color] of [
    [34, 20, "rgb(0, 150, 0)"],
    [12, 12, "rgb(0, 160, 0)"],
  ] as const) {
    blurred(g, color, blur * K, (g) => {
      g.lineWidth = width * K;
      g.strokeStyle = "#000";
      tubes(g, OFF);
    });
  }
  // the tube, a little soft at its edge
  g.strokeStyle = "rgb(110, 0, 0)";
  g.lineWidth = 11 * K;
  tubes(g);
  g.strokeStyle = "rgb(145, 0, 0)";
  g.lineWidth = 6 * K;
  tubes(g);
  return canvas;
}

/** The board, in cap heights: how far it runs past the word each side, and
 *  how tall it is; its depth, and how far the tubes stand off its face, in
 *  metres. */
const BOARD_PAD = 0.34;
const BOARD_TALL = 1.72;
const BOARD_DEEP = 0.032;
const STANDOFF = 0.022;

/**
 * The festival's name as a neon sign: its tubes on a black steel board,
 * hung flat on the wall, the board lit by them and edged in their colour.
 * The tubes are light added over the room (and its reflection in the
 * floor), humming, now and then stuttering. The group's origin is the
 * board's back, at its centre.
 */
export function makeNeon(shared: Shared, level: { value: number }, word: string, color: THREE.Color, height: number) {
  const canvas = drawSign(word);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  const k = height / CAP;
  const fade = { value: 1 };
  const W = canvas.width * k;
  const H = canvas.height * k;
  const tubes = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, uMap: { value: texture }, uColor: { value: color }, uLevel: level, uFade: fade },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  tubes.position.z = BOARD_DEEP + STANDOFF;
  tubes.layers.enable(MIRRORED);
  tubes.renderOrder = 2;
  const bw = W - 2 * (MARGIN - BOARD_PAD * CAP) * k;
  const bh = BOARD_TALL * height;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(bw, bh, BOARD_DEEP).translate(0, 0, BOARD_DEEP / 2),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: BOARD,
      uniforms: {
        ...shared,
        uMap: { value: texture },
        uColor: { value: color },
        uLevel: level,
        uFade: fade,
        uRect: { value: new THREE.Vector4((W - bw) / 2 / W, (H - bh) / 2 / H, bw / W, bh / H) },
        uSize: { value: new THREE.Vector2(bw, bh) },
      },
      transparent: true,
    }),
  );
  board.layers.enable(MIRRORED);
  board.renderOrder = 1;
  const group = new THREE.Group();
  group.add(board, tubes);
  return { group, texture, fade, size: new THREE.Vector2(bw, bh) };
}
