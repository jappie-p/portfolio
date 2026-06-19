"use client";
import { CHAPTERS } from "@/lib/chapters";
import { useJourney } from "@/lib/store";

export function ProgressRail() {
  const chapter = useJourney((s) => s.chapter);
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-2" aria-hidden>
      {CHAPTERS.map((c, i) => (
        <span
          key={c.id}
          className={`h-1.5 rounded-full transition-all ${i === chapter ? "w-6 bg-leaf" : "w-1.5 bg-sage/50"}`}
        />
      ))}
    </div>
  );
}
