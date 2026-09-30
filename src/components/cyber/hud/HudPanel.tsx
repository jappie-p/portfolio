"use client";
import { useEffect, useMemo, useRef, type RefObject, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { sinceBoot, useSim } from "../SimContext";
import { createGlyphMaterial, createHudFrameMaterial } from "../lib/hud-materials";
import { FONTS } from "../lib/palette";
import { easeOutBack, panelOpen } from "../lib/juice";

export const HEADER = 0.3;
export const PAD = 0.14;

/** One atlas icon on a quad. The glyph fills about two thirds of `size`. */
export function Glyph({
  icon,
  color,
  size,
  position,
  materialRef,
}: {
  icon: number;
  color: THREE.Color;
  size: number;
  position: [number, number, number];
  materialRef?: RefObject<THREE.ShaderMaterial | null>;
}) {
  const { atlas } = useSim();
  const mat = useMemo(() => createGlyphMaterial(atlas, icon, color), [atlas, icon, color]);
  useEffect(() => {
    if (materialRef) materialRef.current = mat;
    return () => mat.dispose();
  }, [mat, materialRef]);
  return (
    <mesh position={position} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

/** Where a screen floats, how big it is, and its place in the power-on order. */
export type PanelPlacement = { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number; order: number };

/** Holographic HUD card: dark glass, hairline border with corner brackets and a
 *  title bar. It powers on like a CRT (a flickering line that snaps open) in its
 *  turn after the section comes into view. Children are laid out from the
 *  content area's top-left corner. */
export function HudPanel({
  placement,
  size,
  color,
  title,
  icon,
  aside,
  frameRef,
  children,
}: {
  placement: PanelPlacement;
  size: [number, number];
  color: THREE.Color;
  title: string;
  icon?: number;
  aside?: ReactNode;
  frameRef?: RefObject<THREE.ShaderMaterial | null>;
  children?: ReactNode;
}) {
  const { u, state, still } = useSim();
  const root = useRef<THREE.Group>(null);
  const [w, h] = size;
  // own copy of the colour: alerts recolour their frame when the attack is blocked
  const mat = useMemo(() => createHudFrameMaterial(u, color.clone(), [w, h], HEADER), [u, color, w, h]);
  useEffect(() => {
    if (frameRef) frameRef.current = mat;
    return () => mat.dispose();
  }, [mat, frameRef]);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const open = panelOpen(sinceBoot(state, still), placement.order);
    g.visible = open > 0;
    g.scale.set(placement.scale, placement.scale * Math.max(0.002, open >= 1 ? 1 : easeOutBack(open)), placement.scale);
    mat.uniforms.uAlpha.value = open >= 1 ? 1 : open * (Math.sin(state.time * 90) > -0.3 ? 1 : 0.35);
  });

  const titleY = h / 2 - HEADER / 2;
  return (
    <group ref={root} position={placement.position} quaternion={placement.quaternion} scale={placement.scale}>
      <mesh material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {icon !== undefined && <Glyph icon={icon} color={color} size={0.24} position={[-w / 2 + PAD + 0.07, titleY, 0.002]} />}
      <Text
        font={FONTS.title}
        fontSize={0.135}
        letterSpacing={0.07}
        color={color}
        anchorX="left"
        anchorY="middle"
        position={[-w / 2 + PAD + (icon !== undefined ? 0.2 : 0), titleY - 0.005, 0.003]}
      >
        {title}
      </Text>
      {aside && <group position={[w / 2 - PAD, titleY, 0.003]}>{aside}</group>}
      <group position={[-w / 2 + PAD, h / 2 - HEADER - PAD * 0.7, 0.003]}>{children}</group>
    </group>
  );
}
