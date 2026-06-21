"use client";
import { TOPICS, PROJECT_NAMES } from "@/lib/chapters";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { Glass } from "@/components/ui/Glass";
import { useT } from "@/i18n/useT";

export function SubjectTopic({ id }: { id: "websites" | "ai" | "cyber" }) {
  const t = useT();
  const topic = TOPICS.find((x) => x.id === id)!;
  const s = t.sections[id];
  return (
    <TopicRow id={id} label={s.title}>
      <ProjectTrack label={s.title}>
        <ProjectPanel label={s.title}>
          <div className="max-w-xl text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-leaf">{t.nav[id]}</p>
            <h2 className="headline mt-3 text-5xl text-forest sm:text-6xl">{s.title}</h2>
            <p className="mt-4 text-lg text-ink-dim">{s.lead}</p>
            <p className="mt-10 text-sm text-ink-faint">{`${t.ui.scrollSideways} →`}</p>
          </div>
        </ProjectPanel>
        {topic.projects.map((slug) => (
          <ProjectPanel key={slug} label={PROJECT_NAMES[slug]}>
            <Glass className="max-w-md p-10 text-center">
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
