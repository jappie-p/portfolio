"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import type { EffectComposer } from "postprocessing";
import { panelAnchors } from "../lib/anchors";
import { Effects } from "./Effects";
import { Kit } from "./kit";
import { stonesPlan, type StonesPlan } from "./layout";
import { Stones } from "./Stones";
import { Studio } from "./Studio";
import { compileAll, pause, postMaterials } from "./warm";

const MIN_DPR = 1;
/** No motion yet: one composed frame, held. */
const MOVING = false;

function aim(camera: THREE.Camera, plan: StonesPlan) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  camera.fov = plan.camera.fov;
  camera.near = 5;
  camera.far = 900;
  camera.position.copy(plan.camera.position);
  camera.lookAt(plan.camera.target);
  camera.updateProjectionMatrix();
}

/**
 * The still life. The slate is baked and the stones built after paint, a
 * slice per task; they are mounted hidden with the composer off, their
 * shaders and the composer's compiled ahead, and only then shown, so
 * arriving never stalls a frame. A resize lays the same stones out again
 * (after it settles).
 */
function Stage({ active, still, host, lite, onReady }: { active: boolean; still: boolean; host: HTMLElement; lite: boolean; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // only the size: R3F's size also carries the canvas' offset, which moves
  // with every slide of the track
  const w = useThree((s) => s.size.width);
  const h = useThree((s) => s.size.height);
  const advance = useThree((s) => s.advance);
  const invalidate = useThree((s) => s.invalidate);
  const [kit] = useState(() => new Kit());
  const [plan, setPlan] = useState<StonesPlan | null>(null);
  const [shown, setShown] = useState(false);
  const [lit, setLit] = useState(false);
  const root = useRef<THREE.Group>(null);
  const composer = useRef<EffectComposer>(null);
  const planned = useRef(false);
  const ready = useRef(onReady);
  const told = useRef(false);

  useEffect(() => {
    ready.current = onReady;
  }, [onReady]);

  useEffect(() => () => kit.dispose(), [kit]);

  // lay out and build for this size (after a resize settles)
  useEffect(() => {
    if (w < 1 || h < 1) return;
    let cancelled = false;
    (async () => {
      await pause(planned.current ? 160 : 0);
      if (cancelled) return;
      if (!planned.current) {
        const studio = await kit.prepare(gl);
        if (cancelled || !(await compileAll(gl, camera, scene, studio, [], () => cancelled))) return;
        setLit(true);
      }
      const next = stonesPlan(w, h, panelAnchors(host));
      if (lite) next.lite = true;
      for (const step of kit.steps(gl, next)) {
        await pause();
        if (cancelled) return;
        await step();
      }
      if (cancelled) return;
      planned.current = true;
      setPlan(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [w, h, host, kit, gl, lite, camera, scene]);

  // paint a frame: on demand while on screen, by hand while the loop is off
  // (so it is there when you arrive)
  const kick = useRef(() => {});
  useEffect(() => {
    kick.current = () => (still || active ? invalidate() : advance(performance.now()));
  }, [still, active, invalidate, advance]);

  // a new layout: frame it, and the first time compile it before showing it
  useEffect(() => {
    if (!plan) return;
    aim(camera, plan);
    kit.slate?.pool.value.set(...plan.pool);
    if (shown) return kick.current();
    let cancelled = false;
    (async () => {
      const parts: THREE.Object3D[] = [];
      root.current?.traverse((o) => (o as THREE.Mesh).isMesh && parts.push(o));
      const post = composer.current ? postMaterials(composer.current) : [];
      if (await compileAll(gl, camera, scene, parts, post, () => cancelled)) setShown(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => {
    if (shown) kick.current();
  }, [shown]);

  // after the composer (priority 1) has drawn the first frame with the stones in it
  useFrame(() => {
    if (!shown || told.current) return;
    told.current = true;
    ready.current();
  }, 2);

  const env = scene.environment;
  return (
    <>
      <color attach="background" args={["#030405"]} />
      {lit && kit.slate && <Studio face={kit.softbox} slate={kit.slate.grain} resolution={lite ? 256 : 512} />}
      {plan && env && (
        <group ref={root} visible={shown}>
          <Stones plan={plan} kit={kit} env={env} />
        </group>
      )}
      {plan && shown && (
        <ContactShadows
          frames={1}
          position={[plan.shadows[0], 0.02, plan.shadows[1]]}
          scale={[plan.shadows[2], plan.shadows[3]]}
          resolution={1024}
          blur={2.6}
          far={7}
          opacity={0.9}
        />
      )}
      {plan && <Effects plan={plan} dof={!lite} enabled={shown} composer={composer} />}
    </>
  );
}

export interface StonesCanvasProps {
  active: boolean;
  still: boolean;
  /** the backdrop's element, for measuring the panel around it */
  host: HTMLElement;
  onReady: () => void;
}

/**
 * The still life: at most 1.5x pixels and no loop at all while the panel is
 * off screen. Nothing moves yet, so frames are drawn on demand (when the
 * stones are ready, on a resize or a new layout), not sixty times a second;
 * `moving` turns the loop on, and the PerformanceMonitor with it, for when
 * the stones drift.
 */
export function StonesCanvas({ active, still, host, onReady }: StonesCanvasProps) {
  const [screen] = useState(() => window.devicePixelRatio || 1);
  const [lite] = useState(() => Math.min(window.innerWidth, window.innerHeight) < 600);
  const maxDpr = Math.max(MIN_DPR, Math.min(screen, 1.5));
  const [dpr, setDpr] = useState(maxDpr);
  const moving = MOVING && active && !still;

  return (
    <Canvas
      frameloop={moving ? "always" : still || active ? "demand" : "never"}
      dpr={still ? maxDpr : dpr}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 20, near: 5, far: 900, position: [0, 26, 60] }}
      onCreated={({ gl }) => {
        // the rose quartz refracts a soft, blurred scene: a third is plenty
        gl.transmissionResolutionScale = 0.33;
        // the shaders are known good; checking them costs a GPU round trip
        // per program on first use
        gl.debug.checkShaderErrors = false;
      }}
    >
      {moving && (
        <PerformanceMonitor
          factor={1}
          step={0.25}
          flipflops={3}
          onChange={({ factor }) => setDpr(Math.round((MIN_DPR + (maxDpr - MIN_DPR) * factor) * 4) / 4)}
        />
      )}
      <Stage active={active} still={still} host={host} lite={lite} onReady={onReady} />
    </Canvas>
  );
}
