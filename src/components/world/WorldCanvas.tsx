"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { AdditiveBlending } from "three";
import CameraRig from "./CameraRig";
import Embers from "./Embers";
import MonolithField from "./MonolithField";
import DreamFragment from "./DreamFragment";
import HeroShard from "./HeroShard";
import WebsitePanes from "./WebsitePanes";
import AutomationGraph from "./AutomationGraph";
import CyberGrid from "./CyberGrid";

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
    vec2 c = vUv - vec2(0.5, 0.08);
    c.x *= 3.0;
    float d = length(c);
    float g = smoothstep(0.75, 0.0, d);
    vec3 col = mix(vec3(0.62, 0.28, 0.05), vec3(0.92, 0.55, 0.14), g * g);
    gl_FragColor = vec4(col, g * 0.28);
  }
`;

// A distant warm horizon the whole journey moves toward — gives the void
// depth and silhouettes the monolith field.
function HorizonGlow() {
  return (
    <mesh position={[0, 2.2, -46]}>
      <planeGeometry args={[170, 36]} />
      <shaderMaterial
        vertexShader={GLOW_VERT}
        fragmentShader={GLOW_FRAG}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, -10]}>
      <planeGeometry args={[140, 140]} />
      <meshStandardMaterial color="#0c0a08" roughness={0.95} metalness={0} />
    </mesh>
  );
}

export default function WorldCanvas() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 90, position: [0, 0.6, 8] }}
      >
        <color attach="background" args={["#070605"]} />
        <fog attach="fog" args={["#0a0705", 7, 44]} />
        <ambientLight intensity={0.22} color="#f5e8d8" />
        <directionalLight position={[4, 8, 5]} intensity={0.45} color="#f5dcbe" />
        <directionalLight position={[-5, 3, -8]} intensity={0.3} color="#7d8aa3" />
        <Suspense fallback={null}>
          <CameraRig />
          <HorizonGlow />
          <Ground />
          <HeroShard />
          <Embers />
          <MonolithField />
          <DreamFragment />
          <WebsitePanes />
          <AutomationGraph />
          <CyberGrid />
        </Suspense>
      </Canvas>
    </div>
  );
}
