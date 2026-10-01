import type { ReactNode } from "react";
import { NextButton } from "@/components/ui/NextButton";

/** One stop on a scene's chapter track (cyber, AI). Same slide semantics as
 *  ProjectPanel, but the copy sits low in a corner so the scene stays the
 *  subject; on phones it never climbs into the top half of the screen, and a
 *  long chapter scrolls inside its panel instead. */
export function Chapter({
  label,
  align = "start",
  next,
  children,
}: {
  label: string;
  align?: "start" | "end";
  /** label of the "go to the next chapter" button; omit on the last stop */
  next?: string;
  children: ReactNode;
}) {
  return (
    <div data-panel className="project-panel cyber-chapter" role="group" aria-roledescription="slide" aria-label={label} tabIndex={-1}>
      <div
        className={`flex min-h-full w-full flex-col justify-end px-6 pb-14 pt-[46dvh] sm:px-12 sm:pb-16 sm:pt-24 ${align === "end" ? "items-start sm:items-end" : "items-start"}`}
      >
        <div data-reveal className="flex max-w-md flex-col items-start [text-shadow:0_2px_24px_rgba(3,7,14,0.75)]">
          {children}
          {next && <NextButton label={next} />}
        </div>
      </div>
    </div>
  );
}
