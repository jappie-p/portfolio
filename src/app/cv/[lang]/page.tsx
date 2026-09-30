import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CV, isCvLocale } from "@/data/cv";
import { CvDocument } from "@/components/cv/CvDocument";
import { CvToolbar } from "@/components/cv/CvToolbar";
import { CvLangSync } from "@/components/cv/CvLangSync";
import "../cv.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function generateStaticParams() {
  return [{ lang: "nl" }, { lang: "en" }];
}

// Only nl/en are real documents; anything else 404s instead of rendering.
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/cv/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isCvLocale(lang)) return {};
  const copy = CV[lang];
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { languages: { nl: "/cv/nl", en: "/cv/en" } },
  };
}

export default async function CvPage({ params }: PageProps<"/cv/[lang]">) {
  const { lang } = await params;
  if (!isCvLocale(lang)) notFound();
  const copy = CV[lang];

  return (
    <main className="cv-root min-h-screen px-4 py-10 sm:py-14 print:min-h-0 print:p-0">
      <CvLangSync lang={lang} />
      {/* Self-hosted so the CV's small caps labels match the site's mono
          type; kept out of cv.css because it needs the basePath prefix. */}
      <style>{`
        @font-face {
          font-family: "Geist Mono CV";
          src: url("${BASE}/fonts/GeistMono-Regular.woff") format("woff");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
      <CvToolbar lang={lang} copy={copy} />
      {/* The sheet is a fixed 210mm; on a narrow viewport it scrolls inside
          this box instead of widening the whole page. */}
      <div className="mt-6 overflow-x-auto print:mt-0 print:overflow-visible">
        <CvDocument copy={copy} />
      </div>
    </main>
  );
}
