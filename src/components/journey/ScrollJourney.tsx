import type { ReactNode } from "react";

/** The vertical scroll-snap root. Topics stack inside it; each subject topic
 *  owns its own horizontal project track (see panels.tsx). */
export function ScrollJourney({ children }: { children: ReactNode }) {
  return (
    <div id="journey-root" tabIndex={-1}>
      {children}
    </div>
  );
}
