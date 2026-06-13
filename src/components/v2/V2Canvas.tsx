"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useJourney } from "@/lib/store";

const Scene = dynamic(() => import("./V2CanvasScene"), { ssr: false });

// Lean atmosphere layer for v2: embers + horizon glow only. The star of v2
// is the scrubbed DOM choreography; the canvas is texture, not subject.
export default function V2Canvas() {
  const webglOk = useJourney((s) => s.webglOk);
  const setWebglOk = useJourney((s) => s.setWebglOk);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebglOk(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebglOk(false);
    }
  }, [setWebglOk]);

  if (webglOk === false) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 110% at 30% 110%, #1c1410 0%, #070605 70%)",
        }}
      />
    );
  }
  if (webglOk === null) return null;
  return <Scene />;
}
