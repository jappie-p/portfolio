"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { IMPACTS, wallToWorld } from "./lib/layout";
import { buildRibbonGeometry, createRibbonMaterial, type Strand } from "./lib/ribbon";
import { mulberry32 } from "./lib/rng";
import { PALETTE, hdr } from "./lib/palette";

const SAMPLES = 44;

/** Three DDoS floods: fans of red filaments from off-screen right that converge on one impact point each. */
function buildFloods(filaments: number): { threads: Strand[]; cores: Strand[] } {
  const rnd = mulberry32(666);
  const threads: Strand[] = [];
  const cores: Strand[] = [];
  const curve = (a: THREE.Vector3, b: THREE.Vector3, bow: number) => {
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3((rnd() - 0.5) * bow, (rnd() - 0.5) * bow, (rnd() - 0.5) * bow));
    const q = new THREE.QuadraticBezierCurve3(a, mid, b);
    return Array.from({ length: SAMPLES }, (_, i) => q.getPoint(i / (SAMPLES - 1)));
  };
  IMPACTS.forEach((imp, g) => {
    const target = new THREE.Vector3(...wallToWorld(imp.s, imp.y, 0.05));
    const oS = imp.s + 10 + rnd() * 3;
    const oY = imp.y + (rnd() - 0.5) * 1.2;
    const oZ = 6.5 + rnd() * 2;
    for (let k = 0; k < filaments; k++) {
      const start = new THREE.Vector3(...wallToWorld(oS + (rnd() - 0.5) * 4, oY + (rnd() - 0.5) * 3.2, oZ + (rnd() - 0.5) * 4));
      const end = target.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.14, (rnd() - 0.5) * 0.14, (rnd() - 0.5) * 0.14));
      const r = rnd();
      threads.push({
        points: curve(start, end, 1.2),
        width: 0.003 + rnd() * 0.008,
        seed: rnd(),
        kind: r < 0.68 ? 0 : r < 0.9 ? 1 : 2,
        group: g,
      });
    }
    for (let k = 0; k < 3; k++) {
      const start = new THREE.Vector3(...wallToWorld(oS + (rnd() - 0.5), oY + (rnd() - 0.5) * 0.6, oZ + (rnd() - 0.5)));
      cores.push({ points: curve(start, target, 0.3), width: 0.018 + rnd() * 0.02, seed: rnd(), kind: k === 0 ? 1 : 0, group: g });
    }
  });
  return { threads, cores };
}

export function AttackBeams() {
  const { u, tier } = useSim();

  const meshes = useMemo(() => {
    const { threads, cores } = buildFloods(tier === "high" ? 42 : 20);
    const threadMat = createRibbonMaterial(u, {
      colors: [hdr(...PALETTE.red), hdr(...PALETTE.pink), hdr(0.8, 0.02, 0.1)],
      speed: 1.25,
      pulses: 4,
      base: 0.45,
      gain: 5,
      jitter: 0.05,
      ends: [0.2, 0.02],
      bolt: 7,
      cuts: true,
    });
    const coreMat = createRibbonMaterial(u, {
      colors: [hdr(...PALETTE.red), hdr(1, 0.72, 0.78), hdr(1, 0.3, 0.4)],
      speed: 1.7,
      pulses: 3,
      base: 1.3,
      gain: 3.5,
      ends: [0.25, 0.01],
      bolt: 5,
      cuts: true,
    });
    const make = (s: Strand[], m: THREE.Material) => {
      const mesh = new THREE.Mesh(buildRibbonGeometry(s), m);
      mesh.frustumCulled = false;
      return mesh;
    };
    return [make(threads, threadMat), make(cores, coreMat)];
  }, [u, tier]);

  useEffect(
    () => () => {
      for (const m of meshes) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
    [meshes],
  );

  // each flood's brightness follows its impact heat
  useFrame(() => {
    const heat = u.uImpacts.value;
    for (const m of meshes) {
      const gains = (m.material as THREE.ShaderMaterial).uniforms.uGroups.value as number[];
      for (let i = 0; i < 3; i++) gains[i] = Math.min(heat[i].w * 1.15, 1.4);
    }
  });

  return (
    <>
      {meshes.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
    </>
  );
}
