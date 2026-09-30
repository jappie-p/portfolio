"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, FXAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BloomEffect, ChromaticAberrationEffect, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { shakeAmount } from "./lib/juice";

const BLOOM = 0.85;

/** HDR bloom (only emissive values above ~1 glow, so steel stays crisp), a
 *  chromatic split that kicks in with the camera shake, filmic tone mapping and
 *  a soft vignette. FXAA only on 1x screens: on high-DPI screens the pixel
 *  density already hides the stairs. (Measured on an M1: SMAA cost about a
 *  quarter of the frame, MSAA more.)
 *
 *  Bloom and the split are animated every frame, so they are built here and
 *  mounted as primitives: the library's wrappers serialise their props, and a
 *  React 19 ref holding a live effect made that throw. */
export function Effects({ antialias }: { antialias: boolean }) {
  const { state } = useSim();
  const fx = useMemo(
    () => ({
      bloom: new BloomEffect({ mipmapBlur: true, intensity: BLOOM, luminanceThreshold: 0.95, luminanceSmoothing: 0.25, radius: 0.72 }),
      split: new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: true, modulationOffset: 0.25 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      fx.bloom.dispose();
      fx.split.dispose();
    },
    [fx],
  );

  useFrame(() => {
    const shake = shakeAmount(state.trauma);
    fx.bloom.intensity = BLOOM + state.hit * 0.35 + shake * 0.5;
    fx.split.offset.set(shake * 0.006 + state.hit * 0.0012, shake * 0.004);
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <primitive object={fx.bloom} />
      <primitive object={fx.split} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {antialias ? <FXAA /> : <></>}
      <Vignette offset={0.22} darkness={0.7} />
    </EffectComposer>
  );
}
