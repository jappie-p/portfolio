"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { stepRig, type Rig } from "./rig";
import type { Pose } from "./path";
import { GalleryScene, type Crops } from "./three/scene";
import { loadPicture, type CardCopy } from "./three/textures";
import { Trailer } from "./three/video";

const MIN_DPR = 1;

/** A one-off pause, so each step of the build runs in its own task. */
const pause = (ms = 0) => new Promise<void>((r) => setTimeout(r, ms));

/** The renderer in two tasks: the context first, then, once the GPU has had
 *  a moment to set it up, three.js and its many queries of it. Without
 *  multisampling: sizing a multisampled canvas stalled the page for 80 ms,
 *  so the shaders smooth their own fine edges instead. */
async function renderer(props: { canvas: unknown }) {
  const canvas = props.canvas as HTMLCanvasElement;
  const attributes: WebGLContextAttributes = { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: "high-performance" };
  const context = canvas.getContext("webgl2", attributes);
  await pause(60);
  return new THREE.WebGLRenderer({ canvas, context: (context ?? undefined) as WebGLRenderingContext | undefined, ...attributes });
}

export type GalleryCanvasProps = {
  rig: Rig;
  active: boolean;
  copy: CardCopy;
  /** the three prints (their full 16:10 worlds) and the slice each shows */
  pictures: { zelda: string; kiosk: string; festival: string };
  crops: Crops;
  trailer: string;
  onReady: () => void;
  /** after each frame, with the camera's pose and the view's size in CSS pixels */
  onFrame: (pose: Pose, w: number, h: number) => void;
  /** a guided glide has arrived */
  onArrive: () => void;
  onLost: () => void;
};

function Stage({ rig, active, copy, pictures, crops, trailer, onReady, onFrame, onArrive }: Omit<GalleryCanvasProps, "onLost">) {
  const gl = useThree((s) => s.gl);
  // only the size: R3F's size also carries the canvas' offset, which moves
  // with every slide of the track
  const w = useThree((s) => s.size.width);
  const h = useThree((s) => s.size.height);
  const [scene, setScene] = useState<GalleryScene | null>(null);
  const buffer = useRef(new THREE.Vector2());
  const calls = useRef({ onReady, onFrame, onArrive });
  const firstCopy = useRef(copy);

  useEffect(() => {
    calls.current = { onReady, onFrame, onArrive };
  }, [onReady, onFrame, onArrive]);

  // build in steps, decode the prints off the main thread, compile every
  // program ahead (KHR_parallel_shader_compile), upload one texture per task
  // and draw each part once off screen: no step of it is a long task
  useEffect(() => {
    let cancelled = false;
    let built: GalleryScene | null = null;
    const abort = new AbortController();
    (async () => {
      const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
      try {
        const [zelda, kiosk, festival] = await Promise.all([pictures.zelda, pictures.kiosk, pictures.festival].map((u) => loadPicture(u, aniso, abort.signal)));
        if (cancelled) return [zelda, kiosk, festival].forEach((t) => t.dispose());
        built = new GalleryScene(rig.room, { zelda, kiosk, festival }, crops, new Trailer(trailer), firstCopy.current);
        const steps = built.steps(aniso);
        while (!steps.next().done) {
          await pause();
          if (cancelled) return;
        }
        await gl.compileAsync(built.scene, built.camera);
        await pause();
        if (cancelled) return;
        await gl.compileAsync(built.reflector.quad, built.camera, built.scene);
        for (const t of built.textures()) {
          await pause();
          if (cancelled) return;
          gl.initTexture(t);
        }
        const warm = built.warm(gl, buffer.current);
        while (!warm.next().done) {
          await pause();
          if (cancelled) return;
        }
        setScene(built);
        calls.current.onReady();
      } catch (e) {
        if (!cancelled) console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      abort.abort();
      built?.dispose();
    };
  }, [gl, rig, pictures, crops, trailer]);

  useEffect(() => {
    if (copy !== firstCopy.current) scene?.setCopy(copy);
  }, [scene, copy]);

  useEffect(() => {
    if (!active) scene?.rest();
  }, [scene, active]);

  useFrame((_, delta) => {
    if (!scene) return;
    const dt = Math.min(delta, 1 / 20);
    scene.powerUp();
    const arrived = stepRig(rig, dt);
    scene.frame(rig, dt, w, h);
    scene.render(gl, buffer.current);
    calls.current.onFrame(scene.pose, w, h);
    if (arrived) calls.current.onArrive();
  }, 1);

  return null;
}

/** The gallery's live view: at most 1.5x pixels, stepping down when frames
 *  drop, and no loop at all while the panel is off screen. No
 *  post-processing: the light, the reflection and the haze are all drawn
 *  directly. */
export function GalleryCanvas({ onLost, ...stage }: GalleryCanvasProps) {
  const [screen] = useState(() => window.devicePixelRatio || 1);
  const maxDpr = Math.max(MIN_DPR, Math.min(screen, 1.5));
  const [dpr, setDpr] = useState(maxDpr);
  const lost = useRef(onLost);

  useEffect(() => {
    lost.current = onLost;
  }, [onLost]);

  return (
    <Canvas
      frameloop={stage.active ? "always" : "never"}
      dpr={dpr}
      flat
      resize={{ scroll: false }}
      gl={renderer}
      onCreated={({ gl }) => {
        gl.setClearColor(0x040506, 1);
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        gl.domElement.addEventListener("webglcontextlost", () => lost.current(), { once: true });
      }}
    >
      <PerformanceMonitor
        factor={1}
        step={0.25}
        flipflops={3}
        onChange={({ factor }) => setDpr(Math.round((MIN_DPR + (maxDpr - MIN_DPR) * factor) * 4) / 4)}
      />
      <Stage {...stage} />
    </Canvas>
  );
}
