"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbParticles } from "@/components/canvas/OrbParticles";
import { useAiSim } from "./sim";

// The heart of the scene: the Jarvis orb, a hot glow behind it, light shafts
// fanning out through the haze, and three orbit rings like a gyroscope. The
// rings settle flat as the Go to Guy hub assembles around the core.

/** A camera-facing quad at the core, drawn by the fragment shader. */
const BILLBOARD_VERT = /* glsl */ `
uniform float uScale;
varying vec2 vUv;
void main() {
  vUv = position.xy;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uScale;
  gl_Position = projectionMatrix * mv;
}
`;

const GLOW_FRAG = /* glsl */ `
uniform float uFlare;
uniform float uBoot;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  float on = smoothstep(0.0, 3.0, uBoot);
  // gaussians all the way down, so nothing is left at the quad's edge
  float core = exp(-r * r * 60.0);
  float halo = exp(-r * r * 12.0) * 0.5;
  float haze = exp(-r * r * 4.5) * 0.12;
  vec3 col = vec3(1.0) * core * 1.5 + vec3(0.36, 0.92, 0.88) * halo + vec3(0.45, 0.3, 1.0) * haze;
  col *= on * (0.8 + uFlare * 0.9) * (1.0 - smoothstep(0.8, 1.0, r));
  gl_FragColor = vec4(col, 1.0);
}
`;

const SHAFTS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uFlare;
uniform float uBoot;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  float ang = atan(vUv.y, vUv.x);
  // thin spokes of light: sharp in angle, drifting slowly, never a fog
  float wob = (sin(ang * 3.0 + uTime * 0.11) + 0.6 * sin(ang * 5.0 - uTime * 0.07) + 0.4 * sin(ang * 7.0 + uTime * 0.05)) * 1.6;
  float spokes = pow(0.5 + 0.5 * sin(ang * 11.0 + wob), 26.0) + 0.6 * pow(0.5 + 0.5 * sin(ang * 23.0 - wob * 0.7 + 1.3), 34.0);
  float fall = exp(-r * 3.2) * smoothstep(0.1, 0.24, r) * (1.0 - smoothstep(0.6, 1.0, r));
  float on = smoothstep(0.0, 4.0, uBoot);
  vec3 col = mix(vec3(0.45, 0.32, 1.0), vec3(0.37, 0.92, 0.83), 0.5 + 0.5 * sin(ang * 3.0)) * spokes * fall * (0.22 + uFlare * 0.55) * on;
  gl_FragColor = vec4(col, 1.0);
}
`;

const RING_VERT = /* glsl */ `
attribute float aA;
varying float vA;
void main() {
  vA = aA;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform vec3 uColor;
uniform float uOn;
varying float vA;
void main() {
  // arcs with gaps, sliding round the ring
  float s = fract(vA * 7.0 - uTime * uSpeed);
  float arc = smoothstep(0.0, 0.04, s) * smoothstep(0.62, 0.5, s);
  float a = (0.12 + arc * 0.55) * uOn;
  gl_FragColor = vec4(uColor * a * 1.8, a);
}
`;

function circle(r: number, seg = 256) {
  const pos = new Float32Array((seg + 1) * 3);
  const a = new Float32Array(seg + 1);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    pos.set([Math.cos(t * Math.PI * 2) * r, 0, Math.sin(t * Math.PI * 2) * r], i * 3);
    a[i] = t;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aA", new THREE.BufferAttribute(a, 1));
  return g;
}

const RINGS = [
  { r: 3.35, tilt: [1.05, 0.2, 0.15], speed: 0.09, color: "#5eead4" },
  { r: 3.9, tilt: [-0.7, 0.9, 0.0], speed: -0.06, color: "#8b7bff" },
  { r: 4.5, tilt: [0.35, -0.6, 0.9], speed: 0.045, color: "#4ade80" },
] as const;

export function Core() {
  const { u, state, still } = useAiSim();
  const rings = useRef<THREE.Group[]>([]);
  const flare = useMemo(() => ({ value: 0 }), []);

  const mats = useMemo(() => {
    const glow = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: { uScale: { value: 9 }, uFlare: flare, uBoot: u.uBoot },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shafts = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: SHAFTS_FRAG,
      uniforms: { uScale: { value: 13 }, uTime: u.uTime, uFlare: flare, uBoot: u.uBoot },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = RINGS.map(
      (r) =>
        new THREE.ShaderMaterial({
          vertexShader: RING_VERT,
          fragmentShader: RING_FRAG,
          uniforms: { uTime: u.uTime, uSpeed: { value: r.speed * 3 }, uColor: { value: new THREE.Color(r.color) }, uOn: { value: 0 } },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
    );
    const ringGeo = RINGS.map((r) => circle(r.r));
    const lines = ringGeo.map((g, i) => new THREE.Line(g, ring[i]));
    return { glow, shafts, ring, ringGeo, lines };
  }, [u, flare]);

  useEffect(
    () => () => {
      mats.glow.dispose();
      mats.shafts.dispose();
      mats.ring.forEach((m) => m.dispose());
      mats.ringGeo.forEach((g) => g.dispose());
    },
    [mats],
  );

  const quad = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  useEffect(() => () => quad.dispose(), [quad]);

  useFrame((_, delta) => {
    flare.value = state.flare;
    const dt = still ? 0 : Math.min(delta, 0.05);
    const settle = state.hub;
    rings.current.forEach((g, i) => {
      if (!g) return;
      const r = RINGS[i];
      // gyroscope: tumbling on the cover, settling flat around the hub
      g.rotation.x = THREE.MathUtils.lerp(r.tilt[0], 0.03 * i, settle);
      g.rotation.z = THREE.MathUtils.lerp(r.tilt[2], 0, settle);
      g.rotation.y += dt * r.speed * 2;
      const scale = 1 + settle * (0.35 + i * 0.12);
      g.scale.setScalar(scale);
      mats.ring[i].uniforms.uOn.value = Math.min(1, u.uBoot.value / 4);
    });
  });

  return (
    <group>
      <mesh geometry={quad} material={mats.shafts} frustumCulled={false} renderOrder={-1} />
      <mesh geometry={quad} material={mats.glow} frustumCulled={false} />
      <OrbParticles />
      {RINGS.map((r, i) => (
        <group key={r.r} ref={(g) => void (rings.current[i] = g!)} rotation={[r.tilt[0], r.tilt[1], r.tilt[2]]}>
          <primitive object={mats.lines[i]} />
        </group>
      ))}
    </group>
  );
}
