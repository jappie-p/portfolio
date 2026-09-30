"use client";
import type { ProjectSlug } from "@/lib/chapters";
import { PROJECTS, formatPeriod } from "@/data/projects";
import { useT } from "@/i18n/useT";

/** Kind and dates of a project, with its solo/team badge and a star when it is
 *  one of the projects I'd point to first. */
export function ProjectMeta({ slug, className = "" }: { slug: ProjectSlug; className?: string }) {
  const t = useT();
  const p = PROJECTS[slug];
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <p className="label text-leaf">
        {t.work.kinds[p.kind]} · {formatPeriod(p.period, t.work.until, t.work.now)}
      </p>
      <span className="tag">{p.team ? t.work.team : t.work.solo}</span>
      {p.featured && (
        <span className="tag tag-featured">
          <span aria-hidden>★</span>
          {t.work.featured}
        </span>
      )}
    </div>
  );
}
