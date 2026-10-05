"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { hasHardwareWebGL } from "@/lib/webgl";
import { LouisaBackdrop2D } from "./LouisaBackdrop2D";
import type { BackdropProps } from "./lib/types";

const StonesCanvas = dynamic(() => import("./louisa-stones/StonesCanvas").then((m) => m.StonesCanvas), { ssr: false });

/** Louisa Edelstenen's world: a studio still life of what she sells most, on
 *  dark slate. A backlit agate slice, an amethyst cluster, labradorite, rose
 *  quartz and a clear quartz point, lit by softboxes and shot with a shallow
 *  depth of field. Without a hardware GPU it falls back to the Canvas 2D geode. */
export function LouisaBackdrop({ active, still, className = "" }: BackdropProps) {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(hasHardwareWebGL() ? "3d" : "2d");
  }, []);

  if (mode === "2d") return <LouisaBackdrop2D active={active} still={still} className={className} />;
  return (
    <div ref={setHost} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#05080d] ${className}`}>
      {mode === "3d" && host && (
        <div className={`absolute inset-0 ${still ? "" : "transition-opacity duration-700 ease-out"}`} style={{ opacity: ready ? 1 : 0 }}>
          <StonesCanvas active={active} still={still} host={host} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
