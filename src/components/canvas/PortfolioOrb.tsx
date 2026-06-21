"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbParticles } from "./OrbParticles";
import { useJourney } from "@/lib/store";

/** A soft dark radial disc behind the orb so its additive particles read on the
 *  light page (additive blending is invisible over white). */
function ContainmentDisc() {
  const texture = useMemo(() => {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(15,13,11,0.9)");
    g.addColorStop(0.5, "rgba(15,13,11,0.62)");
    g.addColorStop(0.8, "rgba(15,13,11,0.18)");
    g.addColorStop(1, "rgba(15,13,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  return (
    <mesh position={[0, 0, -1.5]}>
      <planeGeometry args={[13, 13]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

export function PortfolioOrb() {
  const outerRef = useRef<THREE.Group>(null!);
  const visRef = useRef(1);

  useFrame(() => {
    if (!outerRef.current) return;
    // First pass: orb lives on the hero (topic 0); fades out elsewhere.
    const target = useJourney.getState().topic === 0 ? 1 : 0;
    visRef.current += (target - visRef.current) * 0.06;
    const v = visRef.current;
    outerRef.current.visible = v > 0.01;
    outerRef.current.scale.setScalar(0.82 * Math.max(v, 0.0001));
    outerRef.current.position.y = 0.15;
  });

  return (
    <group ref={outerRef}>
      <ContainmentDisc />
      <OrbParticles />
    </group>
  );
}
