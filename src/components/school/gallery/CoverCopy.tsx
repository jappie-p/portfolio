"use client";
import { SplitText } from "@/components/ui/SplitText";
import { NextButton } from "@/components/ui/NextButton";
import { useT } from "@/i18n/useT";
import { PosterWall, WallNote } from "../PosterWall";

/** The exhibition's title and copy: the section heading, on the wall.
 *  `onNext` is the live gallery's own way on (into its first print). */
export function CoverCopy({ onNext }: { onNext?: () => void }) {
  const t = useT();
  return (
    <div data-reveal className="flex flex-col items-start">
      <p className="label text-leaf">{t.nav.school}</p>
      <SplitText as="h2" text={t.school.title} className="headline mt-4 text-[clamp(2.25rem,7vw,4rem)] text-ink" />
      <p className="mt-4 max-w-xl text-lg text-ink-dim">{t.sections.school.lead}</p>
      <p className="mt-2 text-sm text-ink-faint">{t.school.programme}</p>
      <NextButton label={t.ui.scrollSideways} onNext={onNext} />
    </div>
  );
}

/** The cover as a flat poster wall: framed prints under CSS spotlights and a
 *  taped note, for when the live gallery cannot run. */
export function PrintWall() {
  return (
    <div className="flex w-full max-w-6xl flex-col">
      <div className="flex items-start justify-between gap-10">
        <CoverCopy />
        <div data-reveal className="hidden pt-6 sm:block">
          <WallNote />
        </div>
      </div>
      <div data-reveal className="mt-10 w-full">
        <PosterWall />
      </div>
      <div data-reveal className="mt-8 sm:hidden">
        <WallNote />
      </div>
    </div>
  );
}
