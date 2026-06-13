"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { AdditiveBlending } from "three";
import Embers from "@/components/world/Embers";

const GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLOW_FRAG = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - vec2(0.5, 0.1);
    c.x *= 3.0;
    float d = length(c);
    float g = smoothstep(0.8, 0.0, d);
    vec3 col = mix(vec3(0.62, 0.28, 0.05), vec3(0.92, 0.55, 0.14), g * g);
    gl_FragColor = vec4(col, g * 0.22);
  }
`;

export default function V2CanvasScene() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 90, position: [0, 0.8, 8] }}
      >
        <color attach="background" args={["#070605"]} />
        <fog attach="fog" args={["#0a0705", 7, 40]} />
        <Suspense fallback={null}>
          <mesh position={[0, 1.5, -40]}>
            <planeGeometry args={[150, 34]} />
            <shaderMaterial
              vertexShader={GLOW_VERT}
              fragmentShader={GLOW_FRAG}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <Embers />
        </Suspense>
      </Canvas>
    </div>
  );
}
