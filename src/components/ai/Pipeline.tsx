"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAiSim } from "./sim";
import { PIPE_SOURCES, PIPE_TARGETS, type Vec3 } from "./lib/ai-math";
import { ATLAS_COLS, ATLAS_ROWS, ICON, iconAtlas, iconUv, type IconName } from "./lib/ai-icons";
import { mulberry32 } from "@/components/cyber/lib/rng";
import { Label } from "./Label";

// The Jarvis chapter, left to right: the iPhone app, mail and agenda feed the
// core as glowing packets; what comes out goes to Claude and to a push
// notification. Five routes, each a flowing curve with packets riding it.

const CORE: Vec3 = [0, 0, 0];
const IN: IconName[] = ["app", "mail", "agenda"];
const OUT: IconName[] = ["claude", "push"];
const CYAN = new THREE.Color("#5eead4");
const GREEN = new THREE.Color("#4ade80");

type Route = { a: Vec3; c: Vec3; b: Vec3; icon: IconName; out: boolean };

// routes bow sideways, away from the middle, so they read as separate streams
const side = (x: number, y: number, z: number): Vec3 => [x, y, z];
const ROUTES: Route[] = [
  ...PIPE_SOURCES.map((a, i) => ({ a, c: side(a[0] * 1.35, a[1] * 0.35, a[2] + 1), b: CORE, icon: IN[i], out: false })),
  ...PIPE_TARGETS.map((b, i) => ({ a: CORE, c: side(b[0] * 1.5, b[1] * 0.3, b[2] + 1), b, icon: OUT[i], out: true })),
];

const CURVE_VERT = /* glsl */ `
attribute float aT;
varying float vT;
void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const CURVE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uMix;
uniform vec3 uColor;
uniform float uOut;
varying float vT;
void main() {
  float s = fract(vT * 14.0 - uTime * 1.4);
  float dash = smoothstep(0.0, 0.05, s) * smoothstep(0.5, 0.35, s);
  // fade out inside the orb, at whichever end the core is
  float nearCore = uOut > 0.5 ? vT : 1.0 - vT;
  float fade = smoothstep(0.0, 0.18, nearCore) * smoothstep(1.0, 0.9, 1.0 - nearCore);
  float a = (0.12 + dash * 0.6) * fade * uMix;
  gl_FragColor = vec4(uColor * a * 1.6, a);
}
`;

const PACKET_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uMix;
uniform vec3 uA[5];
uniform vec3 uC[5];
uniform vec3 uB[5];
attribute float aRoute;
attribute float aPhase;
attribute float aSpeed;
attribute float aIcon;
varying float vIcon;
varying float vA;
varying float vOut;
void main() {
  int r = int(aRoute + 0.5);
  float t = fract(uTime * aSpeed + aPhase);
  float u = 1.0 - t;
  vec3 p = u * u * uA[r] + 2.0 * u * t * uC[r] + t * t * uB[r];
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vOut = aRoute > 2.5 ? 1.0 : 0.0;
  // shrink into the core on the way in, grow out of it on the way out
  float nearCore = vOut > 0.5 ? t : 1.0 - t;
  float grow = smoothstep(0.0, 0.25, nearCore) * smoothstep(1.0, 0.85, 1.0 - nearCore);
  vA = grow * uMix;
  vIcon = aIcon;
  gl_PointSize = 34.0 * uPixelRatio * grow * (14.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;
const PACKET_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uIn;
uniform vec3 uOutColor;
varying float vIcon;
varying float vA;
varying float vOut;
void main() {
  vec2 pc = gl_PointCoord;
  float col = mod(vIcon, ${ATLAS_COLS}.0);
  float row = floor(vIcon / ${ATLAS_COLS}.0);
  // the icon takes the middle of the sprite, a glow disc sits behind it
  vec2 iuv = (pc - 0.5) * 1.45 + 0.5;
  float inside = step(0.0, iuv.x) * step(iuv.x, 1.0) * step(0.0, iuv.y) * step(iuv.y, 1.0);
  vec2 uv = vec2((col + iuv.x) / ${ATLAS_COLS}.0, 1.0 - (row + iuv.y) / ${ATLAS_ROWS}.0);
  float icon = texture2D(uAtlas, uv).a * inside;
  float r = length(pc - 0.5);
  float disc = smoothstep(0.5, 0.36, r) * 0.28;
  float glow = exp(-r * r * 10.0) * 0.5;
  vec3 tint = mix(uIn, uOutColor, vOut);
  vec3 c = tint * (disc + glow) + vec3(1.0) * icon * 1.4;
  float a = clamp(disc + glow + icon, 0.0, 1.0) * vA;
  gl_FragColor = vec4(c * a, a);
}
`;

function curveGeometry(r: Route, seg = 64) {
  const pos = new Float32Array((seg + 1) * 3);
  const t = new Float32Array(seg + 1);
  for (let i = 0; i <= seg; i++) {
    const x = i / seg;
    const u = 1 - x;
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = u * u * r.a[k] + 2 * u * x * r.c[k] + x * x * r.b[k];
    t[i] = x;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
  return g;
}

/** A portal at one end of the pipeline: a hexagon with its icon and label. */
function Portal({ at, icon, label, color, atlas, mix }: { at: Vec3; icon: IconName; label: string; color: THREE.Color; atlas: THREE.Texture; mix: { value: number } }) {
  const group = useRef<THREE.Group>(null!);
  const text = useRef<THREE.Mesh>(null!);
  const parts = useMemo(() => {
    const hex = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        return new THREE.Vector3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
      }),
    );
    const edge = new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const fill = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(0.16), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const map = atlas.clone();
    const uv = iconUv(icon);
    map.offset.set(...uv.offset);
    map.repeat.set(...uv.repeat);
    map.needsUpdate = true;
    const glyph = new THREE.MeshBasicMaterial({ map, color: color.clone().lerp(new THREE.Color(1, 1, 1), 0.6).multiplyScalar(1.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return { hex, edge, fill, glyph, map, line: new THREE.Line(hex, edge) };
  }, [atlas, color, icon]);
  useEffect(
    () => () => {
      Object.values(parts).forEach((p) => (p as { dispose?: () => void }).dispose?.());
    },
    [parts],
  );

  useFrame(({ camera }) => {
    group.current.quaternion.copy(camera.quaternion);
    const m = mix.value;
    parts.edge.opacity = m;
    parts.fill.opacity = 0.9 * m;
    parts.glyph.opacity = m;
    group.current.visible = m > 0.01;
    group.current.scale.setScalar(0.7 + 0.3 * m);
    if (text.current) (text.current.material as THREE.MeshBasicMaterial).opacity = m;
  });

  return (
    <group ref={group} position={at}>
      <primitive object={parts.line} />
      <mesh material={parts.fill}>
        <circleGeometry args={[0.9, 6, Math.PI / 6]} />
      </mesh>
      <mesh material={parts.glyph} position={[0, 0, 0.01]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>
      <Label ref={text} text={label.toUpperCase()} size={0.3} color="#dbe7ee" anchor="top" position={[0, -1.15, 0]} />
    </group>
  );
}

export function Pipeline() {
  const { u, labels, still } = useAiSim();
  const atlas = useMemo(() => iconAtlas(), []);
  useEffect(() => () => atlas.dispose(), [atlas]);
  const mix = useMemo(() => ({ value: 0 }), []);

  const built = useMemo(() => {
    const curves = ROUTES.map((r) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: CURVE_VERT,
        fragmentShader: CURVE_FRAG,
        uniforms: { uTime: u.uTime, uMix: mix, uColor: { value: r.out ? GREEN : CYAN }, uOut: { value: r.out ? 1 : 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      return new THREE.Line(curveGeometry(r), mat);
    });

    const rnd = mulberry32(21);
    const per = [5, 7, 5, 6, 6];
    const n = per.reduce((a, b) => a + b, 0);
    const route = new Float32Array(n);
    const phase = new Float32Array(n);
    const speed = new Float32Array(n);
    const icon = new Float32Array(n);
    let k = 0;
    per.forEach((count, r) => {
      for (let i = 0; i < count; i++) {
        route[k] = r;
        phase[k] = i / count + rnd() * 0.08;
        speed[k] = 0.11 + rnd() * 0.03;
        icon[k] = ICON[ROUTES[r].icon];
        k++;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("aRoute", new THREE.BufferAttribute(route, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    geo.setAttribute("aIcon", new THREE.BufferAttribute(icon, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
    const vec = (v: Vec3) => new THREE.Vector3(...v);
    const packetMat = new THREE.ShaderMaterial({
      vertexShader: PACKET_VERT,
      fragmentShader: PACKET_FRAG,
      uniforms: {
        uTime: u.uTime,
        uPixelRatio: u.uPixelRatio,
        uMix: mix,
        uA: { value: ROUTES.map((r) => vec(r.a)) },
        uC: { value: ROUTES.map((r) => vec(r.c)) },
        uB: { value: ROUTES.map((r) => vec(r.b)) },
        uAtlas: { value: atlas },
        uIn: { value: CYAN },
        uOutColor: { value: GREEN },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { curves, packets: new THREE.Points(geo, packetMat) };
  }, [u, atlas, mix]);

  useEffect(
    () => () => {
      built.curves.forEach((c) => {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      });
      built.packets.geometry.dispose();
      (built.packets.material as THREE.Material).dispose();
    },
    [built],
  );

  useFrame(() => {
    // the pipeline only exists on its chapter, and grows in with the power-on
    mix.value = u.uJarvis.value * Math.min(1, u.uBoot.value / 6 + (still ? 1 : 0));
  });

  const nodes = labels.jarvis.nodes;
  const inLabels = [nodes.app, nodes.mail, nodes.agenda];
  const outLabels = [nodes.claude, nodes.push];

  return (
    <group>
      {built.curves.map((c, i) => (
        <primitive key={i} object={c} frustumCulled={false} />
      ))}
      <primitive object={built.packets} frustumCulled={false} />
      {PIPE_SOURCES.map((at, i) => (
        <Portal key={`in-${i}`} at={at} icon={IN[i]} label={inLabels[i]} color={CYAN} atlas={atlas} mix={mix} />
      ))}
      {PIPE_TARGETS.map((at, i) => (
        <Portal key={`out-${i}`} at={at} icon={OUT[i]} label={outLabels[i]} color={GREEN} atlas={atlas} mix={mix} />
      ))}
    </group>
  );
}
