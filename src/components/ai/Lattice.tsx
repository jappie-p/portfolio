"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAiSim } from "./sim";
import { latticeLayout } from "./lib/ai-math";
import { mulberry32 } from "@/components/cyber/lib/rng";
import { BOOT, HASH, WAKE } from "./lib/glsl";

// The neural network around the core: a shell of nodes linked to their
// nearest neighbours. Signals run along the links as bright dashes and as
// sparks, the whole field breathes, and a wake pulse lights it up ring by
// ring from the core outward. Everything moves on the GPU.

const EDGE_VERT = /* glsl */ `
uniform float uTime;
attribute float aT;
attribute float aPhase;
attribute float aSpeed;
attribute float aSeed;
attribute float aDist;
varying float vT;
varying float vPhase;
varying float vSpeed;
varying float vSeed;
varying float vDist;
varying float vFade;
void main() {
  vT = aT; vPhase = aPhase; vSpeed = aSpeed; vSeed = aSeed; vDist = aDist;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFade = smoothstep(1.5, 5.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const EDGE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uBoot;
uniform vec2 uWake;
uniform float uEnergy;
uniform vec3 uBase;
uniform vec3 uSignal;
varying float vT;
varying float vPhase;
varying float vSpeed;
varying float vSeed;
varying float vDist;
varying float vFade;
${HASH}
${BOOT}
${WAKE}
void main() {
  float cycle = uTime * vSpeed + vPhase;
  // only some links carry a signal each cycle, and busier with more energy
  float on = step(1.0 - 0.55 * uEnergy, hash11(vSeed * 13.7 + floor(cycle)));
  float d = vT - fract(cycle);
  float dash = exp(-d * d * 260.0) * on;
  float wave = wakeRing(vDist, uWake, uTime);
  float boot = bootMask(vDist, uBoot);
  vec3 col = uBase * (0.35 + 0.65 * uEnergy) + uSignal * (dash * 2.4 + wave * 2.2);
  float a = (0.16 + dash * 0.9 + wave * 0.55) * boot * vFade;
  gl_FragColor = vec4(col * a, a);
}
`;

const NODE_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uBoot;
uniform vec2 uWake;
attribute float aSize;
attribute float aPhase;
attribute float aDist;
varying float vGlow;
varying float vFade;
${BOOT}
${WAKE}
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aPhase * 0.6) + aPhase * 6.283);
  float wave = wakeRing(aDist, uWake, uTime);
  vGlow = twinkle * 0.95 + wave * 2.2;
  vFade = bootMask(aDist, uBoot) * smoothstep(1.2, 4.0, -mv.z);
  gl_PointSize = aSize * uPixelRatio * (1.0 + wave * 0.8) * (16.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const NODE_FRAG = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uSignal;
varying float vGlow;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float core = smoothstep(0.18, 0.0, r);
  float halo = exp(-r * r * 18.0) * 0.55;
  vec3 col = mix(uBase * 1.6, uSignal * 2.6, clamp(vGlow - 0.6, 0.0, 1.0)) * (core + halo);
  float a = (core + halo) * vFade * (0.35 + 0.65 * vGlow);
  gl_FragColor = vec4(col * a, a);
}
`;

// Sparks ride a subset of the links, from one node to the other.
const SPARK_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uBoot;
uniform float uEnergy;
attribute vec3 aA;
attribute vec3 aB;
attribute float aPhase;
attribute float aSpeed;
varying float vA;
${BOOT}
void main() {
  float x = fract(uTime * aSpeed + aPhase);
  vec3 p = mix(aA, aB, x);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float ends = smoothstep(0.0, 0.12, x) * smoothstep(1.0, 0.88, x);
  vA = ends * bootMask(length(p), uBoot) * smoothstep(1.2, 4.0, -mv.z) * (0.4 + 0.6 * uEnergy);
  gl_PointSize = 3.2 * uPixelRatio * (22.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const SPARK_FRAG = /* glsl */ `
uniform vec3 uSignal;
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, r) * vA;
  gl_FragColor = vec4(uSignal * 3.2 * a, a);
}
`;

const BASE = new THREE.Color("#6d4dff");
const SIGNAL = new THREE.Color("#5eead4");

export function Lattice() {
  const { u, tier, still } = useAiSim();
  const group = useRef<THREE.Group>(null!);

  const built = useMemo(() => {
    const { nodes, edges } = latticeLayout(tier === "low" ? 170 : 260);
    const rnd = mulberry32(5);
    const nEdges = edges.length / 2;
    const dist = (i: number) => Math.hypot(nodes[i * 3], nodes[i * 3 + 1], nodes[i * 3 + 2]);

    // links: two vertices each, attributes shared per link
    const pos = new Float32Array(nEdges * 6);
    const t = new Float32Array(nEdges * 2);
    const phase = new Float32Array(nEdges * 2);
    const speed = new Float32Array(nEdges * 2);
    const seed = new Float32Array(nEdges * 2);
    const edist = new Float32Array(nEdges * 2);
    for (let e = 0; e < nEdges; e++) {
      const a = edges[e * 2];
      const b = edges[e * 2 + 1];
      pos.set([nodes[a * 3], nodes[a * 3 + 1], nodes[a * 3 + 2], nodes[b * 3], nodes[b * 3 + 1], nodes[b * 3 + 2]], e * 6);
      t.set([0, 1], e * 2);
      const ph = rnd();
      const sp = 0.18 + rnd() * 0.35;
      phase.set([ph, ph], e * 2);
      speed.set([sp, sp], e * 2);
      seed.set([e, e], e * 2);
      const mid = (dist(a) + dist(b)) / 2;
      edist.set([mid, mid], e * 2);
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    edgeGeo.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    edgeGeo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    edgeGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    edgeGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    edgeGeo.setAttribute("aDist", new THREE.BufferAttribute(edist, 1));

    const nNodes = nodes.length / 3;
    const size = new Float32Array(nNodes);
    const nPhase = new Float32Array(nNodes);
    const nDist = new Float32Array(nNodes);
    for (let i = 0; i < nNodes; i++) {
      size[i] = 7 + rnd() * 12;
      nPhase[i] = rnd();
      nDist[i] = dist(i);
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodes, 3));
    nodeGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    nodeGeo.setAttribute("aPhase", new THREE.BufferAttribute(nPhase, 1));
    nodeGeo.setAttribute("aDist", new THREE.BufferAttribute(nDist, 1));

    // sparks on every third link, a few of them doubled up
    const picks: number[] = [];
    for (let e = 0; e < nEdges; e += 3) picks.push(e);
    const nSparks = picks.length;
    const aA = new Float32Array(nSparks * 3);
    const aB = new Float32Array(nSparks * 3);
    const sPhase = new Float32Array(nSparks);
    const sSpeed = new Float32Array(nSparks);
    picks.forEach((e, k) => {
      const flip = rnd() < 0.5;
      const a = edges[e * 2 + (flip ? 1 : 0)];
      const b = edges[e * 2 + (flip ? 0 : 1)];
      aA.set([nodes[a * 3], nodes[a * 3 + 1], nodes[a * 3 + 2]], k * 3);
      aB.set([nodes[b * 3], nodes[b * 3 + 1], nodes[b * 3 + 2]], k * 3);
      sPhase[k] = rnd();
      sSpeed[k] = 0.25 + rnd() * 0.45;
    });
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nSparks * 3), 3));
    sparkGeo.setAttribute("aA", new THREE.BufferAttribute(aA, 3));
    sparkGeo.setAttribute("aB", new THREE.BufferAttribute(aB, 3));
    sparkGeo.setAttribute("aPhase", new THREE.BufferAttribute(sPhase, 1));
    sparkGeo.setAttribute("aSpeed", new THREE.BufferAttribute(sSpeed, 1));
    sparkGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    const common = { uBase: { value: BASE }, uSignal: { value: SIGNAL } };
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
    const edgeMat = new THREE.ShaderMaterial({
      vertexShader: EDGE_VERT,
      fragmentShader: EDGE_FRAG,
      uniforms: { uTime: u.uTime, uBoot: u.uBoot, uWake: u.uWake, uEnergy: u.uEnergy, ...common },
      ...additive,
    });
    const nodeMat = new THREE.ShaderMaterial({
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      uniforms: { uTime: u.uTime, uBoot: u.uBoot, uWake: u.uWake, uPixelRatio: u.uPixelRatio, ...common },
      ...additive,
    });
    const sparkMat = new THREE.ShaderMaterial({
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      uniforms: { uTime: u.uTime, uBoot: u.uBoot, uEnergy: u.uEnergy, uPixelRatio: u.uPixelRatio, ...common },
      ...additive,
    });
    return { edgeGeo, nodeGeo, sparkGeo, edgeMat, nodeMat, sparkMat };
  }, [u, tier]);

  useEffect(
    () => () => {
      Object.values(built).forEach((o) => o.dispose());
    },
    [built],
  );

  // the field sways instead of spinning, so it always stays behind the core
  useFrame(() => {
    if (still) return;
    const t = u.uTime.value;
    group.current.rotation.y = Math.sin(t * 0.045) * 0.22;
    group.current.rotation.x = 0.06 + Math.sin(t * 0.031 + 1) * 0.05;
  });

  return (
    <group ref={group} rotation={[0.06, 0, 0]}>
      <lineSegments geometry={built.edgeGeo} material={built.edgeMat} frustumCulled={false} />
      <points geometry={built.nodeGeo} material={built.nodeMat} frustumCulled={false} />
      <points geometry={built.sparkGeo} material={built.sparkMat} frustumCulled={false} />
    </group>
  );
}
