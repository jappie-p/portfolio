"use client";
import { useEffect, useRef, type RefObject } from "react";
import { SceneRunner } from "./SceneRunner";
import type { CanvasScene } from "./types";

/** Runs `create`'s canvas scene inside `host` (see SceneRunner for the rules).
 *  `create` must be stable, a module-level function. */
export function useCanvasScene(
  host: RefObject<HTMLElement | null>,
  create: (host: HTMLElement) => CanvasScene,
  active: boolean,
  still: boolean,
  stillTime = 6,
) {
  const runner = useRef<SceneRunner | null>(null);
  const mode = useRef({ active, still });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const r = new SceneRunner(el, create, stillTime);
    r.setMode(mode.current.active, mode.current.still);
    runner.current = r;
    return () => {
      r.dispose();
      runner.current = null;
    };
  }, [host, create, stillTime]);
  useEffect(() => {
    mode.current = { active, still };
    runner.current?.setMode(active, still);
  }, [active, still]);
}
