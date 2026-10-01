"use client";
import { useEffect, useRef } from "react";
import { skyCss } from "./palette";
import { ContactScene } from "./scene";

/** Utrecht at night, the journey's last frame: the Oudegracht with its wharf
 *  cellars and canal houses in front, the old town's roofs and spires behind,
 *  and the Domtoren rising beside the form, its lantern faintly green. When
 *  the form is sent (`contact:sent` on window) the lantern flares, rings of
 *  light spread over the city and its windows switch on outward from the
 *  tower. Canvas 2D only. `active` runs it (nothing ticks while it is false),
 *  `still` holds one composed frame for reduced motion. */
export function ContactBackdrop({ active, still, className = "" }: { active: boolean; still: boolean; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ContactScene | null>(null);

  useEffect(() => {
    const el = host.current;
    const c = cv.current;
    if (!el || !c) return;
    const s = new ContactScene(c);
    scene.current = s;
    let w = 0;
    let h = 0;
    const fit = () => s.resize(w, h);
    const ro = new ResizeObserver(([e]) => {
      w = e.contentRect.width;
      h = e.contentRect.height;
      fit();
    });
    ro.observe(el);

    // a window moved to a screen with another pixel ratio repaints sharp
    let mq: MediaQueryList | null = null;
    const onRatio = () => {
      watch();
      fit();
    };
    const watch = () => {
      mq?.removeEventListener("change", onRatio);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onRatio);
    };
    watch();

    const onSent = () => s.fire();
    window.addEventListener("contact:sent", onSent);
    return () => {
      ro.disconnect();
      mq?.removeEventListener("change", onRatio);
      window.removeEventListener("contact:sent", onSent);
      s.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.setMode(still ? "still" : active ? "live" : "paused");
  }, [active, still]);

  return (
    <div ref={host} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ background: skyCss() }}>
      <canvas ref={cv} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
