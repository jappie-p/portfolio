"use client";
import dynamic from "next/dynamic";
import { useRef, useState, type KeyboardEvent } from "react";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { LEARNING, SKILLS, SOFT_SKILLS } from "@/data/skills";
import { useInView, useNearOnce, useSceneMode } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import { Leaves, type Leaf } from "./Leaves";
import a from "./about.module.css";
import g from "./growth.module.css";

const MedalCanvas = dynamic(() => import("./medal/MedalCanvas").then((m) => m.MedalCanvas), { ssr: false });

const TABS = ["story", "skills", "learn"] as const;
type Tab = (typeof TABS)[number];

/** An open book, and a leaf: the marks over the two columns. */
const BOOK = "M3 5.5C5.6 4.4 8.6 4.4 12 6.3c3.4-1.9 6.4-1.9 9-.8v13c-2.6-1.1-5.6-1.1-9 .8-3.4-1.9-6.4-1.9-9-.8Zm9 .8v13";
const LEAF = "M4 20c0-9 6-15 16-16-1 10-7 16-16 16Zm0 0 9-9";

function Mark({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className={g.mark}>
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A plant at the desk's corner, seen from above and out of focus. */
const DESK_PLANT: Leaf[] = [
  { turn: -30, stem: 1.6, size: 1.3, fill: "#4e7a42", twist: -14 },
  { turn: 0, stem: 2.2, size: 1.4, fill: "#355f30" },
  { turn: 28, stem: 1.5, size: 1.25, fill: "#5d8a4a", twist: 18 },
  { turn: 55, stem: 1.1, size: 1.1, fill: "#3f6c38", twist: 30 },
];

/** The medal on the desk: wood, a plant out of focus, the note, the medal live. */
function Desk() {
  const t = useT();
  const gr = t.about.growth;
  const mode = useSceneMode();
  const host = useRef<HTMLDivElement>(null);
  const near = useNearOnce(host);
  const active = useInView(host);
  return (
    <figure ref={host} className={g.desk}>
      <span aria-hidden className={g.wood} />
      <Leaves className={g.plant} leaves={DESK_PLANT} />
      <div className={g.note} aria-hidden>
        <span className={g.tape} />
        {gr.note.split("\n").map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <div className={g.medal} role="img" aria-label={gr.medal}>
        <span aria-hidden className={g.shadow} />
        {near && mode !== "off" ? <MedalCanvas active={active} still={mode === "still"} /> : <span aria-hidden className={g.medalFlat} />}
      </div>
    </figure>
  );
}

/**
 * How I grew: the medal on my desk at the left, beside it three tabs of the
 * story behind it: where I come from and why I do this, what I build with
 * (hard and soft skills), and what I want to learn next.
 */
export function GrowthPanel() {
  const t = useT();
  const ab = t.about;
  const gr = ab.growth;
  const [tab, setTab] = useState<Tab>("story");
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ story: null, skills: null, learn: null });

  // the tablist's own arrows (the page would otherwise take them to walk sideways)
  const onKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const to = e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length] : e.key === "ArrowLeft" ? TABS[(i + TABS.length - 1) % TABS.length] : e.key === "Home" ? TABS[0] : e.key === "End" ? TABS[TABS.length - 1] : null;
    if (!to) return;
    e.preventDefault();
    e.stopPropagation();
    setTab(to);
    refs.current[to]?.focus();
  };

  return (
    <ProjectPanel label={gr.title} className={g.panel}>
      <div className={g.grid}>
        <div className={g.left}>
          <div data-reveal className="flex flex-col items-start">
            <p className={a.kicker}>{gr.kicker}</p>
            <h2 className={`${a.display} ${g.title}`}>{gr.title}</h2>
          </div>
          <Desk />
        </div>

        <div className={g.right}>
          <div role="tablist" aria-label={gr.kicker} className={g.tabs} onKeyDown={onKey}>
            {TABS.map((id) => (
              <button
                key={id}
                ref={(el) => {
                  refs.current[id] = el;
                }}
                id={`growth-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`growth-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                className={g.tab}
                onClick={() => setTab(id)}
              >
                {gr.tabs[id]}
              </button>
            ))}
          </div>

          <section id="growth-panel-story" role="tabpanel" aria-labelledby="growth-tab-story" hidden={tab !== "story"} className={g.body}>
            <h3 className={`${a.display} ${g.heading}`}>{gr.storyTitle}</h3>
            <p className={g.lead}>{ab.intro}</p>
            <div className={g.cols}>
              <div>
                <h4 className={g.colTitle}>
                  <Mark d={BOOK} />
                  {gr.storyKicker}
                </h4>
                <p className={g.colText}>{gr.storyText}</p>
              </div>
              <div>
                <h4 className={g.colTitle}>
                  <Mark d={LEAF} />
                  {ab.whyTitle}
                </h4>
                <p className={g.colText}>{ab.why}</p>
              </div>
            </div>
          </section>

          <section id="growth-panel-skills" role="tabpanel" aria-labelledby="growth-tab-skills" hidden={tab !== "skills"} className={g.body}>
            <h3 className={`${a.display} ${g.heading}`}>{gr.skillsHeading}</h3>
            <p className={g.lead}>{gr.skillsLead}</p>
            <div className={g.cols}>
              <div>
                <h4 id="hard-skills" className={g.colTitle}>
                  <Mark d={BOOK} />
                  {ab.hardTitle}
                </h4>
                <dl className={g.hard} aria-labelledby="hard-skills">
                  {SKILLS.map((s) => (
                    <div key={s.id}>
                      <dt>{t.skills[s.id]}</dt>
                      <dd>{s.items.join(" · ")}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h4 id="soft-skills" className={g.colTitle}>
                  <Mark d={LEAF} />
                  {ab.softTitle}
                </h4>
                <ul className={g.soft} aria-labelledby="soft-skills">
                  {SOFT_SKILLS.map((id) => (
                    <li key={id}>
                      <strong>{t.softSkills[id].title}</strong>
                      <span>{t.softSkills[id].text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section id="growth-panel-learn" role="tabpanel" aria-labelledby="growth-tab-learn" hidden={tab !== "learn"} className={g.body}>
            <h3 className={`${a.display} ${g.heading}`}>{gr.learnHeading}</h3>
            <p className={g.lead}>{ab.learnLead}</p>
            <h4 className={`${g.colTitle} mt-8`}>
              <Mark d={LEAF} />
              {ab.learnTitle}
            </h4>
            <ol className={g.learn}>
              {LEARNING.map((id, i) => (
                <li key={id}>
                  <span className={g.no}>{String(i + 1).padStart(2, "0")}</span>
                  <strong>{t.learning[id].title}</strong>
                  <span>{t.learning[id].text}</span>
                </li>
              ))}
            </ol>
          </section>

          <NextButton label={gr.next} className={g.next} />
        </div>
      </div>
    </ProjectPanel>
  );
}
