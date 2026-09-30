import type { CvContent } from "@/data/cv";
import { CvSection } from "./CvSection";

/** Main column: profile, experience (plus a compact side-jobs line),
    education, selected projects. Each repeating item carries its own
    break-inside-avoid-page so a page break can fall between entries but
    never inside one. */
export function CvMainColumn({ copy }: { copy: CvContent }) {
  return (
    <div className="flex flex-col gap-[4mm]">
      <CvSection label={copy.sectionLabels.profile}>
        <p className="text-[9pt] leading-[1.45] text-[#334155]">{copy.profile}</p>
      </CvSection>

      <CvSection label={copy.sectionLabels.experience}>
        <div className="flex flex-col gap-[3mm]">
          {copy.experience.map((item) => (
            <article key={`${item.org}-${item.role}`} className="break-inside-avoid-page">
              <div className="flex items-baseline justify-between gap-[3mm]">
                <h3 className="text-[10pt] font-semibold text-[#0f172a]">{item.role}</h3>
                <span className="cv-mono shrink-0 text-[7.5pt] text-[#8b93a1]">{item.period}</span>
              </div>
              <p className="text-[8.5pt] text-[#64748b]">
                {item.org} · {item.orgNote}
              </p>
              <ul className="mt-[1.5mm] flex flex-col gap-[0.8mm]">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="text-[8.5pt] leading-[1.45] text-[#334155]">
                    <span aria-hidden className="mr-[1.5mm] text-[#16a34a]">
                      •
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <div className="break-inside-avoid-page">
            <p className="cv-mono text-[7pt] font-medium uppercase tracking-[0.1em] text-[#64748b]">
              {copy.sectionLabels.sideJobs}
            </p>
            <ul className="mt-[1mm] flex flex-col gap-[0.5mm]">
              {copy.sideJobs.map((line) => (
                <li key={line} className="text-[8.5pt] leading-[1.4] text-[#334155]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CvSection>

      <CvSection label={copy.sectionLabels.education}>
        <div className="flex flex-col gap-[2mm]">
          {copy.education.map((item) => (
            <div key={item.program} className="flex items-baseline justify-between gap-[3mm] break-inside-avoid-page">
              <div>
                <p className="text-[9pt] font-semibold text-[#0f172a]">{item.program}</p>
                {item.place && <p className="text-[8.5pt] text-[#64748b]">{item.place}</p>}
              </div>
              <span className="cv-mono shrink-0 text-[7.5pt] text-[#8b93a1]">{item.status}</span>
            </div>
          ))}
        </div>
      </CvSection>

      <CvSection label={copy.sectionLabels.projects}>
        <ul className="flex flex-col gap-[2mm]">
          {copy.projects.map((project) => (
            <li key={project.name} className="break-inside-avoid-page text-[8.5pt] leading-[1.45] text-[#334155]">
              <span className="font-semibold text-[#0f172a]">{project.name}.</span> {project.description}
            </li>
          ))}
        </ul>
      </CvSection>
    </div>
  );
}
