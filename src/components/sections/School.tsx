"use client";
import { useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { KioskReceipt } from "@/components/art/kiosk/KioskReceipt";
import { ZeldaPlayable } from "@/components/art/zelda/ZeldaPlayable";
import { GalleryWall, PosterWall, WallNote } from "@/components/school/PosterWall";
import { Backdrop } from "@/components/journey/Backdrop";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { SplitText } from "@/components/ui/SplitText";
import { NextButton } from "@/components/ui/NextButton";
import { BrowserFrame, KioskFrame, PhoneFrame } from "@/components/work/Frames";
import { TiltStage } from "@/components/work/TiltStage";
import { Trailer } from "@/components/work/Trailer";
import { WorkInfo } from "@/components/work/WorkInfo";
import { PROJECT_NAMES, TOPICS } from "@/lib/chapters";
import { useInView, useStill } from "@/lib/scene";
import { PROJECTS } from "@/data/projects";
import { SITE, BASE_PATH } from "@/data/site";
import { useT } from "@/i18n/useT";

// the art behind the panels loads once the row comes near (see Backdrop)
const ZeldaBackdrop = dynamic(() => import("@/components/art/zelda/ZeldaBackdrop").then((m) => m.ZeldaBackdrop), { ssr: false });
const KioskBackdrop = dynamic(() => import("@/components/art/kiosk/KioskBackdrop").then((m) => m.KioskBackdrop), { ssr: false });
const FestivalBackdrop = dynamic(() => import("@/components/art/festival/FestivalBackdrop").then((m) => m.FestivalBackdrop), { ssr: false });

const SLUGS = TOPICS.find((x) => x.id === "school")!.projects;
type SchoolSlug = (typeof SLUGS)[number];

/** Darkens the copy's side of the art: the right on wide screens, the bottom once stacked. */
const SCRIM =
  "bg-[linear-gradient(90deg,transparent_45%,rgba(5,8,13,0.55)_62%,rgba(5,8,13,0.7))] max-lg:bg-[linear-gradient(180deg,transparent_40%,rgba(5,8,13,0.72)_58%)]";

/** The game in a browser window: the trailer until you press play, then the
 *  real build, running in the page via WebAssembly. */
function ZeldaStage() {
  const t = useT();
  const g = t.school.game;
  const p = PROJECTS.zelda;
  return (
    <TiltStage className="relative w-full max-w-3xl">
      <BrowserFrame url={`${SITE.url}${BASE_PATH}${p.play!.replace("/index.html", "")}`}>
        <ZeldaPlayable
          poster={<Trailer name="zelda" label={`${t.work.video} ${PROJECT_NAMES.zelda}`} />}
          playLabel={g.play}
          stopLabel={g.stop}
          controlsLabel={g.controls}
          title={g.title}
          loadingLabel={g.loading}
        />
      </BrowserFrame>
    </TiltStage>
  );
}

/** Two kiosk screens side by side, the welcome screen and the menu, with the
 *  receipt printing in front. */
function KioskStage() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const active = useInView(ref);
  const still = useStill();
  const [start, menu] = PROJECTS.kiosk.screens!;
  return (
    <div ref={ref} className="w-full max-w-lg">
      <TiltStage className="w-full" innerClassName="flex items-end justify-center gap-6">
        <KioskFrame src={start} alt={PROJECT_NAMES.kiosk} sizes="(min-width: 1024px) 15vw, 40vw" className="w-[44%] -translate-y-6" />
        <KioskFrame src={menu} alt="" sizes="(min-width: 1024px) 15vw, 40vw" className="w-[44%]" />
        <KioskReceipt labels={t.school.receipt} active={active} still={still} className="absolute bottom-[-2%] -right-[3%] text-[5.2px] sm:-right-[12%] sm:text-[7.4px]" />
      </TiltStage>
    </div>
  );
}

/** Three phones fanned out: news in front, timetable and map behind. */
function FestivalStage() {
  const [home, schedule, map] = PROJECTS.festival.screens!;
  return (
    <TiltStage className="w-full max-w-xl" innerClassName="relative flex h-[440px] items-center justify-center sm:h-[540px]">
      <PhoneFrame src={map} alt="" sizes="(min-width: 1024px) 12vw, 30vw" className="absolute left-[6%] top-1/2 w-[31%] -translate-y-1/2 rotate-[-8deg] opacity-80" />
      <PhoneFrame src={schedule} alt="" sizes="(min-width: 1024px) 12vw, 30vw" className="absolute right-[6%] top-1/2 w-[31%] -translate-y-1/2 rotate-[8deg] opacity-80" />
      <PhoneFrame src={home} alt={PROJECT_NAMES.festival} sizes="(min-width: 1024px) 14vw, 36vw" className="relative z-10 w-[36%]" />
    </TiltStage>
  );
}

const STAGES: Record<SchoolSlug, () => React.JSX.Element> = {
  zelda: ZeldaStage,
  kiosk: KioskStage,
  festival: FestivalStage,
};

/** Each project's own world behind its panel. */
const ART: Record<SchoolSlug, (s: { active: boolean; still: boolean }) => ReactNode> = {
  zelda: (s) => <ZeldaBackdrop {...s} />,
  kiosk: (s) => <KioskBackdrop {...s} />,
  festival: (s) => <FestivalBackdrop {...s} />,
};

/** School, sideways: a gallery wall with a print of every project's world,
 *  then one panel per project, in that world: the game's pixel dusk, the
 *  kiosk's restaurant, the festival's stage. A print zooms into its panel. */
export function School() {
  const t = useT();
  const s = t.sections.school;
  return (
    <TopicRow id="school" label={s.title} className="overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_25%_60%,rgba(74,222,128,0.07),transparent_70%)]" />
      <ProjectTrack label={s.title}>
        <ProjectPanel label={t.school.title} backdrop={<GalleryWall />}>
          <div className="flex w-full max-w-6xl flex-col">
            <div className="flex items-start justify-between gap-10">
              <div data-reveal className="flex flex-col items-start">
                <p className="label text-leaf">{t.nav.school}</p>
                <SplitText as="h2" text={t.school.title} className="headline mt-4 text-[clamp(2.25rem,7vw,4rem)] text-ink" />
                <p className="mt-4 max-w-xl text-lg text-ink-dim">{s.lead}</p>
                <p className="mt-2 text-sm text-ink-faint">{t.school.programme}</p>
                <NextButton label={t.ui.scrollSideways} />
              </div>
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
        </ProjectPanel>

        {SLUGS.map((slug) => {
          const Stage = STAGES[slug];
          return (
            <ProjectPanel key={slug} label={PROJECT_NAMES[slug]} backdrop={<Backdrop scrim={SCRIM}>{ART[slug]}</Backdrop>}>
              <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
                <div data-reveal className="flex justify-center pb-6 lg:pb-0">
                  <Stage />
                </div>
                <WorkInfo slug={slug} />
              </div>
            </ProjectPanel>
          );
        })}
      </ProjectTrack>
    </TopicRow>
  );
}
