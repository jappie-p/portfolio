"use client";

import { useEffect, useRef } from "react";
import { useJourney } from "@/lib/store";

export default function ProgressHUD() {
  const chapter = useJourney((s) => s.chapter);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      useJourney.subscribe((s) => {
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${s.progress})`;
        }
      }),
    []
  );

  return (
    <div className="fixed bottom-6 left-6 z-30 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.3em] text-bone-faint">
      <span className="tabular-nums">
        {String(chapter + 1).padStart(2, "0")} / 06
      </span>
      <div className="h-px w-24 overflow-hidden bg-stone">
        <div
          ref={barRef}
          className="h-full w-full origin-left bg-ember"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
