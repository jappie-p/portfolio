"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import CameraRig from "./CameraRig";

export default function WorldCanvas() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 60, position: [0, 0.6, 8] }}
      >
        <color attach="background" args={["#070605"]} />
        <fog attach="fog" args={["#070605", 6, 28]} />
        <ambientLight intensity={0.15} color="#f5f0ea" />
        <directionalLight position={[3, 6, 2]} intensity={0.25} color="#f5e0c8" />
        <Suspense fallback={null}>
          <CameraRig />
        </Suspense>
      </Canvas>
    </div>
  );
}
