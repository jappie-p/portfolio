import Image from "next/image";
import jasperPhoto from "@/assets/about/jasper.webp";
import { SKILLS } from "@/data/skills";
import type { CvContent } from "@/data/cv";
import { CvSection } from "./CvSection";

/** Narrow left column: photo, contact, hard skills, soft skills, languages,
    interests. Everything here is short lines or comma-joined lists, kept
    plain (no chips) so the page reads calm rather than busy. */
export function CvMetaColumn({ copy }: { copy: CvContent }) {
  return (
    <aside className="flex flex-col gap-[4mm]">
      <Image
        src={jasperPhoto}
        alt={copy.photoAlt}
        width={360}
        height={404}
        priority
        className="h-auto w-[30mm] rounded-[3mm] object-cover shadow-[0_1mm_3mm_rgba(15,23,42,0.18)]"
      />

      <CvSection label={copy.sectionLabels.contact}>
        <ul className="flex flex-col gap-[1.2mm] text-[8pt] leading-[1.5] text-[#334155]">
          <li>
            <a href={`mailto:${copy.contact.email}`} className="break-all hover:text-[#16a34a]">
              {copy.contact.email}
            </a>
          </li>
          <li>
            <a href={copy.contact.github.href} className="hover:text-[#16a34a]">
              {copy.contact.github.label}
            </a>
          </li>
          <li>
            <a href={copy.contact.site.href} className="hover:text-[#16a34a]">
              {copy.contact.site.label}
            </a>
          </li>
          <li>{copy.contact.location}</li>
        </ul>
      </CvSection>

      <CvSection label={copy.sectionLabels.skills}>
        <ul className="flex flex-col gap-[2mm]">
          {SKILLS.map((group) => (
            <li key={group.id}>
              <p className="cv-mono text-[7pt] font-medium uppercase tracking-[0.1em] text-[#64748b]">
                {copy.skillGroupLabels[group.id]}
              </p>
              <p className="text-[8pt] leading-[1.4] text-[#334155]">{group.items.join(", ")}</p>
            </li>
          ))}
        </ul>
      </CvSection>

      <CvSection label={copy.sectionLabels.softSkills}>
        <p className="text-[8pt] leading-[1.4] text-[#334155]">{copy.softSkills.join(", ")}</p>
      </CvSection>

      <CvSection label={copy.sectionLabels.languages}>
        <ul className="flex flex-col text-[8pt] leading-[1.5] text-[#334155]">
          {copy.languages.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </CvSection>

      <CvSection label={copy.sectionLabels.interests}>
        <p className="text-[8pt] leading-[1.4] text-[#334155]">{copy.interests.join(", ")}</p>
      </CvSection>
    </aside>
  );
}
