import type { CvContent, CvLocale } from "@/data/cv";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const OTHER_LANG: Record<CvLocale, CvLocale> = { nl: "en", en: "nl" };
const PDF_FILE: Record<CvLocale, string> = {
  nl: "jasper-pathuis-cv-nl.pdf",
  en: "jasper-pathuis-cv-en.pdf",
};

/** Screen-only chrome above the paper: download the PDF, switch language,
    or leave. Hidden in print so only the document itself is exported. */
export function CvToolbar({ lang, copy }: { lang: CvLocale; copy: CvContent }) {
  return (
    <div className="glass mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center justify-center gap-3 rounded-full px-5 py-3 print:hidden">
      <a href={`${BASE}/cv/${PDF_FILE[lang]}`} className="btn btn-primary">
        {copy.toolbar.downloadPdf}
      </a>
      <a href={`${BASE}/cv/${OTHER_LANG[lang]}`} className="btn btn-ghost">
        {copy.toolbar.switchLabel}
      </a>
      <a href={`${BASE}/`} className="btn btn-ghost">
        {copy.toolbar.backToPortfolio}
      </a>
    </div>
  );
}
