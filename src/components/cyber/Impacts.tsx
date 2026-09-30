"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { IMPACTS, WALL_DIR, WALL_NORMAL, wallToWorld } from "./lib/layout";
import { glowTexture, starTexture } from "./lib/textures";
import { buildSparkGeometry, createSparkMaterial } from "./lib/sparks";
import { hdr } from "./lib/palette";

/** Where the floods hit: a white-hot flare, a red halo, a real light that
 *  paints the steel around it, and a spray of GPU sparks. */
export function Impacts() {
  const { u, state, tier } = useSim();
  const stars = useRef<Array<THREE.Sprite | null>>([]);
  const halos = useRef<Array<THREE.Sprite | null>>([]);
  const lights = useRef<Array<THREE.PointLight | null>>([]);

  const res = useMemo(() => {
    const star = starTexture();
    const glow = glowTexture();
    const starMats = IMPACTS.map(
      () => new THREE.SpriteMaterial({ map: star, color: hdr(2.6, 1.2, 1.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
    );
    const haloMats = IMPACTS.map(
      () => new THREE.SpriteMaterial({ map: glow, color: hdr(1.4, 0.08, 0.16), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
    );
    const sparkMat = createSparkMaterial(u, new THREE.Vector3(...WALL_NORMAL), new THREE.Vector3(...WALL_DIR));
    const sparks = new THREE.LineSegments(buildSparkGeometry(tier === "high" ? 1800 : 700, IMPACTS.length), sparkMat);
    sparks.frustumCulled = false;
    const points = IMPACTS.map((i) => new THREE.Vector3(...wallToWorld(i.s, i.y, 0.16)));
    return { star, glow, starMats, haloMats, sparks, points };
  }, [u, tier]);

  useEffect(
    () => () => {
      res.star.dispose();
      res.glow.dispose();
      [...res.starMats, ...res.haloMats].forEach((m) => m.dispose());
      res.sparks.geometry.dispose();
      (res.sparks.material as THREE.Material).dispose();
    },
    [res],
  );

  useFrame(() => {
    const t = state.time;
    u.uImpacts.value.forEach((imp, i) => {
      const heat = Math.min(imp.w, 1.6);
      const jitter = 0.85 + 0.15 * Math.sin(t * 31 + i * 7) * Math.sin(t * 17 + i);
      const star = stars.current[i];
      if (star) {
        star.scale.setScalar((0.9 + heat * 1.5) * jitter);
        star.material.opacity = Math.min(1, heat * 1.2);
        star.material.rotation = t * 0.4 + i * 2;
      }
      const halo = halos.current[i];
      if (halo) {
        halo.scale.setScalar(2.4 + heat * 2.6);
        halo.material.opacity = Math.min(0.9, heat * 0.7);
      }
      const light = lights.current[i];
      if (light) light.intensity = heat * 26 * jitter;
    });
  });

  return (
    <>
      {res.points.map((p, i) => (
        <group key={i} position={p}>
          <sprite ref={(el) => void (halos.current[i] = el)} material={res.haloMats[i]} />
          <sprite ref={(el) => void (stars.current[i] = el)} material={res.starMats[i]} />
          <pointLight ref={(el) => void (lights.current[i] = el)} color="#ff2a44" distance={6.5} decay={2} />
        </group>
      ))}
      <primitive object={res.sparks} />
    </>
  );
}
