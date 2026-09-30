"use client";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { BrowserFrame, KioskFrame, PhoneFrame } from "@/components/work/Frames";
import { TiltStage } from "@/components/work/TiltStage";
import { Trailer } from "@/components/work/Trailer";
import { WorkInfo } from "@/components/work/WorkInfo";
import { PROJECT_NAMES, TOPICS, type ProjectSlug } from "@/lib/chapters";
import { PROJECTS, SCHOOL_EXTRA, formatPeriod } from "@/data/projects";
import { SITE, BASE_PATH } from "@/data/site";
import { useT } from "@/i18n/useT";

const SLUGS = TOPICS.find((x) => x.id === "school")!.projects;

/** The game, running in a browser window: it really does, via WebAssembly. */
function ZeldaStage() {
  const t = useT();
  const p = PROJECTS.zelda;
  return (
    <TiltStage className="relative w-full max-w-3xl">
      <BrowserFrame url={`${SITE.url}${BASE_PATH}${p.play!.replace("/index.html", "")}`}>
        <Trailer name="zelda" label={`${t.work.video} ${PROJECT_NAMES.zelda}`} />
      </BrowserFrame>
    </TiltStage>
  );
}

/** Two kiosk screens side by side: the welcome screen and the menu. */
function KioskStage() {
  const [start, menu] = PROJECTS.kiosk.screens!;
  return (
    <TiltStage className="w-full max-w-lg" innerClassName="flex items-end justify-center gap-6">
      <KioskFrame src={start} alt={PROJECT_NAMES.kiosk} sizes="(min-width: 1024px) 15vw, 40vw" className="w-[44%] -translate-y-6" />
      <KioskFrame src={menu} alt="" sizes="(min-width: 1024px) 15vw, 40vw" className="w-[44%]" />
    </TiltStage>
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

const STAGES: Record<(typeof SLUGS)[number], () => React.JSX.Element> = {
  zelda: ZeldaStage,
  kiosk: KioskStage,
  festival: FestivalStage,
};

/** One school project in the cover list: name, year, solo/team. */
function Row({ slug }: { slug: ProjectSlug }) {
  const t = useT();
  const p = PROJECTS[slug];
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="headline text-xl text-ink">{PROJECT_NAMES[slug]}</p>
        <p className="mt-1 text-sm text-ink-faint">{t.projects[slug].blurb}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="label hidden text-ink-faint sm:inline">{formatPeriod(p.period, t.work.until, t.work.now)}</span>
        <span className="tag">{p.team ? t.work.team : t.work.solo}</span>
      </div>
    </li>
  );
}

/** School, sideways: a cover listing everything I made for my course, then one
 *  panel per project with the game, the kiosk and the festival app. */
export function School() {
  const t = useT();
  const s = t.sections.school;
  return (
    <TopicRow id="school" label={s.title} className="overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_25%_60%,rgba(74,222,128,0.07),transparent_70%)]" />
      <ProjectTrack label={s.title}>
        <ProjectPanel label={t.school.title}>
          <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1fr] [&>*]:min-w-0">
            <div data-reveal className="flex flex-col items-start">
              <p className="label text-leaf">{t.nav.school}</p>
              <h2 className="headline mt-4 text-[clamp(2.25rem,10vw,4.5rem)] text-ink">{t.school.title}</h2>
              <p className="mt-5 max-w-md text-lg text-ink-dim">{s.lead}</p>
              <p className="mt-3 text-sm text-ink-faint">{t.school.programme}</p>
              <NextButton label={t.ui.scrollSideways} />
            </div>
            <div data-reveal>
              <ul className="glass divide-y divide-white/5">
                {SLUGS.map((slug) => (
                  <Row key={slug} slug={slug} />
                ))}
                <li className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="headline text-xl text-ink">{t.school.extraTitle}</p>
                    <p className="mt-1 text-sm text-ink-faint">{t.school.extraText}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="label hidden text-ink-faint sm:inline">{SCHOOL_EXTRA.year}</span>
                    <span className="tag">{SCHOOL_EXTRA.team ? t.work.team : t.work.solo}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </ProjectPanel>

        {SLUGS.map((slug) => {
          const Stage = STAGES[slug];
          return (
            <ProjectPanel key={slug} label={PROJECT_NAMES[slug]}>
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
