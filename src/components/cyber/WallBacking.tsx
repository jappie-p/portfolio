"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { WALL } from "./lib/layout";
import { hexPitch } from "./lib/hex";
import { createModuleMaterial } from "./lib/wall-materials";
import { mulberry32 } from "./lib/rng";

const [COL_MIN, COL_MAX] = WALL.cols;
const PITCH = hexPitch(WALL.cellR, WALL.gap);
const S_MIN = COL_MIN * PITCH.x - WALL.cellR * 0.7;
const S_MAX = COL_MAX * PITCH.x + WALL.cellR;
const TOP = 5.25;

/** Machinery behind the honeycomb: a dark slab, blinking modules that show
 *  through the gaps, and a stacked end cap where the trusted traffic enters. */
export function WallBacking() {
  const { u } = useSim();

  const parts = useMemo(() => {
    const rnd = mulberry32(512);
    type Box = { s: number; y: number; z: number; w: number; h: number; d: number; seed: number };
    const boxes: Box[] = [];
    // modules peeking through the gaps
    for (let s = S_MIN + 0.2; s < S_MAX; s += 0.34) {
      for (let y = 0.15; y < TOP - 0.1; y += 0.34) {
        if (rnd() > 0.45) continue;
        const w = 0.16 + rnd() * 0.2;
        const h = 0.12 + rnd() * 0.16;
        boxes.push({ s: s + (rnd() - 0.5) * 0.1, y, z: -0.44, w, h, d: 0.16, seed: rnd() });
      }
    }
    // end cap: chunky stacked blocks with bright seams, the poster's green left edge
    for (let y = 0.22; y < TOP - 0.2; y += 0.44) {
      for (let k = 0; k < 2; k++) {
        const w = 0.34 + rnd() * 0.14;
        boxes.push({ s: S_MIN - 0.05 - k * 0.3, y, z: -0.3 - k * 0.26, w, h: 0.38, d: 0.42, seed: rnd() });
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.setAttribute("aS", new THREE.InstancedBufferAttribute(Float32Array.from(boxes.map((b) => b.s)), 1));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(Float32Array.from(boxes.map((b) => b.seed)), 1));
    geo.setAttribute("aIcon", new THREE.InstancedBufferAttribute(new Float32Array(boxes.length), 1));
    geo.setAttribute("aCenter", new THREE.InstancedBufferAttribute(Float32Array.from(boxes.flatMap((b) => [b.s, b.y])), 2));
    const modules = new THREE.InstancedMesh(geo, createModuleMaterial(u), boxes.length);
    const m = new THREE.Matrix4();
    boxes.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.s, b.y, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
      modules.setMatrixAt(i, m);
    });
    modules.frustumCulled = false;

    const slabGeo = new THREE.BoxGeometry(S_MAX - S_MIN, TOP, 0.5);
    slabGeo.translate((S_MIN + S_MAX) / 2, TOP / 2, -0.78);
    const slabMat = new THREE.MeshStandardMaterial({ color: "#0d131c", metalness: 0.8, roughness: 0.55, envMapIntensity: 0.5 });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    return { modules, slab };
  }, [u]);

  useEffect(
    () => () => {
      for (const mesh of [parts.modules, parts.slab]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      parts.modules.dispose();
    },
    [parts],
  );

  return (
    <group rotation-y={WALL.yaw}>
      <primitive object={parts.slab} />
      <primitive object={parts.modules} />
    </group>
  );
}
