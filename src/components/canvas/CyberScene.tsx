"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useJourney } from "@/lib/store";
import { TOPIC_INDEX } from "@/lib/chapters";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x5eed1234);

const N_ATT = 1100; // red attackers
const N_DEF = 700; // blue defenders
const WALL_X = 0; // firewall plane
const RIGHT = 13;
const LEFT = -13;
const SPREAD_Y = 5.2;
const SPREAD_Z = 4;

/** Procedural firewall battle: red attacker code streams in from the right and
 *  shatters against the blue firewall wall; blue defender code drifts behind it.
 *  Placeholder centerpiece (hex shield ring) stands in for the Sentinel GLB. */
export function CyberScene() {
  const attRef = useRef<THREE.Points>(null!);
  const defRef = useRef<THREE.Points>(null!);
  const wallRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const sweepRef = useRef<THREE.Mesh>(null!);

  const att = useMemo(() => {
    const pos = new Float32Array(N_ATT * 3);
    const spd = new Float32Array(N_ATT);
    for (let i = 0; i < N_ATT; i++) {
      pos[i * 3] = WALL_X + rng() * (RIGHT - WALL_X) + 0.5;
      pos[i * 3 + 1] = (rng() - 0.5) * SPREAD_Y;
      pos[i * 3 + 2] = (rng() - 0.5) * SPREAD_Z;
      spd[i] = 2.5 + rng() * 4;
    }
    return { pos, spd };
  }, []);

  const def = useMemo(() => {
    const pos = new Float32Array(N_DEF * 3);
    const base = new Float32Array(N_DEF * 3);
    const ph = new Float32Array(N_DEF);
    for (let i = 0; i < N_DEF; i++) {
      const x = LEFT + rng() * (WALL_X - LEFT - 0.5);
      const y = (rng() - 0.5) * SPREAD_Y;
      const z = (rng() - 0.5) * SPREAD_Z;
      base[i * 3] = pos[i * 3] = x;
      base[i * 3 + 1] = pos[i * 3 + 1] = y;
      base[i * 3 + 2] = pos[i * 3 + 2] = z;
      ph[i] = rng() * Math.PI * 2;
    }
    return { pos, base, ph };
  }, []);

  const attGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(att.pos, 3));
    return g;
  }, [att]);
  const defGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(def.pos, 3));
    return g;
  }, [def]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = Date.now() * 0.001;
    let impact = 0;

    // attackers: stream left toward the wall, shatter and respawn on the right
    if (attRef.current) {
      const arr = attRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < N_ATT; i++) {
        arr[i * 3] -= att.spd[i] * dt;
        arr[i * 3 + 1] += Math.sin(t * 2 + i) * 0.004; // slight jitter = chaos
        if (arr[i * 3] <= WALL_X + 0.2) {
          impact++;
          arr[i * 3] = RIGHT - rng() * 1.5;
          arr[i * 3 + 1] = (rng() - 0.5) * SPREAD_Y;
          arr[i * 3 + 2] = (rng() - 0.5) * SPREAD_Z;
        }
      }
      attRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // defenders: orderly drift behind the wall
    if (defRef.current) {
      const arr = defRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < N_DEF; i++) {
        arr[i * 3] = def.base[i * 3] + Math.sin(t * 0.8 + def.ph[i]) * 0.15;
        arr[i * 3 + 1] = def.base[i * 3 + 1] + Math.cos(t * 0.6 + def.ph[i]) * 0.1;
      }
      defRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // firewall reacts to the assault
    if (wallRef.current) {
      const flex = 1 + Math.min(impact, 12) * 0.012 + Math.sin(t * 3) * 0.02;
      wallRef.current.scale.set(1, flex, 1);
    }
    if (ringRef.current) ringRef.current.rotation.z = t * 0.4;
    if (sweepRef.current) sweepRef.current.rotation.z = -t * 0.9;
  });

  // only animate while the cyber topic is in view (cheap visibility guard)
  const topic = useJourney((s) => s.topic);
  const dim = topic === TOPIC_INDEX.cyber ? 1 : 0.0;

  return (
    <group scale={dim < 0.5 ? 0.0001 : 1}>
      {/* red attacker code */}
      <points ref={attRef} geometry={attGeo}>
        <pointsMaterial size={0.075} color={"#f87171"} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      {/* blue defender code */}
      <points ref={defRef} geometry={defGeo}>
        <pointsMaterial size={0.06} color={"#38bdf8"} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>

      {/* firewall wall + hex shield ring (placeholder for the Sentinel GLB) */}
      <group ref={wallRef}>
        <mesh>
          <boxGeometry args={[0.12, SPREAD_Y + 1.5, 0.12]} />
          <meshBasicMaterial color={"#5fe3ef"} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={ringRef}>
          <torusGeometry args={[1.6, 0.05, 8, 6]} />
          <meshBasicMaterial color={"#18b4c4"} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight color={0x18b4c4} intensity={3} distance={9} />
      </group>

      {/* radar sweep ring on the floor */}
      <mesh ref={sweepRef} position={[0, -2.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 5, 48, 1, 0, Math.PI / 3]} />
        <meshBasicMaterial color={"#0e7490"} transparent opacity={0.25} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <ambientLight intensity={0.4} />
    </group>
  );
}
