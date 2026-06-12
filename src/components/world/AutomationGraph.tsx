"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  Points,
  QuadraticBezierCurve3,
  ShaderMaterial,
  Vector3,
} from "three";
import { useJourney } from "@/lib/store";

// CH4 (craft): an n8n-style automation graph floating behind the skills DOM —
// glowing nodes wired left→right with bright pulses streaming along the edges.

// Deterministic PRNG (same as Embers) so the graph is stable across renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GLOW_VERT = /* glsl */ `
  uniform float uSize;
  attribute float aSize;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * aSize / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const GLOW_FRAG = /* glsl */ `
  uniform float uAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * 0.3 * uAlpha;
    gl_FragColor = vec4(0.85, 0.47, 0.05, a);
  }
`;

const PULSE_VERT = /* glsl */ `
  uniform float uSize;
  attribute float aScale;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * aScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const PULSE_FRAG = /* glsl */ `
  uniform float uAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.18, 0.02, d);
    float halo = smoothstep(0.5, 0.06, d);
    vec3 col = mix(vec3(0.91, 0.59, 0.12), vec3(0.98, 0.86, 0.62), core);
    float a = (halo * 0.5 + core * 0.5) * uAlpha;
    gl_FragColor = vec4(col, a);
  }
`;

type NodeDef = {
  p: [number, number, number];
  box: boolean;
  mat: number; // 0 ember, 1 bright ember, 2 bone
  rot: number;
};

// Positions are relative to the group center at (0, 2, -16.5):
// world spread x -3.5..3.5, y 0.6..3.4, z -14..-19. Columns flow left→right.
const NODES: NodeDef[] = [
  { p: [-3.3, 0.1, 0.4], box: false, mat: 1, rot: 0.0 }, // trigger
  { p: [-1.9, 0.9, -1.2], box: true, mat: 0, rot: 0.35 },
  { p: [-1.7, -0.8, 1.3], box: false, mat: 2, rot: 0.6 },
  { p: [-0.3, 1.2, 0.2], box: true, mat: 0, rot: 0.15 },
  { p: [-0.2, -0.5, -1.8], box: false, mat: 0, rot: 0.8 },
  { p: [1.2, 0.5, 0.9], box: true, mat: 2, rot: 0.5 },
  { p: [1.5, -1.0, -0.8], box: false, mat: 0, rot: 0.25 },
  { p: [3.0, 0.8, -1.5], box: false, mat: 1, rot: 0.7 },
  { p: [3.2, -0.4, 1.0], box: true, mat: 0, rot: 0.4 },
];

// DAG, strictly left→right.
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 5],
  [4, 5],
  [4, 6],
  [5, 7],
  [5, 8],
  [6, 7],
  [6, 8],
];

const PULSE_COUNT = 14;
const LINE_SEGMENTS = 22;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Module-scope scratch vector — written and read within a single frame only.
const SCRATCH = new Vector3();

export default function AutomationGraph() {
  const groupRef = useRef<Group>(null);
  const lineMatRef = useRef<LineBasicMaterial>(null);
  const glowMatRef = useRef<ShaderMaterial>(null);
  const pulseMatRef = useRef<ShaderMaterial>(null);
  const pulsePointsRef = useRef<Points>(null);
  const nodeRefs = useRef<(Mesh | null)[]>([]);
  const energy = useRef(new Float32Array(NODES.length));

  const built = useMemo(() => {
    const rand = mulberry32(48104);

    // Curved wires with a gentle sag, like cabling between nodes.
    const curves = EDGES.map(([f, to]) => {
      const v0 = new Vector3(...NODES[f].p);
      const v2 = new Vector3(...NODES[to].p);
      const v1 = v0.clone().add(v2).multiplyScalar(0.5);
      v1.y -= 0.25 + rand() * 0.4;
      v1.z += (rand() - 0.5) * 0.7;
      return new QuadraticBezierCurve3(v0, v1, v2);
    });

    // One LineSegments draw call for every edge.
    const linePos = new Float32Array(curves.length * LINE_SEGMENTS * 2 * 3);
    const pt = new Vector3();
    const prev = new Vector3();
    let o = 0;
    for (const c of curves) {
      c.getPoint(0, prev);
      for (let s = 1; s <= LINE_SEGMENTS; s++) {
        c.getPoint(s / LINE_SEGMENTS, pt);
        linePos[o++] = prev.x;
        linePos[o++] = prev.y;
        linePos[o++] = prev.z;
        linePos[o++] = pt.x;
        linePos[o++] = pt.y;
        linePos[o++] = pt.z;
        prev.copy(pt);
      }
    }
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute("position", new BufferAttribute(linePos, 3));

    // One Points draw call: a soft additive glow behind every node.
    const glowPos = new Float32Array(NODES.length * 3);
    const glowSize = new Float32Array(NODES.length);
    NODES.forEach((n, i) => {
      glowPos[i * 3] = n.p[0];
      glowPos[i * 3 + 1] = n.p[1];
      glowPos[i * 3 + 2] = n.p[2];
      glowSize[i] = 0.75 + rand() * 0.7;
    });
    const glowGeo = new BufferGeometry();
    glowGeo.setAttribute("position", new BufferAttribute(glowPos, 3));
    glowGeo.setAttribute("aSize", new BufferAttribute(glowSize, 1));

    // Pulses: each gets an edge + speed + phase; (i * 5) % 13 covers all edges.
    const pulses = Array.from({ length: PULSE_COUNT }, (_, i) => ({
      edge: (i * 5) % curves.length,
      speed: 0.16 + rand() * 0.22,
      phase: rand(),
    }));
    const pulsePos = new Float32Array(PULSE_COUNT * 3);
    const pulseScale = new Float32Array(PULSE_COUNT);
    pulses.forEach((p, i) => {
      curves[p.edge].getPoint(p.phase, pt);
      pulsePos[i * 3] = pt.x;
      pulsePos[i * 3 + 1] = pt.y;
      pulsePos[i * 3 + 2] = pt.z;
      pulseScale[i] = 0.8 + rand() * 0.5;
    });
    const pulseGeo = new BufferGeometry();
    const pulseAttr = new BufferAttribute(pulsePos, 3);
    pulseAttr.setUsage(DynamicDrawUsage);
    pulseGeo.setAttribute("position", pulseAttr);
    pulseGeo.setAttribute("aScale", new BufferAttribute(pulseScale, 1));

    const octaGeo = new OctahedronGeometry(0.16, 0);
    const boxGeo = new BoxGeometry(0.22, 0.22, 0.22);

    const nodeMats = [
      new MeshBasicMaterial({ color: "#d97706", transparent: true, opacity: 0, depthWrite: false }),
      new MeshBasicMaterial({ color: "#e8961e", transparent: true, opacity: 0, depthWrite: false }),
      new MeshBasicMaterial({ color: "#f5f0ea", transparent: true, opacity: 0, depthWrite: false }),
    ];

    const glowUniforms = {
      uSize: { value: 250 },
      uAlpha: { value: 0 },
    };
    const pulseUniforms = {
      uSize: { value: 70 },
      uAlpha: { value: 0 },
    };

    return {
      curves,
      lineGeo,
      glowGeo,
      pulseGeo,
      pulses,
      octaGeo,
      boxGeo,
      nodeMats,
      glowUniforms,
      pulseUniforms,
    };
  }, []);

  // JSX-declared materials auto-dispose; these are constructed manually.
  useEffect(
    () => () => {
      built.lineGeo.dispose();
      built.glowGeo.dispose();
      built.pulseGeo.dispose();
      built.octaGeo.dispose();
      built.boxGeo.dispose();
      built.nodeMats.forEach((m) => m.dispose());
    },
    [built]
  );

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;

    const { chapter, chapterProgress } = useJourney.getState();
    // Ramp in over the last quarter of ch3, full through ch4, gone by mid ch5.
    let vis = 0;
    if (chapter === 3) vis = clamp01((chapterProgress - 0.75) * 4);
    else if (chapter === 4) vis = 1;
    else if (chapter === 5) vis = clamp01(1 - chapterProgress * 2);
    vis = vis * vis * (3 - 2 * vis);

    g.visible = vis > 0.01;
    if (!g.visible) return;

    const t = state.clock.elapsedTime;
    g.rotation.y = Math.sin(t * 0.1) * 0.05;
    g.scale.setScalar(0.92 + 0.08 * vis);

    // All per-frame mutation flows through object refs (react-hooks rules).
    if (glowMatRef.current) glowMatRef.current.uniforms.uAlpha.value = vis;
    if (pulseMatRef.current) pulseMatRef.current.uniforms.uAlpha.value = vis;
    if (lineMatRef.current) lineMatRef.current.opacity = 0.35 * vis;

    const en = energy.current;
    for (let i = 0; i < en.length; i++) en[i] *= 0.94;

    const pts = pulsePointsRef.current;
    if (pts) {
      const attr = pts.geometry.getAttribute("position") as BufferAttribute;
      const { pulses, curves } = built;
      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];
        const u = (t * p.speed + p.phase) % 1;
        curves[p.edge].getPoint(u, SCRATCH);
        attr.setXYZ(i, SCRATCH.x, SCRATCH.y, SCRATCH.z);
        // Nudge the target node as the pulse arrives.
        if (u > 0.9) {
          const target = EDGES[p.edge][1];
          const e = (u - 0.9) * 10;
          if (e > en[target]) en[target] = e;
        }
      }
      attr.needsUpdate = true;
    }

    for (let i = 0; i < NODES.length; i++) {
      const m = nodeRefs.current[i];
      if (m) {
        m.scale.setScalar(1 + en[i] * 0.35);
        (m.material as MeshBasicMaterial).opacity = 0.9 * vis;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 2, -16.5]} visible={false}>
      {NODES.map((n, i) => (
        <mesh
          key={i}
          position={n.p}
          rotation={[n.rot, n.rot * 1.7, 0]}
          geometry={n.box ? built.boxGeo : built.octaGeo}
          material={built.nodeMats[n.mat]}
          ref={(m) => {
            nodeRefs.current[i] = m;
          }}
        />
      ))}

      <lineSegments geometry={built.lineGeo} frustumCulled={false}>
        <lineBasicMaterial
          ref={lineMatRef}
          color="#a8a29e"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>

      <points geometry={built.glowGeo} frustumCulled={false}>
        <shaderMaterial
          ref={glowMatRef}
          vertexShader={GLOW_VERT}
          fragmentShader={GLOW_FRAG}
          uniforms={built.glowUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>

      <points ref={pulsePointsRef} geometry={built.pulseGeo} frustumCulled={false}>
        <shaderMaterial
          ref={pulseMatRef}
          vertexShader={PULSE_VERT}
          fragmentShader={PULSE_FRAG}
          uniforms={built.pulseUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
