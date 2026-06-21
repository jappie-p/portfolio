"use client";
import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import { useJourney } from "@/lib/store";
import { TOPIC_INDEX } from "@/lib/chapters";
import { FirewallSentinel } from "./FirewallSentinel";

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

const N_RED = 1500; // attacker comet streaks
const N_BLUE = 1200; // defender field
const N_SPARK = 800; // impact sparks
const WALL = 0;
const RIGHT = 17;
const SY = 5.5;
const SZ = 5;

/** Full-blast firewall battle: red attacker code streaks in and shatters into
 *  sparks against the shield line; a blue defender field holds behind it; all
 *  glowing via bloom over a Tron grid floor. Jasper's GLB wall is the center.
 *  Mutable sim state lives in geometry buffers (via refs) + plain refs, never in
 *  useMemo, per the project's react-hooks purity lint. */
export function CyberScene() {
  const redRef = useRef<THREE.LineSegments>(null!);
  const blueRef = useRef<THREE.Points>(null!);
  const sparkRef = useRef<THREE.Points>(null!);
  const membraneRef = useRef<THREE.Mesh>(null!);
  const wallRef = useRef<THREE.Group>(null!);

  // red streak geometry (head + tail per streak) — head positions are mutated
  // in-place via the ref each frame.
  const redGeo = useMemo(() => {
    const pos = new Float32Array(N_RED * 2 * 3);
    const col = new Float32Array(N_RED * 2 * 3);
    for (let i = 0; i < N_RED; i++) {
      const hx = WALL + rng() * (RIGHT - WALL);
      const hy = (rng() - 0.5) * SY;
      const hz = (rng() - 0.5) * SZ;
      pos[i * 6] = hx; pos[i * 6 + 1] = hy; pos[i * 6 + 2] = hz;
      pos[i * 6 + 3] = hx + 1; pos[i * 6 + 4] = hy; pos[i * 6 + 5] = hz;
      col[i * 6] = 1.4; col[i * 6 + 1] = 0.3; col[i * 6 + 2] = 0.3; // hot head
      col[i * 6 + 3] = 0.35; col[i * 6 + 4] = 0.02; col[i * 6 + 5] = 0.02; // dim tail
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const redSpd = useMemo(() => {
    const s = new Float32Array(N_RED);
    for (let i = 0; i < N_RED; i++) s[i] = 7 + rng() * 11;
    return s;
  }, []);

  const blue = useMemo(() => {
    const pos = new Float32Array(N_BLUE * 3);
    const base = new Float32Array(N_BLUE * 3);
    const ph = new Float32Array(N_BLUE);
    for (let i = 0; i < N_BLUE; i++) {
      const x = -0.4 - Math.pow(rng(), 0.6) * 11;
      const y = (rng() - 0.5) * SY;
      const z = (rng() - 0.5) * SZ;
      base[i * 3] = pos[i * 3] = x;
      base[i * 3 + 1] = pos[i * 3 + 1] = y;
      base[i * 3 + 2] = pos[i * 3 + 2] = z;
      ph[i] = rng() * 6.283;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { g, base, ph };
  }, []);

  const sparkGeo = useMemo(() => {
    const pos = new Float32Array(N_SPARK * 3).fill(9999);
    const col = new Float32Array(N_SPARK * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  // mutable auxiliary spark state (velocity, life, ring cursor) — refs, not memo
  const sparkAux = useRef({ vel: new Float32Array(N_SPARK * 3), life: new Float32Array(N_SPARK), cursor: 0 });

  const topic = useJourney((s) => s.topic);
  const live = topic === TOPIC_INDEX.cyber;

  useFrame((_, dtRaw) => {
    if (!live || !redRef.current || !blueRef.current || !sparkRef.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const t = Date.now() * 0.001;
    let impacts = 0;
    const aux = sparkAux.current;
    const sPos = sparkRef.current.geometry.attributes.position.array as Float32Array;

    // red attacker streaks (head + tail stored in the line geometry)
    {
      const pos = redRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < N_RED; i++) {
        let hx = pos[i * 6] - redSpd[i] * dt;
        let hy = pos[i * 6 + 1] + Math.sin(t * 4 + i) * 0.012;
        let hz = pos[i * 6 + 2];
        if (hx <= WALL + 0.25) {
          impacts++;
          for (let k = 0; k < 2; k++) {
            const c = aux.cursor;
            aux.cursor = (c + 1) % N_SPARK;
            sPos[c * 3] = WALL + 0.1;
            sPos[c * 3 + 1] = hy + (k ? (rng() - 0.5) : 0);
            sPos[c * 3 + 2] = hz;
            aux.vel[c * 3] = -(2 + rng() * 5);
            aux.vel[c * 3 + 1] = (rng() - 0.5) * 8;
            aux.vel[c * 3 + 2] = (rng() - 0.5) * 5;
            aux.life[c] = 1;
          }
          hx = RIGHT - rng() * 2.5;
          hy = (rng() - 0.5) * SY;
          hz = (rng() - 0.5) * SZ;
        }
        const tail = Math.min(redSpd[i] * 0.13, 2.6);
        pos[i * 6] = hx; pos[i * 6 + 1] = hy; pos[i * 6 + 2] = hz;
        pos[i * 6 + 3] = hx + tail; pos[i * 6 + 4] = hy; pos[i * 6 + 5] = hz;
      }
      redRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // blue defender field
    {
      const pos = blueRef.current.geometry.attributes.position.array as Float32Array;
      const { base, ph } = blue;
      for (let i = 0; i < N_BLUE; i++) {
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.9 + ph[i]) * 0.22;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.cos(t * 0.7 + ph[i]) * 0.14;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 0.5 + ph[i]) * 0.1;
      }
      blueRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // sparks (position in geometry, velocity/life in ref)
    {
      const col = sparkRef.current.geometry.attributes.color.array as Float32Array;
      for (let i = 0; i < N_SPARK; i++) {
        if (aux.life[i] <= 0) continue;
        aux.life[i] -= dt * 2.2;
        sPos[i * 3] += aux.vel[i * 3] * dt;
        sPos[i * 3 + 1] += aux.vel[i * 3 + 1] * dt;
        sPos[i * 3 + 2] += aux.vel[i * 3 + 2] * dt;
        aux.vel[i * 3] *= 0.9; aux.vel[i * 3 + 1] *= 0.9; aux.vel[i * 3 + 2] *= 0.9;
        const l = Math.max(aux.life[i], 0);
        col[i * 3] = 1.4 * l; col[i * 3 + 1] = l * l * 0.6; col[i * 3 + 2] = l * l * 0.5;
        if (aux.life[i] <= 0) sPos[i * 3] = 9999;
      }
      sparkRef.current.geometry.attributes.position.needsUpdate = true;
      sparkRef.current.geometry.attributes.color.needsUpdate = true;
    }

    if (membraneRef.current) {
      const m = membraneRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + Math.min(impacts, 16) * 0.022 + Math.sin(t * 5) * 0.02;
    }
    if (wallRef.current) wallRef.current.scale.y = 1 + Math.min(impacts, 14) * 0.006;
  });

  return (
    <group scale={live ? 1 : 0.0001}>
      <Grid
        position={[0, -3.2, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.55}
        cellColor="#15455a"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#0e7490"
        fadeDistance={36}
        fadeStrength={2}
        infiniteGrid
      />

      <lineSegments ref={redRef} geometry={redGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      <points ref={blueRef} geometry={blue.g}>
        <pointsMaterial size={0.075} color={"#38bdf8"} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>

      <points ref={sparkRef} geometry={sparkGeo}>
        <pointsMaterial size={0.18} vertexColors transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>

      <mesh ref={membraneRef} position={[0.15, 0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SZ + 3, SY + 2.5]} />
        <meshBasicMaterial color={"#5fe3ef"} transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <group ref={wallRef}>
        <Suspense fallback={null}>
          <FirewallSentinel />
        </Suspense>
        <pointLight color={0x6fe9ff} intensity={5} distance={16} position={[0, 1.5, 5]} />
        <pointLight color={0xf87171} intensity={1.8} distance={16} position={[7, 0.5, 3]} />
        <directionalLight color={0xcfeeff} intensity={0.9} position={[-3, 5, 5]} />
      </group>

      <ambientLight intensity={0.32} />
    </group>
  );
}
