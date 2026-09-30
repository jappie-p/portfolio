"use client";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { BrowserFrame, PhoneFrame } from "@/components/work/Frames";
import { TiltStage } from "@/components/work/TiltStage";
import { WorkInfo } from "@/components/work/WorkInfo";
import { PROJECT_NAMES, TOPICS } from "@/lib/chapters";
import { PROJECTS } from "@/data/projects";
import { useT } from "@/i18n/useT";

const SLUGS = TOPICS.find((x) => x.id === "websites")!.projects;

/** The live site in a browser, its phone version leaning in front, tilting toward the pointer. */
function SiteStage({ slug, priority = false }: { slug: (typeof SLUGS)[number]; priority?: boolean }) {
  const p = PROJECTS[slug];
  if (!p.shots || !p.live) return null;
  return (
    <TiltStage className="relative w-full max-w-3xl">
      <BrowserFrame src={p.shots.desktop} url={p.live} alt={PROJECT_NAMES[slug]} sizes="(min-width: 1024px) 52vw, 88vw" priority={priority} />
      <PhoneFrame
        src={p.shots.mobile}
        alt=""
        sizes="(min-width: 1024px) 12vw, 24vw"
        className="absolute -bottom-8 -right-3 w-[23%] [transform:translateZ(60px)] sm:-right-8"
      />
    </TiltStage>
  );
}

/** Websites, sideways: a cover, then one panel per live product. */
export function Websites() {
  const t = useT();
  const s = t.sections.websites;
  return (
    <TopicRow id="websites" label={s.title} className="overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_70%_50%,rgba(74,222,128,0.08),transparent_70%)]" />
      <ProjectTrack label={s.title}>
        <ProjectPanel label={s.title}>
          <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div data-reveal className="flex flex-col items-start">
              <p className="label text-leaf">{t.nav.websites}</p>
              <h2 className="headline mt-4 text-6xl text-ink sm:text-7xl">{s.title}</h2>
              <p className="mt-5 max-w-md text-lg text-ink-dim">{s.lead}</p>
              <NextButton label={t.ui.scrollSideways} />
            </div>
            <div data-reveal className="relative hidden h-[420px] lg:block">
              {SLUGS.map((slug, i) => {
                const p = PROJECTS[slug];
                if (!p.shots || !p.live) return null;
                return (
                  <div
                    key={slug}
                    className={`cover-card absolute w-[78%] ${i === 0 ? "left-0 top-6 -rotate-3" : "right-0 top-28 rotate-2"}`}
                  >
                    <BrowserFrame src={p.shots.desktop} url={p.live} alt={PROJECT_NAMES[slug]} sizes="36vw" />
                  </div>
                );
              })}
            </div>
          </div>
        </ProjectPanel>

        {SLUGS.map((slug, i) => (
          <ProjectPanel key={slug} label={PROJECT_NAMES[slug]}>
            <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
              <div data-reveal className="flex justify-center pb-6 lg:pb-0">
                <SiteStage slug={slug} priority={i === 0} />
              </div>
              <WorkInfo slug={slug} />
            </div>
          </ProjectPanel>
        ))}
      </ProjectTrack>
    </TopicRow>
  );
}
