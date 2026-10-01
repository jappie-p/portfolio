"use client";
import { PROJECT_NAMES, type ProjectSlug } from "@/lib/chapters";
import { useT } from "@/i18n/useT";
import { OpenCaseButton } from "./CaseOverlay";
import { ProjectMeta } from "./ProjectMeta";

/** A compact project card for the scene topics (AI, Cyber): the facts in brief
 *  and the way into the full case. */
export function ProjectCard({ slug, className = "" }: { slug: ProjectSlug; className?: string }) {
  const t = useT();
  const c = t.projects[slug];
  return (
    <div className={`glass max-w-sm p-7 [text-shadow:none] ${className}`}>
      <ProjectMeta slug={slug} />
      <h3 className="headline mt-3 text-4xl text-ink">{PROJECT_NAMES[slug]}</h3>
      <p className="mt-2 text-sm text-ink-faint">
        {t.work.role}: <span className="text-ink-dim">{c.role}</span>
      </p>
      <p className="mt-3 leading-relaxed text-ink-dim">{c.blurb}</p>
      <OpenCaseButton slug={slug} className="mt-6" />
    </div>
  );
}
