"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
} from "three";

const VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vFade;

  void main() {
    vec3 p = position;
    float h = 7.0;
    p.y = mod(position.y + uTime * (0.12 + aSeed * 0.22), h);
    p.x += sin(uTime * (0.2 + aSeed * 0.3) + aSeed * 40.0) * 0.45;
    vFade = smoothstep(0.0, 0.9, p.y) * (1.0 - smoothstep(h - 1.6, h, p.y));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.0 + aSeed * 5.0) * (14.0 / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying float vFade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.05, d) * vFade;
    vec3 col = mix(vec3(0.85, 0.47, 0.02), vec3(0.96, 0.62, 0.04), vFade);
    gl_FragColor = vec4(col, a * 0.8);
  }
`;

// Deterministic PRNG so the field is stable across renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Embers() {
  const material = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const isSmall =
      typeof window !== "undefined" && window.innerWidth < 768;
    const count = isSmall ? 140 : 450;
    const rand = mulberry32(1337);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 18; // x
      positions[i * 3 + 1] = rand() * 7; // y (cycled in shader)
      positions[i * 3 + 2] = 9 - rand() * 34; // z along the camera path
      seeds[i] = rand();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 } };
    return { geometry, uniforms };
  }, []);

  // R3F only auto-disposes JSX-declared geometries; this one is prop-passed.
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    if (material.current) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
