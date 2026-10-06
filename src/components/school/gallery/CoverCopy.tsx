"use client";
import { SplitText } from "@/components/ui/SplitText";
import { NextButton } from "@/components/ui/NextButton";
import { useT } from "@/i18n/useT";
import { PosterWall, WallNote } from "../PosterWall";

/** The museum's wall text: what this room is, its name over two lines, and
 *  the way in. `onNext` is the live gallery's own way in (into its first
 *  print); without it the button moves the track on, like everywhere else. */
export function CoverCopy({ onNext }: { onNext?: () => void }) {
  const t = useT();
  const m = t.school.museum;
  return (
    <div data-reveal className="flex max-w-[30rem] flex-col items-start">
      <p className="label text-leaf">{m.kicker}</p>
      <h2 className="headline mt-5 text-[clamp(3.2rem,7.2vw,6.6rem)] leading-[0.9] text-ink">
        <span className="sr-only">{t.school.title}</span>
        <span aria-hidden className="block">
          <SplitText text={m.titleA} className="block" />
          <SplitText text={m.titleB} className="block" delay={120} />
        </span>
      </h2>
      <p className="mt-6 text-[clamp(1.15rem,1.6vw,1.45rem)] leading-snug text-ink">{m.lead}</p>
      <p className="mt-3 text-sm text-ink-faint">{t.school.programme}</p>
      <NextButton label={m.tour} onNext={onNext} primary className="mt-8!" />
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
