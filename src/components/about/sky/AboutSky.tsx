"use client";
import { useEffect, useRef, type RefObject } from "react";
import { SkyRunner } from "./runner";

/** The night sky behind the whole About row, panning with its sideways track
 *  (see SkyRunner). `active` runs it, `still` holds one frame. The sky fades
 *  out at the row's top and bottom, so it meets the rows around it softly. */
export function AboutSky({ active, still, track }: { active: boolean; still: boolean; track: RefObject<HTMLElement | null> }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const runner = useRef<SkyRunner | null>(null);
  const mode = useRef({ active, still });

  useEffect(() => {
    if (!host.current || !canvas.current) return;
    const r = new SkyRunner(host.current, canvas.current, track.current);
    r.setMode(mode.current.active, mode.current.still);
    runner.current = r;
    return () => {
      r.dispose();
      runner.current = null;
    };
  }, [track]);

  useEffect(() => {
    mode.current = { active, still };
    runner.current?.setMode(active, still);
  }, [active, still]);

  return (
    <div
      ref={host}
      className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,#000_7%,#000_92%,transparent)]"
    >
      <canvas ref={canvas} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
