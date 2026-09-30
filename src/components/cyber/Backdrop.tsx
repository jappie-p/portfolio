"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { HASH_GLSL } from "./lib/glsl";

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

// A far, out-of-focus data hall: rack silhouettes, soft bokeh status lights,
// a blue haze band and ceiling light streaks. All procedural, no textures.
const FRAG = /* glsl */ `
uniform float uTime;
varying vec3 vWorld;
${HASH_GLSL}
void main() {
  float x = vWorld.x;
  float y = vWorld.y;
  vec3 col = vec3(0.003, 0.007, 0.016);
  col += vec3(0.014, 0.05, 0.12) * exp(-pow((y - 4.2) / 3.6, 2.0));

  // rack columns with soft edges
  float rx = fract(x / 1.6);
  float rack = smoothstep(0.04, 0.14, rx) * smoothstep(0.96, 0.86, rx) * smoothstep(7.5, 6.8, y) * smoothstep(-0.2, 0.4, y);
  col += vec3(0.012, 0.026, 0.05) * rack;

  // bokeh status lights: big soft dots, some blinking
  vec2 g = vec2(x * 2.2, y * 2.6);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = cyHash2(id);
  float dot = smoothstep(0.42, 0.0, length(f)) * step(0.72, h) * rack;
  float blink = 0.55 + 0.45 * step(0.35, cyHash2(id + floor(uTime * (0.3 + h))));
  vec3 led = mix(vec3(0.08, 0.45, 1.0), vec3(0.1, 1.0, 0.55), step(0.94, h));
  col += led * dot * blink * 0.45;

  // ceiling streaks
  float streak = exp(-pow((y - 10.5) / 0.7, 2.0)) * (0.3 + 0.7 * cyNoise(x * 0.35));
  col += vec3(0.06, 0.2, 0.55) * streak * 0.4;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Backdrop() {
  const { u } = useSim();
  const mesh = useMemo(() => {
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uTime: u.uTime }, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(130, 26), mat);
    m.position.set(6, 11, -34);
    m.renderOrder = -1;
    return m;
  }, [u]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}
