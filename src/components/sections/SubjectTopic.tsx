"use client";
import type { ReactNode } from "react";
import { TOPICS, PROJECT_NAMES } from "@/lib/chapters";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { Glass } from "@/components/ui/Glass";
import { useT } from "@/i18n/useT";

export function SubjectTopic({
  id,
  background,
}: {
  id: "websites" | "ai" | "cyber";
  background?: ReactNode;
}) {
  const t = useT();
  const topic = TOPICS.find((x) => x.id === id)!;
  const s = t.sections[id];
  const onDark = !!background; // a 3D backdrop sits behind -> light cover text

  return (
    <TopicRow id={id} label={s.title}>
      {background}
      <ProjectTrack label={s.title}>
        <ProjectPanel label={s.title}>
          <div
            className={`relative z-10 max-w-xl text-center ${
              onDark ? "[text-shadow:0_2px_24px_rgba(10,8,6,0.55)]" : ""
            }`}
          >
            <p className={`text-xs uppercase tracking-[0.3em] ${onDark ? "text-white/70" : "text-leaf"}`}>
              {t.nav[id]}
            </p>
            <h2 className={`headline mt-3 text-5xl sm:text-6xl ${onDark ? "text-white" : "text-forest"}`}>
              {s.title}
            </h2>
            <p className={`mt-4 text-lg ${onDark ? "text-white/80" : "text-ink-dim"}`}>{s.lead}</p>
            <p className={`mt-10 text-sm ${onDark ? "text-white/50" : "text-ink-faint"}`}>
              {t.ui.scrollSideways} →
            </p>
          </div>
        </ProjectPanel>
        {topic.projects.map((slug) => (
          <ProjectPanel key={slug} label={PROJECT_NAMES[slug]}>
            <Glass className="relative z-10 max-w-md p-10 text-center">
              <h3 className="headline text-3xl text-forest">{PROJECT_NAMES[slug]}</h3>
              <p className="mt-3 text-ink-dim">{t.projects[slug].blurb}</p>
              <button type="button" className="mt-6 rounded-full bg-leaf px-4 py-1.5 text-sm text-white">
                {t.ui.openCase}
              </button>
            </Glass>
          </ProjectPanel>
        ))}
      </ProjectTrack>
    </TopicRow>
  );
}
