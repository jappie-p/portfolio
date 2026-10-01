"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/cyber/lib/rng";
import { useAiSim } from "./sim";
import { HASH, NOISE } from "./lib/glsl";
import { Label } from "./Label";

// The space around the core: a violet nebula dome, far stars, dust drifting
// through the light, a holographic floor of rings under the core that turns
// green when the hub takes over, and the core's name floating above it.

// The nebula is low-frequency, so its noise is worked out per vertex and
// interpolated: a full-screen fbm per pixel cost a fifth of the frame at 2x.
const DOME_VERT = /* glsl */ `
uniform float uTime;
varying vec3 vDir;
varying float vN;
${HASH}
${NOISE}
void main() {
  vDir = normalize(position);
  vN = fbm(vDir * 2.6 + vec3(0.0, uTime * 0.01, 0.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const DOME_FRAG = /* glsl */ `
uniform float uHub;
varying vec3 vDir;
varying float vN;
void main() {
  vec3 d = normalize(vDir);
  float band = exp(-abs(d.y + 0.08) * 3.2);
  vec3 deep = vec3(0.012, 0.008, 0.035);
  vec3 violet = mix(vec3(0.16, 0.07, 0.36), vec3(0.05, 0.2, 0.16), uHub);
  vec3 col = deep + violet * pow(vN, 2.2) * (0.75 + band * 1.1) + vec3(0.1, 0.05, 0.22) * band * 0.35;
  gl_FragColor = vec4(col, 1.0);
}
`;

const STAR_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aPhase;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vA = 0.45 + 0.55 * sin(uTime * (0.6 + aPhase) + aPhase * 40.0);
  gl_PointSize = aSize * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;
const STAR_FRAG = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, r) * vA;
  gl_FragColor = vec4(vec3(0.8, 0.85, 1.0) * a, a);
}
`;

const DUST_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aSpeed;
varying float vA;
void main() {
  vec3 p = position;
  p.y = mod(p.y + uTime * aSpeed + 7.0, 14.0) - 7.0;
  p.x += sin(uTime * 0.2 + position.z) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float edge = smoothstep(7.0, 5.0, abs(p.y));
  vA = edge * smoothstep(0.8, 3.0, -mv.z) * 0.5;
  gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;
const DUST_FRAG = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, r) * vA;
  gl_FragColor = vec4(vec3(0.7, 0.72, 1.0) * a, a);
}
`;

const FLOOR_VERT = /* glsl */ `
varying vec2 vP;
void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FLOOR_FRAG = /* glsl */ `
uniform float uTime;
uniform float uHub;
uniform float uBoot;
varying vec2 vP;
void main() {
  float r = length(vP);
  float ang = atan(vP.y, vP.x);
  float rings = exp(-pow(fract(r / 1.4) - 0.5, 2.0) * 900.0);
  float ticks = step(0.985, fract(ang / 6.2831853 * 72.0)) * step(0.8, fract(r / 1.4)) ;
  // a radar sweep turning round the core
  float sweep = pow(fract((ang / 6.2831853) - uTime * 0.07), 8.0);
  float fall = smoothstep(14.0, 3.0, r) * smoothstep(1.2, 3.2, r);
  float on = smoothstep(0.0, 6.0, uBoot) ;
  vec3 col = mix(vec3(0.45, 0.35, 1.0), vec3(0.3, 0.95, 0.55), uHub);
  float a = (rings * 0.32 + ticks * 0.4 + sweep * 0.22) * fall * on;
  gl_FragColor = vec4(col * a, a);
}
`;

export function Environment() {
  const { u, state, labels, tier } = useAiSim();
  const jarvisText = useRef<THREE.Mesh>(null!);
  const hubText = useRef<THREE.Mesh>(null!);
  const floor = useRef<THREE.Mesh>(null!);

  const built = useMemo(() => {
    const rnd = mulberry32(3);
    const dome = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      uniforms: { uTime: u.uTime, uHub: u.uHub },
      side: THREE.BackSide,
      depthWrite: false,
    });

    const nStars = tier === "low" ? 600 : 1300;
    const sp = new Float32Array(nStars * 3);
    const ss = new Float32Array(nStars);
    const sph = new Float32Array(nStars);
    for (let i = 0; i < nStars; i++) {
      const y = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const r = 70 + rnd() * 10;
      const ring = Math.sqrt(1 - y * y);
      sp.set([Math.cos(th) * ring * r, y * r * 0.8, Math.sin(th) * ring * r], i * 3);
      ss[i] = 1 + rnd() * rnd() * 3.2;
      sph[i] = rnd();
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    starGeo.setAttribute("aSize", new THREE.BufferAttribute(ss, 1));
    starGeo.setAttribute("aPhase", new THREE.BufferAttribute(sph, 1));
    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: { uTime: u.uTime, uPixelRatio: u.uPixelRatio },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const nDust = tier === "low" ? 160 : 380;
    const dp = new Float32Array(nDust * 3);
    const ds = new Float32Array(nDust);
    const dsp = new Float32Array(nDust);
    for (let i = 0; i < nDust; i++) {
      dp.set([(rnd() - 0.5) * 34, (rnd() - 0.5) * 14, (rnd() - 0.5) * 30], i * 3);
      ds[i] = 1.5 + rnd() * 3.5;
      dsp[i] = 0.05 + rnd() * 0.18;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    dustGeo.setAttribute("aSize", new THREE.BufferAttribute(ds, 1));
    dustGeo.setAttribute("aSpeed", new THREE.BufferAttribute(dsp, 1));
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: { uTime: u.uTime, uPixelRatio: u.uPixelRatio },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const floorMat = new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      uniforms: { uTime: u.uTime, uHub: u.uHub, uBoot: u.uBoot },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return { dome, starGeo, starMat, dustGeo, dustMat, floorMat };
  }, [u, tier]);

  useEffect(
    () => () => {
      Object.values(built).forEach((o) => o.dispose());
    },
    [built],
  );

  useFrame(({ camera }) => {
    // the name above the core follows the chapter
    const j = jarvisText.current;
    const h = hubText.current;
    for (const [mesh, mix] of [
      [j, 0],
      [h, state.hub],
    ] as const) {
      if (!mesh) continue;
      (mesh.material as THREE.MeshBasicMaterial).opacity = mix;
      mesh.visible = mix > 0.01;
      mesh.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group>
      <mesh material={built.dome} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[90, 96, 64]} />
      </mesh>
      <points geometry={built.starGeo} material={built.starMat} frustumCulled={false} />
      <points geometry={built.dustGeo} material={built.dustMat} frustumCulled={false} />
      <mesh ref={floor} material={built.floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.6, 0]}>
        <planeGeometry args={[30, 30]} />
      </mesh>
      <Label ref={jarvisText} text={labels.jarvis.hub.toUpperCase()} size={0.5} spacing={0.22} color="#dff9ff" position={[0, 3.55, 0]} />
      <Label ref={hubText} text={labels.hub.hub.toUpperCase()} size={0.5} spacing={0.22} color="#dcffe9" position={[0, 3.55, 0]} />
    </group>
  );
}
