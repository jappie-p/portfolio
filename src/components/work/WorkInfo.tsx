"use client";
import { PROJECT_NAMES, type ProjectSlug } from "@/lib/chapters";
import { PROJECTS } from "@/data/projects";
import { BASE_PATH } from "@/data/site";
import { useT } from "@/i18n/useT";
import { OpenCaseButton } from "./CaseOverlay";
import { ProjectMeta } from "./ProjectMeta";

/** The copy side of a project panel: kind, dates and badges, name, role, what
 *  it is, the main stack, and the ways in (play it, the live site, the case). */
export function WorkInfo({ slug, className = "" }: { slug: ProjectSlug; className?: string }) {
  const t = useT();
  const p = PROJECTS[slug];
  const c = t.projects[slug];
  return (
    <div data-reveal className={`flex max-w-md flex-col items-start ${className}`}>
      <ProjectMeta slug={slug} />
      <h3 className="headline mt-4 text-5xl text-ink sm:text-6xl">{PROJECT_NAMES[slug]}</h3>
      <p className="mt-3 text-sm text-ink-faint">
        {t.work.role}: <span className="text-ink-dim">{c.role}</span>
      </p>
      <p className="mt-5 text-lg leading-relaxed text-ink-dim">{c.what}</p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {p.tech.slice(0, 5).map((x) => (
          <li key={x} className="chip">
            {x}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        {p.play && (
          <a href={`${BASE_PATH}${p.play}`} target="_blank" rel="noopener" className="btn btn-primary">
            {t.work.play}
            <span aria-hidden>▶</span>
          </a>
        )}
        {p.live && (
          <a href={p.live} target="_blank" rel="noopener noreferrer" className={`btn ${p.play ? "btn-ghost" : "btn-primary"}`}>
            {t.work.live}
            <span aria-hidden>↗</span>
          </a>
        )}
        <OpenCaseButton slug={slug} />
      </div>
    </div>
  );
}
