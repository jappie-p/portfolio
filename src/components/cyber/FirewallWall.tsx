"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { WALL } from "./lib/layout";
import { buildWallCells, type Cell } from "./lib/hex";
import { WALL_ICON_COUNT } from "./lib/icons";
import { hexFaceGeometry, hexFrameGeometry, nutGeometry } from "./lib/geometry";
import { createBezelMaterial, createFaceMaterial } from "./lib/wall-materials";
import { mulberry32 } from "./lib/rng";

const RING_INNER = 0.35;
const FACE_R = 0.4;
const NUT_R = 0.022;
const NUTS_PER_CELL = 6;

function instanceAttrs(g: THREE.BufferGeometry, cells: Cell[], repeat = 1) {
  const pick = (f: (c: Cell) => number[]) => {
    const values = cells.flatMap((c) => Array.from({ length: repeat }, () => f(c)).flat());
    return new THREE.InstancedBufferAttribute(Float32Array.from(values), f(cells[0]).length);
  };
  g.setAttribute("aS", pick((c) => [c.s]));
  g.setAttribute("aSeed", pick((c) => [c.seed]));
  g.setAttribute("aIcon", pick((c) => [c.icon]));
  // the cell centre drives knock-back, ripples and power-on for every part of the cell
  g.setAttribute("aCenter", pick((c) => [c.s, c.y]));
}

/** The honeycomb firewall: ~150 chamfered steel cells with smoked-glass faces
 *  and etched glowing icons, in three instanced draw calls. The cells react in
 *  the vertex shader (knocked back by hits, popped by the shockwave). */
export function FirewallWall() {
  const { u, atlas } = useSim();

  const meshes = useMemo(() => {
    const cells = buildWallCells({ ...WALL, iconCount: WALL_ICON_COUNT });
    const n = cells.length;

    const frameGeo = hexFrameGeometry({ outer: WALL.cellR, inner: RING_INNER, depth: 0.4, bevel: 0.05, bevelDepth: 0.06 });
    const faceGeo = hexFaceGeometry(FACE_R);
    faceGeo.translate(0, 0, -0.07);
    const nutGeo = nutGeometry(NUT_R);
    instanceAttrs(frameGeo, cells);
    instanceAttrs(faceGeo, cells);
    instanceAttrs(nutGeo, cells, NUTS_PER_CELL);

    const bezelMat = createBezelMaterial(u);
    const faceMat = createFaceMaterial(u, atlas, FACE_R);

    const frames = new THREE.InstancedMesh(frameGeo, bezelMat, n);
    const faces = new THREE.InstancedMesh(faceGeo, faceMat, n);
    const nuts = new THREE.InstancedMesh(nutGeo, bezelMat, n * NUTS_PER_CELL);

    const rnd = mulberry32(77);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    const nutR = (WALL.cellR + RING_INNER) / 2;
    cells.forEach((c, i) => {
      e.set((rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.06, 0);
      q.setFromEuler(e);
      m.compose(p.set(c.s, c.y, c.lift), q, one);
      frames.setMatrixAt(i, m);
      faces.setMatrixAt(i, m);
      for (let k = 0; k < NUTS_PER_CELL; k++) {
        const a = (k * Math.PI) / 3;
        const local = new THREE.Matrix4().makeTranslation(Math.cos(a) * nutR, Math.sin(a) * nutR, 0.012);
        nuts.setMatrixAt(i * NUTS_PER_CELL + k, m.clone().multiply(local));
      }
    });
    for (const mesh of [frames, faces, nuts]) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.needsUpdate = true;
    }
    return { frames, faces, nuts };
  }, [u, atlas]);

  useEffect(
    () => () => {
      for (const mesh of Object.values(meshes)) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    },
    [meshes],
  );

  return (
    <group rotation-y={WALL.yaw}>
      <primitive object={meshes.frames} />
      <primitive object={meshes.faces} />
      <primitive object={meshes.nuts} />
    </group>
  );
}
