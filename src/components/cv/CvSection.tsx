import type { ReactNode } from "react";

/** Small mono-caps label above a block of CV content. Shared by both columns
    so the section rhythm (label -> content) stays identical throughout. */
export function CvSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="cv-mono mb-[2mm] text-[7.5pt] font-semibold uppercase tracking-[0.16em] text-[#16a34a]">{label}</h2>
      {children}
    </section>
  );
}
