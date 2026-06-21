"use client";
import { TOPICS } from "@/lib/chapters";
import { useJourney } from "@/lib/store";

export function ProgressRail() {
  const topic = useJourney((s) => s.topic);
  const project = useJourney((s) => s.project);
  const projectCount = useJourney((s) => s.projectCount);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2" aria-hidden>
      {projectCount > 1 && (
        <div className="flex gap-1.5">
          {Array.from({ length: projectCount }).map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition-all ${i === project ? "bg-leaf" : "bg-sage/40"}`} />
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {TOPICS.map((t, i) => (
          <span key={t.id} className={`h-1.5 rounded-full transition-all ${i === topic ? "w-6 bg-forest" : "w-1.5 bg-sage/50"}`} />
        ))}
      </div>
    </div>
  );
}
