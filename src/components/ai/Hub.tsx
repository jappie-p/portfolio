"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAiSim } from "./sim";
import { bezier, bow, hubPosition, type Vec3 } from "./lib/ai-math";
import { iconAtlas, iconUv, type IconName } from "./lib/ai-icons";
import { Label } from "./Label";

// The Go to Guy chapter: the core becomes the AI bridge. The team's tools
// stand in a ring around it, each wired to the core, and small agents fly
// tasks out to the tools and bring the results back to the team.

const TOOLS: IconName[] = ["mail", "agenda", "hours", "crm", "team"];
const CORE: Vec3 = [0, 0, 0];
const GREEN = new THREE.Color("#4ade80");
const MINT = new THREE.Color("#86efac");

const BEAM_VERT = /* glsl */ `
attribute float aT;
varying float vT;
void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const BEAM_FRAG = /* glsl */ `
uniform float uTime;
uniform float uMix;
uniform float uFlash;
uniform vec3 uColor;
varying float vT;
void main() {
  float s = fract(vT * 9.0 - uTime * 0.9);
  float dash = smoothstep(0.0, 0.06, s) * smoothstep(0.55, 0.4, s);
  float fade = smoothstep(0.1, 0.3, vT);
  float a = (0.14 + dash * 0.55 + uFlash * 0.8) * fade * uMix;
  gl_FragColor = vec4(uColor * a * 1.8, a);
}
`;

function beamGeometry(to: Vec3, seg = 48) {
  const c = bow(CORE, to, 2.2);
  const pos = new Float32Array((seg + 1) * 3);
  const t = new Float32Array(seg + 1);
  for (let i = 0; i <= seg; i++) {
    const p = bezier(CORE, c, to, i / seg);
    pos.set(p, i * 3);
    t[i] = i / seg;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
  return g;
}

/** One tool: a hexagon panel facing the camera, with its icon and name. The
 *  team panel carries a little live bar chart. */
function Tool({ index, icon, label, atlas }: { index: number; icon: IconName; label: string; atlas: THREE.Texture }) {
  const { state, u } = useAiSim();
  const group = useRef<THREE.Group>(null!);
  const text = useRef<THREE.Mesh>(null!);
  const bars = useRef<THREE.InstancedMesh>(null!);
  const at = useMemo(() => hubPosition(index, TOOLS.length), [index]);
  const parts = useMemo(() => {
    const ring = (r: number) =>
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 7 }, (_, i) => {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0);
        }),
      );
    const edge = new THREE.LineBasicMaterial({ color: GREEN.clone().multiplyScalar(2.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const inner = new THREE.LineBasicMaterial({ color: GREEN.clone().multiplyScalar(0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const fill = new THREE.MeshBasicMaterial({ color: new THREE.Color("#0b2a1a"), transparent: true, depthWrite: false });
    const map = atlas.clone();
    const uv = iconUv(icon);
    map.offset.set(...uv.offset);
    map.repeat.set(...uv.repeat);
    map.needsUpdate = true;
    const glyph = new THREE.MeshBasicMaterial({ map, color: MINT.clone().multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const barMat = new THREE.MeshBasicMaterial({ color: GREEN.clone().multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const outerGeo = ring(1.05);
    const innerGeo = ring(0.9);
    return {
      outerGeo,
      innerGeo,
      edge,
      inner,
      fill,
      glyph,
      map,
      barMat,
      outer: new THREE.Line(outerGeo, edge),
      innerLine: new THREE.Line(innerGeo, inner),
    };
  }, [atlas, icon]);
  useEffect(
    () => () => {
      Object.values(parts).forEach((p) => (p as { dispose?: () => void }).dispose?.());
    },
    [parts],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ camera }) => {
    const g = group.current;
    g.quaternion.copy(camera.quaternion);
    const m = state.hub;
    g.visible = m > 0.01;
    if (!g.visible) return;
    // each panel pops on in turn when the chapter arrives
    const since = state.time - (state.hubAt + index * 0.16);
    const flash = since > 0 && since < 3 ? Math.exp(-since * 3.2) : 0;
    const pop = since < 0 && state.hubAt > 0 ? 0.85 : 1;
    g.scale.setScalar((0.5 + 0.32 * m) * pop * (1 + flash * 0.12));
    parts.edge.opacity = m * (0.85 + flash);
    parts.inner.opacity = m * 0.6;
    parts.fill.opacity = m * 0.75;
    parts.glyph.opacity = m;
    if (text.current) (text.current.material as THREE.MeshBasicMaterial).opacity = m;
    if (bars.current) {
      for (let i = 0; i < 6; i++) {
        const h = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(u.uTime.value * (1.2 + i * 0.37) + i * 1.7));
        dummy.position.set(-0.45 + i * 0.18, -1.55 + h / 2, 0.02);
        dummy.scale.set(0.11, h, 1);
        dummy.updateMatrix();
        bars.current.setMatrixAt(i, dummy.matrix);
      }
      bars.current.instanceMatrix.needsUpdate = true;
      parts.barMat.opacity = m;
    }
  });

  return (
    <group ref={group} position={at}>
      <mesh material={parts.fill}>
        <circleGeometry args={[1.02, 6, Math.PI / 6]} />
      </mesh>
      <primitive object={parts.outer} />
      <primitive object={parts.innerLine} />
      <mesh material={parts.glyph} position={[0, 0.05, 0.01]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>
      <Label ref={text} text={label.toUpperCase()} size={0.28} color="#e6fff0" anchor="top" position={[0, icon === "team" ? -1.85 : -1.25, 0]} />
      {icon === "team" && (
        <instancedMesh ref={bars} args={[undefined, undefined, 6]} material={parts.barMat}>
          <planeGeometry args={[1, 1]} />
        </instancedMesh>
      )}
    </group>
  );
}

/** Agents: small drones flying from the core out to a tool and back. */
function Agents() {
  const { state, still } = useAiSim();
  const COUNT = 6;
  const TRAIL = 14;
  const meshes = useRef<THREE.Mesh[]>([]);
  const history = useMemo(() => Array.from({ length: COUNT }, () => [] as THREE.Vector3[]), []);
  const built = useMemo(() => {
    const body = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 3.2, 2.6), transparent: true });
    const geo = new THREE.OctahedronGeometry(0.14, 0);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * TRAIL * 3), 3));
    trailGeo.setAttribute("aFade", new THREE.BufferAttribute(new Float32Array(COUNT * TRAIL), 1));
    const trailMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute float aFade; varying float vF;
        void main() { vF = aFade; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 7.0 * aFade * (14.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform float uMix; varying float vF;
        void main() { float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r) * vF * uMix; gl_FragColor = vec4(vec3(0.35, 0.95, 0.6) * 2.0 * a, a); }`,
      uniforms: { uMix: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { body, geo, trailGeo, trailMat, trail: new THREE.Points(trailGeo, trailMat) };
  }, []);
  useEffect(
    () => () => {
      built.body.dispose();
      built.geo.dispose();
      built.trailGeo.dispose();
      built.trailMat.dispose();
    },
    [built],
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const m = state.hub;
    built.trailMat.uniforms.uMix.value = m;
    built.body.opacity = m;
    const t = state.time;
    const posAttr = built.trailGeo.getAttribute("position") as THREE.BufferAttribute;
    const fadeAttr = built.trailGeo.getAttribute("aFade") as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      mesh.visible = m > 0.02;
      // a 3.2 s round trip: out along a bowed path, a short stop, back again
      const period = 3.2;
      const cycle = (t + i * 0.53) / period;
      const leg = Math.floor(cycle);
      const x = cycle - leg;
      const tool = (i * 2 + leg * 3) % TOOLS.length;
      const to = hubPosition(tool, TOOLS.length);
      const c = bow(CORE, to, 2.2 + (i % 3) * 0.5);
      const s = x < 0.45 ? x / 0.45 : x < 0.55 ? 1 : 1 - (x - 0.55) / 0.45;
      const e = s * s * (3 - 2 * s);
      const p = bezier(CORE, c, to, Math.max(0.16, e));
      mesh.position.set(...p);
      if (!still) mesh.rotation.y += Math.min(delta, 0.05) * 3;
      const h = history[i];
      tmp.set(...p);
      h.unshift(tmp.clone());
      if (h.length > TRAIL) h.pop();
      for (let k = 0; k < TRAIL; k++) {
        const q = h[Math.min(k, h.length - 1)];
        posAttr.setXYZ(i * TRAIL + k, q.x, q.y, q.z);
        fadeAttr.setX(i * TRAIL + k, 1 - k / TRAIL);
      }
    }
    posAttr.needsUpdate = true;
    fadeAttr.needsUpdate = true;
  });

  return (
    <group>
      {Array.from({ length: COUNT }, (_, i) => (
        <mesh key={i} ref={(me) => void (meshes.current[i] = me!)} geometry={built.geo} material={built.body} />
      ))}
      <primitive object={built.trail} frustumCulled={false} />
    </group>
  );
}

export function Hub() {
  const { u, state, labels } = useAiSim();
  const atlas = useMemo(() => iconAtlas(), []);
  useEffect(() => () => atlas.dispose(), [atlas]);
  const mix = useMemo(() => ({ value: 0 }), []);

  const beams = useMemo(
    () =>
      TOOLS.map((_, i) => {
        const mat = new THREE.ShaderMaterial({
          vertexShader: BEAM_VERT,
          fragmentShader: BEAM_FRAG,
          uniforms: { uTime: u.uTime, uMix: mix, uFlash: { value: 0 }, uColor: { value: GREEN } },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        return new THREE.Line(beamGeometry(hubPosition(i, TOOLS.length)), mat);
      }),
    [u, mix],
  );
  useEffect(
    () => () =>
      beams.forEach((b) => {
        b.geometry.dispose();
        (b.material as THREE.Material).dispose();
      }),
    [beams],
  );

  useFrame(() => {
    mix.value = state.hub;
    beams.forEach((b, i) => {
      const since = state.time - (state.hubAt + i * 0.16);
      (b.material as THREE.ShaderMaterial).uniforms.uFlash.value = since > 0 && since < 3 ? Math.exp(-since * 3) : 0;
    });
  });

  const n = labels.hub.nodes;
  const names = [n.mail, n.agenda, n.hours, n.crm, n.team];

  return (
    <group>
      {beams.map((b, i) => (
        <primitive key={i} object={b} frustumCulled={false} />
      ))}
      {TOOLS.map((icon, i) => (
        <Tool key={icon} index={i} icon={icon} label={names[i]} atlas={atlas} />
      ))}
      <Agents />
    </group>
  );
}
