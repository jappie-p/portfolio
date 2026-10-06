import * as THREE from "three";
import { HEAD, OUT, VERT } from "../glsl";
import type { Shared } from "../lights";
import { OFF, blurred } from "../foreground";
import { MIRRORED } from "../reflector";

const FRAG = /* glsl */ `${HEAD}
in vec2 vUv;
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uTime;
uniform float uLevel;
uniform float uFade;
${OUT}
void main() {
  // r: the tube, g: the light round it
  vec2 m = texture(uMap, vUv).rg;
  // a low hum, and now and then a stutter as if the transformer caught
  float t = uTime;
  float hum = 0.95 + 0.05 * sin(t * 3.1) * sin(t * 1.7 + 1.0);
  float stutter = fract(t / 9.0) < 0.028 ? 0.3 + 0.7 * step(0.5, fract(t * 23.0)) : 1.0;
  float on = hum * stutter * uLevel * uFade;
  // the glass runs white-hot at its core, the gas's colour round it
  vec3 c = uColor * (m.r * 1.6 + m.g * 0.45) + vec3(1.0, 0.86, 0.95) * pow(m.r, 3.0) * 0.9;
  glow(c * on);
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

/** Pixels: the cap height in the texture, the clear margin the light needs round it. */
const CAP = 140;
const MARGIN = 58;

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
    blurred(g, color, blur, (g) => {
      g.lineWidth = width;
      g.strokeStyle = "#000";
      tubes(g, OFF);
    });
  }
  // the tube, a little soft at its edge
  g.strokeStyle = "rgb(110, 0, 0)";
  g.lineWidth = 11;
  tubes(g);
  g.strokeStyle = "rgb(145, 0, 0)";
  g.lineWidth = 6;
  tubes(g);
  return canvas;
}

/**
 * The festival's name as a neon sign, its tubes standing off the frame's
 * top bar on their brackets, tipped up a little to the right: light added
 * over the room (and its reflection in the floor), humming, now and then
 * stuttering.
 */
export function makeNeon(shared: Shared, level: { value: number }, word: string, color: THREE.Color, height: number) {
  const canvas = drawSign(word);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  const k = height / CAP;
  const fade = { value: 1 };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(canvas.width * k, canvas.height * k),
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
  mesh.layers.enable(MIRRORED);
  mesh.renderOrder = 2;
  return { mesh, texture, fade };
}
