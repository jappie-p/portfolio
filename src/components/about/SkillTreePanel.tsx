"use client";
import { useState, type CSSProperties } from "react";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { SOFT_SKILLS, type SoftSkillId } from "@/data/skills";
import { PROJECT_NAMES } from "@/lib/chapters";
import { useT } from "@/i18n/useT";
import { MAX_LEVEL, SKILL_TREE, type SkillNode } from "./levels";
import { PanelHeading } from "./PanelHeading";
import a from "./about.module.css";
import s from "./tree.module.css";

/** One line icon per perk, on a 20 by 20 grid. */
const PERK_ICON: Record<SoftSkillId, string> = {
  independent: "M3 16.5 8 8l3 4.2 2-3 4 7.3Z M8 8V3l3.2 1.6L8 6.2",
  curious: "M10 3a4.6 4.6 0 0 1 2.6 8.4v2.1H7.4v-2.1A4.6 4.6 0 0 1 10 3Z M7.8 16.2h4.4 M8.4 18.2h3.2",
  solver: "M13.6 3.4a3.6 3.6 0 0 0-3.4 4.7l-6.6 6.7a1.5 1.5 0 0 0 2.1 2.1l6.7-6.6a3.6 3.6 0 0 0 4.7-3.4l-2 2-2.2-.6-.6-2.2Z",
  client: "M10 16.6 4.3 11a3.3 3.3 0 0 1 4.7-4.7l1 1 1-1a3.3 3.3 0 0 1 4.7 4.7Z",
  calm: "M10 17.2a4.6 4.6 0 0 1-4.6-4.6c0-2.7 2.3-3.9 2.3-6.7 1.6 1 2.4 2.5 2.4 3.7.9-.7 1.3-1.7 1.3-2.9 1.9 1.4 3.2 3.5 3.2 5.9a4.6 4.6 0 0 1-4.6 4.6Z",
  team: "M7.2 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M2.7 16.4a4.5 4.5 0 0 1 9 0 M13.6 9.6a2 2 0 1 0 0-4 M12.8 12.1a4 4 0 0 1 4.7 4.3",
};

function Node({ node, open, onPick }: { node: SkillNode; open: boolean; onPick: () => void }) {
  const t = useT();
  const tree = t.about.tree;
  const where = node.uses.map((u) => (u.kind === "project" ? PROJECT_NAMES[u.slug] : t.archive[u.id].title));
  return (
    <li className={s.node}>
      <button type="button" className={s.pick} aria-expanded={open} onClick={onPick}>
        <span aria-hidden className={s.hex} style={{ "--lit": node.level / MAX_LEVEL } as CSSProperties} />
        <span className={s.skill}>{node.name}</span>
        <span className={s.pips} role="img" aria-label={`${tree.level} ${node.level} / ${MAX_LEVEL}`}>
          {Array.from({ length: MAX_LEVEL }, (_, i) => (
            <span key={i} className={s.pip} data-on={i < node.level || undefined} />
          ))}
        </span>
      </button>
      {open && (
        <p className={s.used}>
          {where.length ? (
            <>
              <strong>{tree.usedIn}</strong> {where.join(", ")}
            </>
          ) : (
            tree.none
          )}
        </p>
      )}
    </li>
  );
}

/**
 * Skills as a skill tree: every hard skill a node in its branch, its level
 * the number of projects on this site built with it (counted, not typed in;
 * pick one to see which), and the soft skills beside it as perks, each with
 * the proof of it.
 */
export function SkillTreePanel() {
  const t = useT();
  const ab = t.about;
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ProjectPanel label={ab.skillsTitle}>
      <div className="w-full max-w-[78rem]">
        <PanelHeading label={ab.tree.kicker} title={ab.skillsTitle} lead={ab.skillsLead} />
        <div className={`${s.wrap} mt-5`}>
          <section data-reveal aria-labelledby="hard-skills">
            <h3 id="hard-skills" className={s.h3}>
              {ab.hardTitle}
            </h3>
            <p className={s.legend}>{ab.tree.legend}</p>
            <div className={s.branches}>
              {SKILL_TREE.map((b) => (
                <div key={b.id}>
                  <p className={s.branchName}>{t.skills[b.id]}</p>
                  <ul className={s.nodes}>
                    {b.nodes.map((n) => (
                      <Node key={n.name} node={n} open={open === n.name} onPick={() => setOpen(open === n.name ? null : n.name)} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section data-reveal aria-labelledby="soft-skills">
            <p className={a.kicker}>{ab.perksKicker}</p>
            <h3 id="soft-skills" className={`${s.h3} mt-2`}>
              {ab.softTitle}
            </h3>
            <ul className={s.perks}>
              {SOFT_SKILLS.map((id) => (
                <li key={id} className={s.perk}>
                  <span aria-hidden className={s.badge}>
                    <svg viewBox="0 0 20 20">
                      <path d={PERK_ICON[id]} />
                    </svg>
                  </span>
                  <p className={s.perkName}>{t.softSkills[id].title}</p>
                  <p className={s.perkText}>{t.softSkills[id].text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        {/* outside the rise-in, so it is ready to press the moment the panel is */}
        <NextButton label={ab.learnTitle} />
      </div>
    </ProjectPanel>
  );
}
