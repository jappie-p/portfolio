"use client";
import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { FirewallSentinel } from "./FirewallSentinel";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

// named attack beams, streaming in from the right, converging on the firewall (0,0,0)
const ATTACKS = [
  { label: "DDoS VECTOR", sy: 3.2, sz: 1.6 },
  { label: "PACKET FLOOD", sy: 1.7, sz: -1.4 },
  { label: "RANSOMWARE PAYLOAD", sy: 0.2, sz: 2.2 },
  { label: "BUFFER OVERFLOW", sy: -1.4, sz: -1.8 },
  { label: "C&C COMMANDS", sy: -2.8, sz: 0.9 },
];
const NB = ATTACKS.length;
const SX = 15; // beam start x (right)
const N_RED = 950; // streak particles across all beams
const N_SPARK = 800;

export function CyberScene({
  progressRef,
  active,
}: {
  /** 0..1 scroll-scrub position; flies the camera from a wide shot to a close 3/4. */
  progressRef?: { current: number };
  /** run the sim + show the scene only while the cyber section is near the viewport. */
  active: boolean;
}) {
  const redRef = useRef<THREE.LineSegments>(null!);
  const sparkRef = useRef<THREE.Points>(null!);
  const wallRef = useRef<THREE.Group>(null!);
  const glowGroupRef = useRef<THREE.Group>(null!);

  // beam geometry: start (right) -> end (wall), unit dir
  const beams = useMemo(
    () =>
      ATTACKS.map((a) => {
        const start = new THREE.Vector3(SX, a.sy, a.sz);
        const end = new THREE.Vector3(0, a.sy * 0.16, 0); // fan slightly into the wall
        const dir = end.clone().sub(start).normalize();
        return { start, end, dir, label: a.label };
      }),
    [],
  );

  // per-streak read-only data + initial u, all derived once
  const redData = useMemo(() => {
    const beam = new Int16Array(N_RED);
    const off = new Float32Array(N_RED * 3); // perpendicular offset (tube)
    const spd = new Float32Array(N_RED); // u per second
    const u0 = new Float32Array(N_RED);
    for (let i = 0; i < N_RED; i++) {
      beam[i] = i % NB;
      const r = Math.pow(rng(), 0.6) * 0.5;
      const ang = rng() * 6.283;
      off[i * 3] = 0;
      off[i * 3 + 1] = Math.cos(ang) * r;
      off[i * 3 + 2] = Math.sin(ang) * r;
      spd[i] = 0.28 + rng() * 0.55;
      u0[i] = rng();
    }
    return { beam, off, spd, u0 };
  }, []);

  const redGeo = useMemo(() => {
    const pos = new Float32Array(N_RED * 2 * 3);
    const col = new Float32Array(N_RED * 2 * 3);
    for (let i = 0; i < N_RED; i++) {
      col[i * 6] = 1.6; col[i * 6 + 1] = 0.4; col[i * 6 + 2] = 0.2; // hot head
      col[i * 6 + 3] = 0.3; col[i * 6 + 4] = 0.02; col[i * 6 + 5] = 0.0; // dim tail
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  const redU = useRef(redData.u0.slice()); // mutable copy of the initial flow params
  const beamHeat = useRef(new Float32Array(NB));

  // --- blue "code wall" on the left: rows of glowing dashes (lines of code) ---
  const codeGeo = useMemo(() => {
    const segs: number[] = [];
    const cols: number[] = [];
    const ROWS = 34;
    for (let r = 0; r < ROWS; r++) {
      const y = -4.6 + (r / (ROWS - 1)) * 9.2;
      const layers = 3;
      for (let L = 0; L < layers; L++) {
        const z = -3 + L * 2.6 + (rng() - 0.5);
        let x = -13 + rng() * 1.5;
        const green = rng() < 0.14;
        while (x < -0.6) {
          const len = 0.25 + rng() * 1.4; // token length
          const x2 = Math.min(x + len, -0.4);
          segs.push(x, y, z, x2, y, z);
          const c = green ? [0.25, 1.2, 0.5] : [0.2, 0.65, 1.25];
          cols.push(...c, ...c);
          x = x2 + 0.18 + rng() * 0.5; // gap between tokens
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    return g;
  }, []);

  // --- impact sparks ---
  const sparkGeo = useMemo(() => {
    const pos = new Float32Array(N_SPARK * 3).fill(9999);
    const col = new Float32Array(N_SPARK * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const sparkAux = useRef({ vel: new Float32Array(N_SPARK * 3), life: new Float32Array(N_SPARK), cursor: 0 });

  const glowTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,160,90,0.95)");
    g.addColorStop(0.35, "rgba(255,70,45,0.5)");
    g.addColorStop(1, "rgba(255,40,40,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, []);

  const live = active;

  useFrame((state, dtRaw) => {
    // Scroll-scrub: fly the camera from a wide establishing shot (p=0) to a
    // close 3/4 angle on the firewall (p=1). Resolution-independent, so crisp
    // at any screen size.
    if (live) {
      const p = progressRef?.current ?? 0;
      state.camera.position.set(lerp(6, 4, p), lerp(3.4, 1.6, p), lerp(19, 10, p));
      state.camera.lookAt(0, 0.3, 0);
    }
    if (!live || !redRef.current || !sparkRef.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const aux = sparkAux.current;
    const u = redU.current;
    const heat = beamHeat.current;
    const sPos = sparkRef.current.geometry.attributes.position.array as Float32Array;
    for (let b = 0; b < NB; b++) heat[b] *= 0.94;

    // beams: particles flow start -> wall, burst on arrival
    {
      const pos = redRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < N_RED; i++) {
        const b = redData.beam[i];
        const B = beams[b];
        u[i] += redData.spd[i] * dt;
        if (u[i] >= 1) {
          u[i] -= 1;
          heat[b] = Math.min(heat[b] + 1, 16);
          const c = aux.cursor;
          aux.cursor = (c + 1) % N_SPARK;
          sPos[c * 3] = B.end.x; sPos[c * 3 + 1] = B.end.y; sPos[c * 3 + 2] = B.end.z;
          aux.vel[c * 3] = -(1 + rng() * 6); aux.vel[c * 3 + 1] = (rng() - 0.5) * 9; aux.vel[c * 3 + 2] = (rng() - 0.5) * 6;
          aux.life[c] = 1;
        }
        const uu = u[i];
        const px = B.start.x + (B.end.x - B.start.x) * uu + redData.off[i * 3];
        const py = B.start.y + (B.end.y - B.start.y) * uu + redData.off[i * 3 + 1];
        const pz = B.start.z + (B.end.z - B.start.z) * uu + redData.off[i * 3 + 2];
        const tl = 0.7;
        pos[i * 6] = px; pos[i * 6 + 1] = py; pos[i * 6 + 2] = pz;
        pos[i * 6 + 3] = px - B.dir.x * tl; pos[i * 6 + 4] = py - B.dir.y * tl; pos[i * 6 + 5] = pz - B.dir.z * tl;
      }
      redRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // sparks
    {
      const col = sparkRef.current.geometry.attributes.color.array as Float32Array;
      for (let i = 0; i < N_SPARK; i++) {
        if (aux.life[i] <= 0) continue;
        aux.life[i] -= dt * 2.4;
        sPos[i * 3] += aux.vel[i * 3] * dt; sPos[i * 3 + 1] += aux.vel[i * 3 + 1] * dt; sPos[i * 3 + 2] += aux.vel[i * 3 + 2] * dt;
        aux.vel[i * 3] *= 0.9; aux.vel[i * 3 + 1] *= 0.9; aux.vel[i * 3 + 2] *= 0.9;
        const l = Math.max(aux.life[i], 0);
        col[i * 3] = 1.6 * l; col[i * 3 + 1] = l * l * 0.7; col[i * 3 + 2] = l * l * 0.4;
        if (aux.life[i] <= 0) sPos[i * 3] = 9999;
      }
      sparkRef.current.geometry.attributes.position.needsUpdate = true;
      sparkRef.current.geometry.attributes.color.needsUpdate = true;
    }

    // per-beam impact glow + wall brace
    if (glowGroupRef.current) {
      let total = 0;
      glowGroupRef.current.children.forEach((child, b) => {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = 0.25 + heat[b] * 0.07;
        const s = 1.8 + heat[b] * 0.22;
        child.scale.setScalar(s);
        total += heat[b];
      });
      if (wallRef.current) wallRef.current.scale.y = 1 + Math.min(total, 30) * 0.003;
    }
  });

  return (
    <group scale={live ? 1 : 0.0001}>
      <Grid
        position={[0, -3.6, 0]}
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.45}
        cellColor="#123a4d"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#0e7490"
        fadeDistance={42}
        fadeStrength={2}
        infiniteGrid
      />

      {/* blue code wall (the backend building the firewall) */}
      <lineSegments geometry={codeGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      {/* red attack beams */}
      <lineSegments ref={redRef} geometry={redGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      {/* impact sparks */}
      <points ref={sparkRef} geometry={sparkGeo}>
        <pointsMaterial size={0.16} vertexColors transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>

      {/* per-beam impact burst glows at the wall */}
      <group ref={glowGroupRef}>
        {beams.map((B) => (
          <mesh key={B.label} position={[B.end.x + 0.2, B.end.y, B.end.z + 0.3]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={glowTex} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* the firewall wall (Jasper's GLB), turned at an angle */}
      <group ref={wallRef} rotation={[0, -0.55, 0.04]}>
        <Suspense fallback={null}>
          <FirewallSentinel />
        </Suspense>
        <pointLight color={0x9fd8ff} intensity={1.9} distance={18} position={[-2, 2.5, 6]} />
        <pointLight color={0xf87171} intensity={1.1} distance={16} position={[6, 0.5, 4]} />
        <directionalLight color={0xdfeeff} intensity={0.7} position={[-3, 5, 5]} />
      </group>

      {/* named attack-vector labels at each beam start (DOM, only while live) */}
      {live &&
        beams.map((B) => (
          <Html key={B.label} position={[B.start.x - 1, B.start.y, B.start.z]} center zIndexRange={[5, 0]}>
            <div
              style={{
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                fontSize: "11px",
                letterSpacing: "0.16em",
                color: "#ffb0a0",
                textShadow: "0 0 10px rgba(248,80,60,0.7)",
                whiteSpace: "nowrap",
                opacity: 0.9,
              }}
            >
              ▸ {B.label}
            </div>
          </Html>
        ))}

      <ambientLight intensity={0.34} />
    </group>
  );
}
