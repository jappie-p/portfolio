"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { panelAnchors } from "../lib/anchors";
import { Kit } from "./kit";
import { louisaPlan } from "./layout";
import { KEY, STRIP } from "./lights";
import { LouisaWorld } from "./world";

/** The frame a still render shows: crystals mid-sway, glints caught. */
const STILL_T = 9.3;
const MIN_DPR = 1;

/** A one-off pause, so each step of the warm-up runs in its own task. */
const pause = (ms = 0) => new Promise<void>((r) => setTimeout(r, ms));

const materialOf = (o: THREE.Object3D) => (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;

/** Does this draw in the opaque pass (and so again into the transmission
 *  render target, with its own shader variant)? */
const opaque = (o: THREE.Object3D) => {
  const m = materialOf(o);
  return !!m && !m.transparent && !(m.transmission > 0);
};

/** Double-sided transmission also draws its back faces into that target. */
const backfaced = (o: THREE.Object3D) => {
  const m = materialOf(o);
  return !!m && m.transmission > 0 && m.side === THREE.DoubleSide;
};

/**
 * Compile `parts` one per task, without stalling: each for the screen, and
 * opaque ones also for the transmission pass, which renders them into a
 * linear, untonemapped target (a different program).
 */
async function compileAll(gl: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene, parts: THREE.Object3D[], cancelled: () => boolean) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  try {
    for (const part of parts) {
      await pause();
      if (cancelled()) return false;
      await gl.compileAsync(part, camera, scene);
      if (!opaque(part) && !backfaced(part)) continue;
      await pause();
      if (cancelled()) return false;
      const material = materialOf(part)!;
      const side = material.side;
      if (backfaced(part)) material.side = THREE.BackSide;
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      const done = gl.compileAsync(part, camera, scene);
      gl.setRenderTarget(previous);
      material.side = side;
      await done;
    }
    return !cancelled();
  } finally {
    target.dispose();
  }
}

/**
 * The geode. The studio light is baked and the world built after paint, one
 * step per task; shaders are compiled ahead (KHR_parallel_shader_compile)
 * and only then is the world put in the scene, so showing it never stalls a
 * frame. A resize builds the next world behind the current one and swaps.
 */
function Stage({ active, still, host, onReady }: { active: boolean; still: boolean; host: HTMLElement; onReady: () => void }) {
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
  const [world, setWorld] = useState<LouisaWorld | null>(null);
  const clock = useRef({ t: STILL_T, px: 0, py: 0, tx: 0, ty: 0 });
  const ready = useRef(onReady);
  const built = useRef(false);

  useEffect(() => {
    ready.current = onReady;
  }, [onReady]);

  useEffect(() => () => kit.dispose(), [kit]);

  // light, build and compile a world for this size (after a resize settles)
  useEffect(() => {
    if (w < 1 || h < 1) return;
    let cancelled = false;
    (async () => {
      if (built.current) await pause(160);
      else {
        await pause();
        if (cancelled) return;
        await kit.light(gl, scene, pause);
      }
      if (cancelled) return;
      const next = new LouisaWorld(louisaPlan(w, h, panelAnchors(host)), w, h, kit.mats, kit.tex, kit.glint);
      for (const step of next.steps()) {
        await pause();
        if (cancelled) return next.dispose();
        step();
      }
      const ok = await compileAll(gl, camera, scene, built.current ? next.drawables() : [kit.void, ...next.drawables()], () => cancelled);
      if (!ok) return next.dispose();
      built.current = true;
      setWorld(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [w, h, host, kit, gl, camera, scene]);

  // the world on screen is disposed when it is replaced or unmounted
  useEffect(() => {
    if (!world) return;
    kit.frame(camera, world.w, world.h, world.plan.glows);
    // paint it once even if the loop is off, so it is there when you arrive
    if (still) invalidate();
    else if (!active) advance(performance.now());
    ready.current();
    return () => world.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  useEffect(() => {
    if (still) {
      clock.current.t = STILL_T;
      invalidate();
    }
  }, [still, invalidate]);

  // the mouse tilts the clusters a touch (window wide, mouse only)
  useEffect(() => {
    if (!active || still) return;
    const c = clock.current;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      c.tx = (e.clientX / window.innerWidth) * 2 - 1;
      c.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active, still]);

  useFrame((state, delta) => {
    const c = clock.current;
    if (!still) {
      const dt = Math.min(delta, 0.05);
      c.t += dt;
      const k = 1 - Math.exp(-dt * 3);
      c.px += (c.tx - c.px) * k;
      c.py += (c.ty - c.py) * k;
    }
    world?.update(c.t, c.px, c.py);
    kit.tick(state.camera, c.t, c.px, c.py, state.viewport.dpr);
  });

  return (
    <>
      <directionalLight position={[KEY.x, KEY.y, KEY.z]} intensity={3} color="#fff7ff" />
      <directionalLight position={[STRIP.x, STRIP.y, STRIP.z]} intensity={1.1} color="#ffc4e4" />
      <primitive object={kit.void} />
      {world && <primitive object={world.root} />}
      <primitive object={kit.veil} />
    </>
  );
}

export interface LouisaCanvasProps {
  active: boolean;
  still: boolean;
  /** the backdrop's element, for measuring the panel around it */
  host: HTMLElement;
  onReady: () => void;
}

/** The live geode: at most 1.5x pixels, stepping down when frames drop, and
 *  no loop at all while the panel is off screen. No post-processing: the
 *  crystals' own transmission, dispersion and glints carry it. */
export function LouisaCanvas({ active, still, host, onReady }: LouisaCanvasProps) {
  const [screen] = useState(() => window.devicePixelRatio || 1);
  const maxDpr = Math.max(MIN_DPR, Math.min(screen, 1.5));
  const [dpr, setDpr] = useState(maxDpr);

  return (
    <Canvas
      frameloop={still ? "demand" : active ? "always" : "never"}
      dpr={still ? maxDpr : dpr}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 10, far: 20000, position: [0, 0, 2000] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1;
        // refraction samples a soft scene: half resolution is plenty
        gl.transmissionResolutionScale = 0.5;
        // the shaders are known good; checking them costs a GPU round trip
        // per program on first use
        gl.debug.checkShaderErrors = false;
      }}
    >
      {!still && (
        <PerformanceMonitor
          factor={1}
          step={0.25}
          flipflops={3}
          onChange={({ factor }) => setDpr(Math.round((MIN_DPR + (maxDpr - MIN_DPR) * factor) * 4) / 4)}
        />
      )}
      <Stage active={active} still={still} host={host} onReady={onReady} />
    </Canvas>
  );
}
