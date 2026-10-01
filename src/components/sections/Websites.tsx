"use client";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Backdrop } from "@/components/journey/Backdrop";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { SplitText } from "@/components/ui/SplitText";
import { NextButton } from "@/components/ui/NextButton";
import { BrowserFrame, PhoneFrame } from "@/components/work/Frames";
import { TiltStage } from "@/components/work/TiltStage";
import { Trailer } from "@/components/work/Trailer";
import { WorkInfo } from "@/components/work/WorkInfo";
import { PROJECT_NAMES, TOPICS } from "@/lib/chapters";
import { PROJECTS } from "@/data/projects";
import { useT } from "@/i18n/useT";

// the art behind the panels loads once the row comes near (see Backdrop)
const WebsitesCoverBackdrop = dynamic(() => import("@/components/art/websites/WebsitesCoverBackdrop").then((m) => m.WebsitesCoverBackdrop), { ssr: false });
const HypBackdrop = dynamic(() => import("@/components/art/websites/HypBackdrop").then((m) => m.HypBackdrop), { ssr: false });
const LouisaBackdrop = dynamic(() => import("@/components/art/websites/LouisaBackdrop").then((m) => m.LouisaBackdrop), { ssr: false });

const SLUGS = TOPICS.find((x) => x.id === "websites")!.projects;
type SiteSlug = (typeof SLUGS)[number];

/** Calms the art behind the headline (left) on the cover. */
const COVER_SCRIM =
  "bg-[radial-gradient(48%_60%_at_24%_50%,rgba(5,8,13,0.72),transparent_72%)] max-lg:bg-[radial-gradient(90%_55%_at_40%_50%,rgba(5,8,13,0.7),transparent_75%)]";
/** Calms the art behind the copy column: the right on wide screens, the bottom once stacked. */
const SITE_SCRIM =
  "bg-[radial-gradient(42%_62%_at_76%_50%,rgba(5,8,13,0.74),transparent_72%)] max-lg:bg-[linear-gradient(to_bottom,transparent_38%,rgba(5,8,13,0.7)_58%,rgba(5,8,13,0.7)_92%,transparent)]";

/** Each site's own world behind its panel: HypHosting's floating blocks, Louisa's geode. */
const ART: Record<SiteSlug, (s: { active: boolean; still: boolean }) => ReactNode> = {
  hyphosting: (s) => <HypBackdrop {...s} />,
  louisa: (s) => <LouisaBackdrop {...s} />,
};

/** The live site in a browser, its phone version leaning in front, tilting toward the pointer. */
function SiteStage({ slug, priority = false }: { slug: SiteSlug; priority?: boolean }) {
  const t = useT();
  const p = PROJECTS[slug];
  if (!p.shots || !p.live) return null;
  return (
    <TiltStage className="relative w-full max-w-3xl">
      {p.trailer ? (
        <BrowserFrame url={p.live}>
          <Trailer name={p.trailer} label={`${t.work.video} ${PROJECT_NAMES[slug]}`} />
        </BrowserFrame>
      ) : (
        <BrowserFrame src={p.shots.desktop} url={p.live} alt={PROJECT_NAMES[slug]} sizes="(min-width: 1024px) 52vw, 88vw" priority={priority} />
      )}
      <PhoneFrame
        src={p.shots.mobile}
        alt=""
        sizes="(min-width: 1024px) 12vw, 24vw"
        className="absolute -bottom-8 -right-3 w-[23%] [transform:translateZ(60px)] sm:-right-8"
      />
    </TiltStage>
  );
}

/** Websites, sideways: a cover of browser windows drifting in a nebula, then
 *  one panel per live product, each in its own world. */
export function Websites() {
  const t = useT();
  const s = t.sections.websites;
  return (
    <TopicRow id="websites" label={s.title} className="overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_70%_50%,rgba(74,222,128,0.08),transparent_70%)]" />
      <ProjectTrack label={s.title}>
        <ProjectPanel label={s.title} backdrop={<Backdrop scrim={COVER_SCRIM}>{(st) => <WebsitesCoverBackdrop {...st} />}</Backdrop>}>
          <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div data-reveal className="flex flex-col items-start">
              <p className="label text-leaf">{t.nav.websites}</p>
              <SplitText as="h2" text={s.title} className="headline mt-4 text-6xl text-ink sm:text-7xl" />
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
          <ProjectPanel key={slug} label={PROJECT_NAMES[slug]} backdrop={<Backdrop scrim={SITE_SCRIM}>{ART[slug]}</Backdrop>}>
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
