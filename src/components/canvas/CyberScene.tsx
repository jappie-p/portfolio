"use client";
import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid, Html } from "@react-three/drei";
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

// named red attack lanes (stream in from the right, converge on the firewall)
const ATTACKS = [
  { y: 2.5, label: "DDoS VECTOR" },
  { y: 1.25, label: "PACKET FLOOD" },
  { y: 0.1, label: "RANSOMWARE PAYLOAD" },
  { y: -1.1, label: "BUFFER OVERFLOW" },
  { y: -2.4, label: "C&C COMMANDS" },
];

const N_RED = 1000;
const N_NODE = 64; // blue defense-network nodes
const N_SPARK = 700;
const RIGHT = 16;
const SZ = 4.5;

export function CyberScene() {
  const redRef = useRef<THREE.LineSegments>(null!);
  const sparkRef = useRef<THREE.Points>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const wallRef = useRef<THREE.Group>(null!);
  const netRef = useRef<THREE.Group>(null!);

  // --- red attack streaks: head+tail in geometry, speed read-only ---
  const redGeo = useMemo(() => {
    const pos = new Float32Array(N_RED * 2 * 3);
    const col = new Float32Array(N_RED * 2 * 3);
    for (let i = 0; i < N_RED; i++) {
      const lane = ATTACKS[i % ATTACKS.length];
      const hx = 3 + rng() * (RIGHT - 3);
      const hy = lane.y + (rng() - 0.5) * 0.6;
      const hz = (rng() - 0.5) * SZ;
      pos[i * 6] = hx; pos[i * 6 + 1] = hy; pos[i * 6 + 2] = hz;
      pos[i * 6 + 3] = hx + 1; pos[i * 6 + 4] = hy; pos[i * 6 + 5] = hz;
      col[i * 6] = 1.5; col[i * 6 + 1] = 0.35; col[i * 6 + 2] = 0.2; // hot head
      col[i * 6 + 3] = 0.3; col[i * 6 + 4] = 0.02; col[i * 6 + 5] = 0.0; // dim tail
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const redSpd = useMemo(() => {
    const s = new Float32Array(N_RED);
    for (let i = 0; i < N_RED; i++) s[i] = 6 + rng() * 9;
    return s;
  }, []);

  // --- blue defense network: nodes + nearest-neighbour links (static) ---
  const net = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    const isGreen: boolean[] = [];
    for (let i = 0; i < N_NODE; i++) {
      nodes.push(new THREE.Vector3(-2 - Math.pow(rng(), 0.7) * 12, (rng() - 0.5) * 6.5, (rng() - 0.5) * 6));
      isGreen.push(rng() < 0.16);
    }
    const nodePos = new Float32Array(N_NODE * 3);
    const nodeCol = new Float32Array(N_NODE * 3);
    nodes.forEach((n, i) => {
      nodePos[i * 3] = n.x; nodePos[i * 3 + 1] = n.y; nodePos[i * 3 + 2] = n.z;
      if (isGreen[i]) { nodeCol[i * 3] = 0.2; nodeCol[i * 3 + 1] = 1.2; nodeCol[i * 3 + 2] = 0.5; }
      else { nodeCol[i * 3] = 0.25; nodeCol[i * 3 + 1] = 0.7; nodeCol[i * 3 + 2] = 1.3; }
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute("color", new THREE.BufferAttribute(nodeCol, 3));

    // connect each node to its 2 nearest neighbours
    const lines: number[] = [];
    for (let i = 0; i < N_NODE; i++) {
      const d = nodes.map((n, j) => ({ j, dist: n.distanceTo(nodes[i]) })).filter((x) => x.j !== i).sort((a, b) => a.dist - b.dist);
      for (let k = 0; k < 2; k++) {
        const j = d[k].j;
        lines.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    return { nodeGeo, lineGeo };
  }, []);

  // --- impact sparks (pos in geom, vel/life in ref) ---
  const sparkGeo = useMemo(() => {
    const pos = new Float32Array(N_SPARK * 3).fill(9999);
    const col = new Float32Array(N_SPARK * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const sparkAux = useRef({ vel: new Float32Array(N_SPARK * 3), life: new Float32Array(N_SPARK), cursor: 0 });

  // radial red glow texture for the impact burst at the firewall
  const glowTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,150,90,0.9)");
    g.addColorStop(0.35, "rgba(255,70,50,0.45)");
    g.addColorStop(1, "rgba(255,40,40,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, []);

  const topic = useJourney((s) => s.topic);
  const live = topic === TOPIC_INDEX.cyber;

  useFrame((_, dtRaw) => {
    if (!live || !redRef.current || !sparkRef.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const t = Date.now() * 0.001;
    let impacts = 0;
    const aux = sparkAux.current;
    const sPos = sparkRef.current.geometry.attributes.position.array as Float32Array;

    // red streaks homing to the firewall (0,0,0)
    {
      const pos = redRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < N_RED; i++) {
        let hx = pos[i * 6], hy = pos[i * 6 + 1], hz = pos[i * 6 + 2];
        const len = Math.hypot(hx, hy, hz) || 1;
        const step = (redSpd[i] * dt) / len;
        hx -= hx * step; hy -= hy * step; hz -= hz * step;
        if (Math.hypot(hx, hy, hz) < 0.5) {
          impacts++;
          for (let k = 0; k < 2; k++) {
            const c = aux.cursor;
            aux.cursor = (c + 1) % N_SPARK;
            sPos[c * 3] = hx; sPos[c * 3 + 1] = hy; sPos[c * 3 + 2] = hz;
            aux.vel[c * 3] = (rng() - 0.2) * 7;
            aux.vel[c * 3 + 1] = (rng() - 0.5) * 9;
            aux.vel[c * 3 + 2] = (rng() - 0.5) * 6;
            aux.life[c] = 1;
          }
          const lane = ATTACKS[i % ATTACKS.length];
          hx = 3 + rng() * (RIGHT - 3);
          hy = lane.y + (rng() - 0.5) * 0.6;
          hz = (rng() - 0.5) * SZ;
        }
        const tl = Math.min(redSpd[i] * 0.1, 1.8);
        const hl = Math.hypot(hx, hy, hz) || 1;
        pos[i * 6] = hx; pos[i * 6 + 1] = hy; pos[i * 6 + 2] = hz;
        pos[i * 6 + 3] = hx + (hx / hl) * tl; pos[i * 6 + 4] = hy + (hy / hl) * tl; pos[i * 6 + 5] = hz + (hz / hl) * tl;
      }
      redRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // sparks
    {
      const col = sparkRef.current.geometry.attributes.color.array as Float32Array;
      for (let i = 0; i < N_SPARK; i++) {
        if (aux.life[i] <= 0) continue;
        aux.life[i] -= dt * 2.4;
        sPos[i * 3] += aux.vel[i * 3] * dt;
        sPos[i * 3 + 1] += aux.vel[i * 3 + 1] * dt;
        sPos[i * 3 + 2] += aux.vel[i * 3 + 2] * dt;
        aux.vel[i * 3] *= 0.9; aux.vel[i * 3 + 1] *= 0.9; aux.vel[i * 3 + 2] *= 0.9;
        const l = Math.max(aux.life[i], 0);
        col[i * 3] = 1.6 * l; col[i * 3 + 1] = l * l * 0.7; col[i * 3 + 2] = l * l * 0.4;
        if (aux.life[i] <= 0) sPos[i * 3] = 9999;
      }
      sparkRef.current.geometry.attributes.position.needsUpdate = true;
      sparkRef.current.geometry.attributes.color.needsUpdate = true;
    }

    // central impact glow pulses with the assault
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.35 + Math.min(impacts, 18) * 0.05 + Math.sin(t * 6) * 0.05;
      const s = 2.6 + Math.min(impacts, 18) * 0.12;
      glowRef.current.scale.setScalar(s);
    }
    if (wallRef.current) wallRef.current.scale.y = 1 + Math.min(impacts, 14) * 0.005;
    if (netRef.current) netRef.current.rotation.y = Math.sin(t * 0.1) * 0.12; // subtle life
  });

  return (
    <group scale={live ? 1 : 0.0001}>
      <Grid
        position={[0, -3.4, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#143f52"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#0e7490"
        fadeDistance={38}
        fadeStrength={2}
        infiniteGrid
      />

      {/* blue defense network (the protected side) */}
      <group ref={netRef}>
        <lineSegments geometry={net.lineGeo}>
          <lineBasicMaterial color={"#2b6f9e"} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
        <points geometry={net.nodeGeo}>
          <pointsMaterial size={0.16} vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
        </points>
      </group>

      {/* red attack streaks */}
      <lineSegments ref={redRef} geometry={redGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      {/* impact sparks */}
      <points ref={sparkRef} geometry={sparkGeo}>
        <pointsMaterial size={0.17} vertexColors transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>

      {/* central impact burst glow */}
      <mesh ref={glowRef} position={[0.3, 0, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTex} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* the firewall wall (Jasper's GLB) */}
      <group ref={wallRef}>
        <Suspense fallback={null}>
          <FirewallSentinel />
        </Suspense>
        <pointLight color={0x9fd8ff} intensity={1.9} distance={18} position={[-2, 2.5, 6]} />
        <pointLight color={0xf87171} intensity={0.9} distance={16} position={[7, 0.5, 3]} />
        <directionalLight color={0xdfeeff} intensity={0.7} position={[-3, 5, 5]} />
      </group>

      {/* named attack-vector labels (DOM, only while the topic is live) */}
      {live &&
        ATTACKS.map((a) => (
          <Html key={a.label} position={[RIGHT - 2.5, a.y, 0]} center zIndexRange={[5, 0]}>
            <div
              style={{
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: "#ff9a8a",
                textShadow: "0 0 8px rgba(248,113,113,0.6)",
                whiteSpace: "nowrap",
                opacity: 0.8,
              }}
            >
              ▸ {a.label}
            </div>
          </Html>
        ))}

      <ambientLight intensity={0.32} />
    </group>
  );
}
