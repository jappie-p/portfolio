"use client";
import { useJourney } from "@/lib/store";

/** A single rail showing the sideways (project) position within the current
 *  topic. It only appears when the topic has multiple panels, so it doubles as
 *  the "you can scroll sideways here" cue. */
export function ProgressRail() {
  const project = useJourney((s) => s.project);
  const projectCount = useJourney((s) => s.projectCount);
  if (projectCount <= 1) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-2" aria-hidden>
      {Array.from({ length: projectCount }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${i === project ? "w-6 bg-forest" : "w-1.5 bg-sage/50"}`}
        />
      ))}
    </div>
  );
}
