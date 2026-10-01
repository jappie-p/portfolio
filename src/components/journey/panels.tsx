import type { ReactNode, Ref } from "react";
import type { TopicId } from "@/lib/chapters";

/** A full-viewport topic row that snaps on the vertical axis. */
export function TopicRow({
  id,
  label,
  className = "",
  children,
  ref,
}: {
  id: TopicId;
  label: string;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
}) {
  return (
    <section ref={ref} data-section={id} aria-label={label} className={`topic-row relative w-screen ${className}`}>
      {children}
    </section>
  );
}

/** A single full-screen panel (hero, contact). `data-panel` lets RevealObserver
 *  mark it on screen so its [data-reveal] children rise in. */
export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div data-panel className={`relative z-10 flex h-full w-full flex-col items-center justify-center px-6 py-24 ${className}`}>
      {children}
    </div>
  );
}

/** Horizontal snap track holding a topic's project panels. */
export function ProjectTrack({ label, children, ref }: { label: string; children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="project-track relative z-10" role="group" aria-roledescription="carousel" aria-label={label}>
      {children}
    </div>
  );
}

/** One horizontally-snapping panel inside a project track, optionally with
 *  its own art behind the copy (see Backdrop). On a short screen the panel
 *  scrolls on its own, and the art spans the whole sheet, not one screen. */
export function ProjectPanel({
  label,
  className = "",
  backdrop,
  children,
}: {
  label: string;
  className?: string;
  backdrop?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-panel className="project-panel relative" role="group" aria-roledescription="slide" aria-label={label} tabIndex={-1}>
      <div className="relative flex min-h-full flex-col">
        {backdrop}
        <div className={`relative z-10 flex w-full flex-1 flex-col items-center justify-center px-6 pb-20 pt-24 sm:px-12 ${className}`}>{children}</div>
      </div>
    </div>
  );
}
