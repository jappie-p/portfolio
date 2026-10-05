"use client";
import { ProjectPanel } from "@/components/journey/panels";
import { ARCHIVE } from "@/data/projects";
import { useT } from "@/i18n/useT";
import { PanelHeading } from "./PanelHeading";
import a from "./about.module.css";
import s from "./quests.module.css";

/** The smaller builds as side quests: year, name, one line, the stack; and
 *  what I do away from the screen. */
export function SideQuestPanel() {
  const t = useT();
  const ab = t.about;
  return (
    <ProjectPanel label={ab.moreTitle}>
      <div className="w-full max-w-5xl">
        <PanelHeading label={ab.sideKicker} title={ab.moreTitle} lead={ab.moreLead} />
        <ul data-reveal className={s.side}>
          {ARCHIVE.map((item) => {
            const copy = t.archive[item.id];
            return (
              <li key={item.id} className={s.row}>
                <span className={s.year}>{item.year}</span>
                <h3>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={s.sideName}>
                      {copy.title}
                      <span aria-hidden className="text-base text-(--quiet)">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <span className={s.sideName}>{copy.title}</span>
                  )}
                </h3>
                <p className="leading-relaxed text-ink-dim">{copy.text}</p>
                <ul className={s.stack}>
                  {item.tech.map((x) => (
                    <li key={x} className="chip">
                      {x}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p data-reveal className={s.offline}>
          <span className={a.kicker}>{ab.player.offlineTitle}</span>
          <span>{ab.player.offline}</span>
        </p>
      </div>
    </ProjectPanel>
  );
}
