import type { ReactNode } from "react";
import type { TopicId } from "@/lib/chapters";

/** A full-viewport topic row that snaps on the vertical axis. */
export function TopicRow({
  id,
  label,
  children,
}: {
  id: TopicId;
  label: string;
  children: ReactNode;
}) {
  return (
    <section data-section={id} aria-label={label} className="topic-row relative w-screen">
      {children}
    </section>
  );
}

/** A single centered panel (used by hero/about/contact, and as a topic cover). */
export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 py-24">{children}</div>
  );
}

/** Horizontal snap track holding a topic's project panels. */
export function ProjectTrack({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="project-track" role="group" aria-roledescription="carousel" aria-label={label}>
      {children}
    </div>
  );
}

/** One horizontally-snapping panel inside a project track. */
export function ProjectPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="project-panel" role="group" aria-roledescription="slide" aria-label={label} tabIndex={-1}>
      <div className="flex h-full w-full flex-col items-center justify-center px-6 py-24">{children}</div>
    </div>
  );
}
