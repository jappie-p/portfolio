"use client";
import type * as THREE from "three";
import { MeshRefractionMaterial } from "@react-three/drei";
import type { Kit } from "./kit";
import type { Placement, StonesPlan } from "./layout";

const QUARTZ_IOR = 1.544;

/**
 * Refraction is the costly shader here, and a cluster's points stand in
 * front of one another: its depth goes down first (renderOrder -1, depth
 * only), so the traced shader runs once per pixel, for the nearest face.
 * Marked transparent (it draws fully opaque), it also stays out of the
 * transmission pass the rose quartz needs, which would trace it again.
 */
function Crystal({ geometry, env, bounces, aberration, fast, look, prepass }: {
  geometry: THREE.BufferGeometry;
  env: THREE.Texture;
  bounces: number;
  aberration: number;
  fast: boolean;
  look: Kit["clear"];
  prepass: THREE.Material;
}) {
  return (
    <>
      <mesh geometry={geometry} material={prepass} renderOrder={-1} />
      <mesh key={geometry.uuid} geometry={geometry}>
        <MeshRefractionMaterial envMap={env} bounces={bounces} ior={QUARTZ_IOR} aberrationStrength={aberration} fastChroma={fast} vertexColors transparent {...look} />
      </mesh>
    </>
  );
}

function Stone({ p, kit, env, lite }: { p: Placement; kit: Kit; env: THREE.Texture; lite: boolean }) {
  const place = { position: [p.x, 0, p.z] as [number, number, number], rotation: [0, p.yaw, 0] as [number, number, number] };
  switch (p.kind) {
    case "cluster": {
      const { matrix, crystals } = kit.cluster(p.seed, p.scale);
      return (
        <group {...place}>
          <mesh geometry={matrix} material={p.far ? kit.matrixFar : kit.matrix} />
          {p.far ? (
            <mesh geometry={crystals} material={kit.amethystFar} />
          ) : (
            <Crystal geometry={crystals} env={env} bounces={lite ? 1 : 2} aberration={0.01} fast look={kit.amethyst} prepass={kit.prepass} />
          )}
        </group>
      );
    }
    case "point":
    case "lying": {
      return (
        <group {...place}>
          <Crystal geometry={kit.geometry(p.kind, p.seed, p.scale)} env={env} bounces={lite ? 2 : 3} aberration={0.007} fast={lite} look={kit.clear} prepass={kit.prepass} />
        </group>
      );
    }
    case "palm":
      return <mesh geometry={kit.geometry("palm", p.seed, p.scale)} material={kit.labradorite} {...place} />;
    case "tumbled":
      return <mesh geometry={kit.geometry("tumbled", p.seed, p.scale)} material={p.far ? kit.roseFar : kit.rose} {...place} />;
    case "slice": {
      const s = kit.slice(p.seed, p.scale);
      return (
        <group {...place}>
          <mesh geometry={s.stand} material={kit.stand} />
          <mesh geometry={s.slice} material={[s.face, kit.rind]} position={[0, s.pose.y, 0]} rotation={[-s.pose.lean, 0, 0]} />
        </group>
      );
    }
  }
}

/** The slate and the stones on it, as the plan sets them out. */
export function Stones({ plan, kit, env }: { plan: StonesPlan; kit: Kit; env: THREE.Texture }) {
  return (
    <>
      {kit.slate && (
        <mesh rotation-x={-Math.PI / 2} material={kit.slate.material}>
          <planeGeometry args={[300, 300]} />
        </mesh>
      )}
      {plan.stones.map((p, i) => (
        <Stone key={`${p.kind}-${p.seed}-${i}`} p={p} kit={kit} env={env} lite={plan.lite} />
      ))}
    </>
  );
}
