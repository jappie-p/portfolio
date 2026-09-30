"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { WorkInfo } from "@/components/work/WorkInfo";
import { SystemDiagram } from "@/components/work/SystemDiagram";
import { PROJECT_NAMES } from "@/lib/chapters";
import { useInView, useNearOnce, useSceneMode } from "@/lib/scene";
import { useT } from "@/i18n/useT";

const WorldCanvas = dynamic(() => import("@/components/canvas/WorldCanvas").then((m) => m.WorldCanvas), { ssr: false });

/** AI, sideways: the Jarvis orb lives on the right while the copy reads on the
 *  left; on the work-experience panel it glides up to make room for the
 *  automation diagram. */
export function Ai() {
  const t = useT();
  const s = t.sections.ai;
  const ref = useRef<HTMLElement>(null);
  const mode = useSceneMode();
  const inView = useInView(ref, "50% 0px");
  // the orb is built only when the topic comes near, not at page load
  const near = useNearOnce(ref);

  return (
    <TopicRow id="ai" label={s.title} ref={ref} className="overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_75%_50%,rgba(34,211,238,0.07),transparent_70%)]" />
      {mode !== "off" && near && <WorldCanvas active={inView} still={mode === "still"} />}
      <ProjectTrack label={s.title}>
        <ProjectPanel label={s.title} className="lg:items-start">
          <div data-reveal className="flex w-full max-w-6xl flex-col items-start pt-[38vh] sm:pt-0 lg:w-1/2 lg:pl-[max(0px,calc((100vw-72rem)/2))]">
            <p className="label text-leaf">{t.nav.ai}</p>
            <h2 className="headline mt-4 text-6xl text-ink sm:text-7xl">{s.title}</h2>
            <p className="mt-5 max-w-md text-lg text-ink-dim">{s.lead}</p>
            <NextButton label={t.ui.scrollSideways} />
          </div>
        </ProjectPanel>

        <ProjectPanel label={PROJECT_NAMES.jarvis} className="lg:items-start">
          <div className="w-full max-w-6xl pt-[38vh] sm:pt-0 lg:w-1/2 lg:pl-[max(0px,calc((100vw-72rem)/2))]">
            <WorkInfo slug="jarvis" />
          </div>
        </ProjectPanel>

        <ProjectPanel label={PROJECT_NAMES["go-to-guy"]}>
          <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <WorkInfo slug="go-to-guy" />
            <div data-reveal className="flex justify-center lg:pt-24">
              <SystemDiagram id="go-to-guy" />
            </div>
          </div>
        </ProjectPanel>
      </ProjectTrack>
    </TopicRow>
  );
}
