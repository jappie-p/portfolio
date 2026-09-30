"use client";
import { useRef, type ReactNode, type PointerEvent } from "react";

const MAX_TILT = 9; // degrees

/** Tilts its content toward the pointer in 3D (with a moving glare), and lets
 *  it float gently when idle. Touch screens just get the float. */
export function TiltStage({ children, className = "", innerClassName = "" }: { children: ReactNode; className?: string; innerClassName?: string }) {
  const inner = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !inner.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const s = inner.current.style;
    s.setProperty("--ry", `${x * MAX_TILT * 2}deg`);
    s.setProperty("--rx", `${-y * MAX_TILT * 2}deg`);
    s.setProperty("--gx", `${(x + 0.5) * 100}%`);
    s.setProperty("--gy", `${(y + 0.5) * 100}%`);
    s.setProperty("--glare", "1");
  };
  const onLeave = () => {
    const s = inner.current?.style;
    if (!s) return;
    s.setProperty("--ry", "0deg");
    s.setProperty("--rx", "0deg");
    s.setProperty("--glare", "0");
  };

  return (
    <div className={`tilt-stage ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div ref={inner} className={`tilt-inner ${innerClassName}`}>
        {children}
        <div aria-hidden className="tilt-glare" />
      </div>
    </div>
  );
}
