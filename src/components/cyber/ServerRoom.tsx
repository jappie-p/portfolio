"use client";
import { useEffect, useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { floorTextures, rackTextures } from "./lib/textures";
import { hdr } from "./lib/palette";

type Rack = { x: number; z: number; ry: number };

function rackLayout(): Rack[] {
  const racks: Rack[] = [];
  for (let x = -13; x <= 15; x += 1.3) racks.push({ x, z: -13, ry: 0 });
  for (let x = -16; x <= 18; x += 1.3) racks.push({ x, z: -20, ry: 0 });
  for (let z = -10; z <= 2; z += 1.3) racks.push({ x: -13, z, ry: Math.PI / 2 });
  for (let z = -10; z <= -1; z += 1.3) racks.push({ x: 14, z, ry: -Math.PI / 2 });
  // two racks in the foreground, bottom left of the establishing shot
  racks.push({ x: -6.2, z: 4.5, ry: 0.55 }, { x: -7.35, z: 3.75, ry: 0.55 });
  return racks;
}

const RACK = { w: 1.05, h: 2.5, d: 1 };

/** The data centre around the firewall: glossy tiled floor and rows of racks. */
export function ServerRoom() {
  const { tier } = useSim();

  const res = useMemo(() => {
    const floor = floorTextures(9);
    const rackTex = rackTextures();
    const racks = rackLayout();
    const body = new THREE.InstancedMesh(
      new THREE.BoxGeometry(RACK.w, RACK.h, RACK.d),
      new THREE.MeshStandardMaterial({ color: "#121a25", metalness: 0.8, roughness: 0.45, envMapIntensity: 0.6 }),
      racks.length,
    );
    const front = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(RACK.w * 0.9, RACK.h * 0.94),
      new THREE.MeshStandardMaterial({
        map: rackTex.map,
        emissiveMap: rackTex.emissive,
        emissive: hdr(1.6, 1.6, 1.6),
        metalness: 0.6,
        roughness: 0.35,
        envMapIntensity: 0.5,
      }),
      racks.length,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    racks.forEach((r, i) => {
      q.setFromAxisAngle(up, r.ry);
      m.compose(new THREE.Vector3(r.x, RACK.h / 2, r.z), q, new THREE.Vector3(1, 1, 1));
      body.setMatrixAt(i, m);
      const face = new THREE.Vector3(0, 0, RACK.d / 2 + 0.005).applyQuaternion(q);
      m.compose(new THREE.Vector3(r.x, RACK.h / 2, r.z).add(face), q, new THREE.Vector3(1, 1, 1));
      front.setMatrixAt(i, m);
    });
    body.frustumCulled = front.frustumCulled = false;

    return { floor, rackTex, body, front };
  }, []);

  useEffect(
    () => () => {
      Object.values(res.floor).forEach((t) => t.dispose());
      Object.values(res.rackTex).forEach((t) => t.dispose());
      for (const mesh of [res.body, res.front]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    },
    [res],
  );

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[2, 0, -4]}>
        <planeGeometry args={[72, 60]} />
        {tier === "high" ? (
          <MeshReflectorMaterial
            resolution={512}
            blur={[200, 60]}
            mixBlur={0.6}
            mixStrength={10}
            mixContrast={1.1}
            mirror={0.8}
            depthScale={1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.3}
            color="#9fb4d0"
            metalness={0.15}
            roughness={0.9}
            map={res.floor.map}
            roughnessMap={res.floor.roughness}
          />
        ) : (
          <meshStandardMaterial color="#0d1520" metalness={0.7} roughness={0.35} map={res.floor.map} roughnessMap={res.floor.roughness} envMapIntensity={0.8} />
        )}
      </mesh>
      <primitive object={res.body} />
      <primitive object={res.front} />
    </>
  );
}
