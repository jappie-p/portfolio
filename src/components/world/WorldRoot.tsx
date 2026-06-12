"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useJourney } from "@/lib/store";

// ssr:false is only valid inside a Client Component (Next 16 rule).
const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

export default function WorldRoot() {
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
    // Spec §8: no-WebGL fallback keeps full content on a static backdrop.
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
  return <WorldCanvas />;
}
