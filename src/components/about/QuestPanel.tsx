"use client";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { LEARNING } from "@/data/skills";
import { jumpTo } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import { PanelHeading } from "./PanelHeading";
import a from "./about.module.css";
import s from "./quests.module.css";

/** What I want to learn next as a quest log, the first one active, and
 *  references on request as co-op. */
export function QuestPanel() {
  const t = useT();
  const ab = t.about;
  const q = ab.quests;
  return (
    <ProjectPanel label={ab.learnTitle}>
      <div className="w-full max-w-5xl">
        <PanelHeading label={q.kicker} title={ab.learnTitle} lead={ab.learnLead} />
        <ol data-reveal className={s.log}>
          {LEARNING.map((id, i) => (
            <li key={id} className={s.quest} data-active={i === 0 || undefined}>
              <div className={s.head}>
                <span className={s.no} />
                <span className={s.state}>{i === 0 ? q.active : q.next}</span>
              </div>
              <h3 className={s.title}>{t.learning[id].title}</h3>
              <p className={s.text}>{t.learning[id].text}</p>
            </li>
          ))}
        </ol>
        <section data-reveal className={s.coop} aria-labelledby="refs">
          <div>
            <p className={a.kicker}>{q.coop}</p>
            <h3 id="refs" className="mt-2 font-display text-xl font-semibold text-ink">
              {ab.refsTitle}
            </h3>
            <p className={s.coopText}>{ab.refsText}</p>
          </div>
          <button type="button" onClick={() => jumpTo("contact")} className="btn btn-ghost shrink-0 self-start sm:self-auto">
            {ab.refsCta}
            <span aria-hidden>→</span>
          </button>
        </section>
        <NextButton label={ab.moreTitle} />
      </div>
    </ProjectPanel>
  );
}
