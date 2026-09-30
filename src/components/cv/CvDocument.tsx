import type { CvContent } from "@/data/cv";
import { CvMetaColumn } from "./CvMetaColumn";
import { CvMainColumn } from "./CvMainColumn";

/** The A4 sheet itself: a masthead (name, role, tagline) over a narrow meta
    column and a main column. Plain block layout, not flex: a flex/grid child
    that does not fit the rest of page 1 gets pushed whole to page 2 by
    Chromium's print engine, and a flex-grow child gets stretched to fill a
    min-height ancestor, which compounds that. min-height (not height) so a
    short document still fills one visual page while a long one paginates. */
export function CvDocument({ copy }: { copy: CvContent }) {
  return (
    <article className="cv-page relative mx-auto w-[210mm] min-h-[297mm] bg-[#fcfbf8] p-[16mm] text-[#0f172a] shadow-[0_20px_60px_rgba(0,0,0,0.35)] [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:shadow-none">
      <header className="mb-[5mm] border-b border-[#0f172a]/10 pb-[3mm]">
        <h1 className="font-display text-[26pt] font-semibold leading-none tracking-[-0.01em]">{copy.name}</h1>
        <p className="cv-mono mt-[2mm] text-[9.5pt] uppercase tracking-[0.05em] text-[#16a34a]">{copy.role}</p>
        <p className="mt-[2.5mm] max-w-[150mm] text-[9pt] leading-[1.5] text-[#4b5563]">{copy.tagline}</p>
      </header>

      <div className="grid grid-cols-[60mm_1fr] gap-[8mm]">
        <CvMetaColumn copy={copy} />
        <CvMainColumn copy={copy} />
      </div>
    </article>
  );
}
