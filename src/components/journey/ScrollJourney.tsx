import type { ReactNode } from "react";

/** The vertical scroll-snap root and the page's main landmark. Topics stack
 *  inside it; each subject topic owns its own horizontal track (see panels.tsx). */
export function ScrollJourney({ children }: { children: ReactNode }) {
  return (
    <main id="journey-root" tabIndex={-1} className="outline-none">
      {children}
    </main>
  );
}
