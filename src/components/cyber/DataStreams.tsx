"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { wallToWorld } from "./lib/layout";
import { buildRibbonGeometry, createRibbonMaterial, type Strand } from "./lib/ribbon";
import { mulberry32 } from "./lib/rng";
import { hdr } from "./lib/palette";

const SAMPLES = 72;

/** Braided bundles of fibre that wave in from the left and sink into the wall. */
function buildStreams(bundles: number, perBundle: number): Strand[] {
  const rnd = mulberry32(4242);
  const strands: Strand[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < bundles; i++) {
    const start = new THREE.Vector3(-16 + rnd() * 5, 0.5 + rnd() * 6, -1 + rnd() * 8);
    const end = new THREE.Vector3(...wallToWorld(-2.75 + rnd() * 2.3, 0.45 + rnd() * 4.5, -0.3));
    const m1 = start.clone().lerp(end, 0.35).add(new THREE.Vector3(0, (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4));
    const m2 = start.clone().lerp(end, 0.72).add(new THREE.Vector3(0, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2));
    const spine = new THREE.CatmullRomCurve3([start, m1, m2, end]);
    const dominant = rnd() < 0.45 ? 0 : rnd() < 0.55 ? 1 : 2;
    for (let k = 0; k < perBundle; k++) {
      const pa = rnd() * 6.28;
      const pb = rnd() * 6.28;
      const fa = 2 + rnd() * 4;
      const fb = 2 + rnd() * 4;
      const spread = 0.18 + rnd() * 0.3;
      const points: THREE.Vector3[] = [];
      for (let s = 0; s < SAMPLES; s++) {
        const t = s / (SAMPLES - 1);
        const p = spine.getPoint(t);
        const tan = spine.getTangent(t);
        n.crossVectors(tan, up).normalize();
        b.crossVectors(n, tan).normalize();
        const amp = spread * Math.pow(1 - t, 1.3) + 0.02;
        p.addScaledVector(n, Math.sin(t * fa * Math.PI + pa) * amp).addScaledVector(b, Math.cos(t * fb * Math.PI + pb) * amp);
        points.push(p);
      }
      const thick = rnd() < 0.1;
      strands.push({
        points,
        width: thick ? 0.02 + rnd() * 0.012 : 0.005 + rnd() * 0.008,
        seed: rnd(),
        kind: rnd() < 0.8 ? dominant : Math.floor(rnd() * 3),
      });
    }
  }
  return strands;
}

export function DataStreams() {
  const { u, tier } = useSim();
  const mesh = useMemo(() => {
    const strands = buildStreams(tier === "high" ? 22 : 12, tier === "high" ? 12 : 8);
    const mat = createRibbonMaterial(u, {
      // saturated, so overlapping strands stay coloured instead of clipping to white
      colors: [hdr(0.06, 0.62, 1), hdr(0.06, 0.26, 1), hdr(0.08, 1, 0.42)],
      speed: 0.45,
      pulses: 2.5,
      base: 0.5,
      gain: 4.2,
      ends: [0.12, 0.16],
    });
    const m = new THREE.Mesh(buildRibbonGeometry(strands), mat);
    m.frustumCulled = false;
    return m;
  }, [u, tier]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );

  return <primitive object={mesh} />;
}
