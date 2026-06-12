"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
} from "three";
import { useJourney } from "@/lib/store";

// CH5 finale: a guarded perimeter — radar sweep on the ground, wireframe
// shield dome, intruder blips that flash as the sweep passes (a nod to the
// honeypot project). Centered at (0, 0, -21), brightest action center/right.

const TAU = Math.PI * 2;
const CENTER: [number, number, number] = [0, 0, -21];
const RADAR_Y = -0.18; // just above the world ground at -0.22
const RADAR_RADIUS = 5;
const SWEEP_SPEED = TAU / 6; // one revolution every 6s

// Fixed intruder positions (x, z offsets from group center), biased
// center/right since the DOM contact block sits lower-left.
const BLIP_XZ: [number, number][] = [
  [2.2, 0.6],
  [3.0, -1.0],
  [1.2, -2.8],
  [-1.6, -1.8],
  [0.4, 2.9],
  [2.5, 2.6],
];
// The blip that gets "caught" (turns red 2 of every 10 sweeps).
const RED_INDEX = 1;
// Polar angle of each blip in the radar shader's frame. The disc is a
// CircleGeometry rotated -PI/2 about X, so local (x, y) maps to world
// (x, -z): shader angle = atan2(-dz, dx).
const BLIP_ANGLES = BLIP_XZ.map(([dx, dz]) => Math.atan2(-dz, dx));

const RADAR_VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy / ${RADAR_RADIUS.toFixed(1)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RADAR_FRAG = /* glsl */ `
  uniform float uSweep;
  uniform float uVis;
  varying vec2 vP;
  #define TAU 6.2831853

  void main() {
    float r = length(vP);
    float ang = atan(vP.y, vP.x);

    // Faint polar grid: 3 concentric rings + 8 spokes, dim bone.
    float grid = 0.0;
    grid += 1.0 - smoothstep(0.0, 0.014, abs(r - 0.30));
    grid += 1.0 - smoothstep(0.0, 0.014, abs(r - 0.60));
    grid += 1.0 - smoothstep(0.0, 0.014, abs(r - 0.90));
    float m = mod(ang, TAU / 8.0);
    float sd = min(m, TAU / 8.0 - m) * r; // arc-length distance to spoke
    grid += (1.0 - smoothstep(0.0, 0.012, sd)) * step(0.06, r);
    grid = min(grid, 1.0);

    // Rotating sweep wedge: bright leading edge, exponential trail ~80deg.
    float d = mod(uSweep - ang, TAU);
    float trail = exp(-d * 4.5); // ~0.002 at 80deg behind the edge
    float lead = exp(-d * 42.0);

    // Soft radial falloff to nothing at the rim, soften the very center.
    float fall = (1.0 - smoothstep(0.58, 1.0, r)) * smoothstep(0.0, 0.05, r);

    vec3 bone = vec3(0.659, 0.635, 0.620);    // #a8a29e
    vec3 ember = vec3(0.851, 0.463, 0.024);   // #d97706
    vec3 emberHi = vec3(0.910, 0.588, 0.118); // #e8961e

    vec3 rgb = bone * grid * 0.15 + ember * trail * 0.35 + emberHi * lead * 0.3;
    gl_FragColor = vec4(rgb * fall, uVis);
  }
`;

const BLIP_VERT = /* glsl */ `
  attribute float aIntensity;
  attribute float aRed;
  varying float vI;
  varying float vRed;
  void main() {
    vI = aIntensity;
    vRed = aRed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (34.0 + aIntensity * 52.0) / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const BLIP_FRAG = /* glsl */ `
  uniform float uVis;
  varying float vI;
  varying float vRed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.17, 0.02, d);
    float halo = smoothstep(0.5, 0.06, d) * 0.4;
    vec3 base = mix(vec3(0.851, 0.463, 0.024), vec3(0.863, 0.149, 0.149), vRed);
    vec3 hot = mix(vec3(0.910, 0.588, 0.118), vec3(1.0, 0.36, 0.26), vRed);
    float a = (core + halo) * (0.12 + vI * 0.88) * uVis;
    gl_FragColor = vec4(mix(base, hot, core), a);
  }
`;

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    float v = pow(1.0 - vUv.y, 1.6); // fade to nothing at the top
    float h = 1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5));
    gl_FragColor = vec4(vec3(0.88, 0.24, 0.16), v * h * uAlpha);
  }
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function CyberGrid() {
  const group = useRef<Group>(null);
  const dome = useRef<Mesh>(null);
  const domeMat = useRef<MeshBasicMaterial>(null);
  const radarMat = useRef<ShaderMaterial>(null);
  const blipMat = useRef<ShaderMaterial>(null);
  const beamMatA = useRef<ShaderMaterial>(null);
  const beamMatB = useRef<ShaderMaterial>(null);
  const intensityAttr = useRef<BufferAttribute>(null);
  const redAttr = useRef<BufferAttribute>(null);
  const beamLevel = useRef(0);

  // Static, deterministic buffers for the blip points (JSX-attached below,
  // so R3F owns their lifecycle/disposal).
  const { blipPositions, blipIntensities, blipReds } = useMemo(() => {
    const n = BLIP_XZ.length;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = BLIP_XZ[i][0];
      positions[i * 3 + 1] = RADAR_Y + 0.08; // hover just above the disc
      positions[i * 3 + 2] = BLIP_XZ[i][1];
    }
    return {
      blipPositions: positions,
      blipIntensities: new Float32Array(n),
      blipReds: new Float32Array(n),
    };
  }, []);

  const radarUniforms = useMemo(
    () => ({ uSweep: { value: 0 }, uVis: { value: 0 } }),
    []
  );
  const blipUniforms = useMemo(() => ({ uVis: { value: 0 } }), []);
  const beamUniformsA = useMemo(() => ({ uAlpha: { value: 0 } }), []);
  const beamUniformsB = useMemo(() => ({ uAlpha: { value: 0 } }), []);

  useFrame((state, delta) => {
    const { chapter, chapterProgress } = useJourney.getState();
    // Ramp in during the second half of craft (ch4), full through contact
    // (ch5) — the finale never fades out.
    const raw =
      chapter < 4
        ? 0
        : chapter === 4
          ? clamp01((chapterProgress - 0.5) * 2)
          : 1;
    const vis = raw * raw * (3 - 2 * raw);

    const g = group.current;
    if (g) g.visible = vis > 0.01;
    if (radarMat.current) radarMat.current.uniforms.uVis.value = vis;
    if (blipMat.current) blipMat.current.uniforms.uVis.value = vis;
    if (!g || !g.visible) {
      if (beamMatA.current) beamMatA.current.uniforms.uAlpha.value = 0;
      if (beamMatB.current) beamMatB.current.uniforms.uAlpha.value = 0;
      return;
    }

    const t = state.clock.elapsedTime;
    const sweep = (t * SWEEP_SPEED) % TAU;
    if (radarMat.current) radarMat.current.uniforms.uSweep.value = sweep;

    if (dome.current) dome.current.rotation.y = t * 0.02;
    if (domeMat.current) domeMat.current.opacity = 0.08 * vis;

    // The caught intruder: red for sweeps 4-5 of every 10.
    const cycle = Math.floor((t * SWEEP_SPEED) / TAU) % 10;
    const redActive = cycle === 4 || cycle === 5;

    // Blips: fast attack as the sweep line crosses their angle, slow decay.
    const iAttr = intensityAttr.current;
    let redIntensity = 0;
    if (iAttr) {
      const intensities = iAttr.array as Float32Array;
      const decay = Math.exp(-delta * 0.55);
      for (let i = 0; i < BLIP_ANGLES.length; i++) {
        const d = (((sweep - BLIP_ANGLES[i]) % TAU) + TAU) % TAU;
        if (d < 0.14) intensities[i] = 1;
        else intensities[i] *= decay;
      }
      redIntensity = intensities[RED_INDEX];
      iAttr.needsUpdate = true;
    }

    const rAttr = redAttr.current;
    if (rAttr) {
      const reds = rAttr.array as Float32Array;
      const rv = redActive ? 1 : 0;
      if (reds[RED_INDEX] !== rv) {
        reds[RED_INDEX] = rv;
        rAttr.needsUpdate = true;
      }
    }

    // Beam rises from the red blip while it is caught + lit.
    const target = redActive ? redIntensity : 0;
    beamLevel.current += (target - beamLevel.current) * Math.min(1, delta * 4);
    const beamAlpha = beamLevel.current * 0.16 * vis;
    if (beamMatA.current) beamMatA.current.uniforms.uAlpha.value = beamAlpha;
    if (beamMatB.current) beamMatB.current.uniforms.uAlpha.value = beamAlpha;
  });

  const beamX = BLIP_XZ[RED_INDEX][0];
  const beamZ = BLIP_XZ[RED_INDEX][1];

  return (
    <group ref={group} position={CENTER} visible={false}>
      {/* Radar disc: polar grid + rotating sweep wedge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, RADAR_Y, 0]}>
        <circleGeometry args={[RADAR_RADIUS, 64]} />
        <shaderMaterial
          ref={radarMat}
          vertexShader={RADAR_VERT}
          fragmentShader={RADAR_FRAG}
          uniforms={radarUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Shield dome: barely-there wireframe, lower half hidden by the ground */}
      <mesh ref={dome} position={[0, RADAR_Y, 0]}>
        <icosahedronGeometry args={[4.2, 1]} />
        <meshBasicMaterial
          ref={domeMat}
          color="#a8a29e"
          wireframe
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Intruder blips */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[blipPositions, 3]} />
          <bufferAttribute
            ref={intensityAttr}
            attach="attributes-aIntensity"
            args={[blipIntensities, 1]}
          />
          <bufferAttribute
            ref={redAttr}
            attach="attributes-aRed"
            args={[blipReds, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={blipMat}
          vertexShader={BLIP_VERT}
          fragmentShader={BLIP_FRAG}
          uniforms={blipUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>

      {/* Crossed gradient planes: thin light beam over the caught intruder */}
      <mesh position={[beamX, RADAR_Y + 1.2, beamZ]}>
        <planeGeometry args={[0.18, 2.4]} />
        <shaderMaterial
          ref={beamMatA}
          vertexShader={BEAM_VERT}
          fragmentShader={BEAM_FRAG}
          uniforms={beamUniformsA}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh
        position={[beamX, RADAR_Y + 1.2, beamZ]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[0.18, 2.4]} />
        <shaderMaterial
          ref={beamMatB}
          vertexShader={BEAM_VERT}
          fragmentShader={BEAM_FRAG}
          uniforms={beamUniformsB}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
