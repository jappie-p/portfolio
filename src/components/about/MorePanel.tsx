"use client";
import { ProjectPanel } from "@/components/journey/panels";
import { ARCHIVE } from "@/data/projects";
import { useT } from "@/i18n/useT";
import { PanelHeading } from "./PanelHeading";

/** The smaller builds as a quiet table: year, title, one line, the stack. */
export function MorePanel() {
  const t = useT();
  const a = t.about;
  return (
    <ProjectPanel label={a.moreTitle}>
      <div className="w-full max-w-5xl">
        <PanelHeading label={t.nav.about} title={a.moreTitle} lead={a.moreLead} />
        <ul data-reveal className="mt-12 border-t border-white/10">
          {ARCHIVE.map((item) => {
            const copy = t.archive[item.id];
            return (
              <li
                key={item.id}
                className="group relative grid gap-x-10 gap-y-2 border-b border-white/10 py-7 sm:grid-cols-[4.5rem_minmax(0,1fr)] lg:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,0.85fr)] lg:items-baseline"
              >
                <span aria-hidden className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-gradient-to-r from-leaf/70 via-leaf/20 to-transparent transition-transform duration-700 ease-out group-hover:scale-x-100" />
                <span className="label text-(--quiet)">{item.year}</span>
                <h3 className="headline text-[1.75rem] text-ink">
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-baseline gap-2 transition-colors duration-300 hover:text-leaf">
                      {copy.title}
                      <span aria-hidden className="text-lg text-(--quiet) transition-[color,translate] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-leaf">
                        ↗
                      </span>
                    </a>
                  ) : (
                    copy.title
                  )}
                </h3>
                <p className="leading-relaxed text-ink-dim sm:col-start-2 lg:col-start-auto">{copy.text}</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs leading-relaxed tracking-wide text-(--quiet) sm:col-start-2 lg:col-start-auto lg:flex-col lg:items-end">
                  {item.tech.map((x) => (
                    <li key={x} className="whitespace-nowrap">
                      {x}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </ProjectPanel>
  );
}
