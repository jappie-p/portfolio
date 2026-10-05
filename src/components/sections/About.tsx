"use client";
import { TopicRow, ProjectTrack } from "@/components/journey/panels";
import { PlayerPanel } from "@/components/about/PlayerPanel";
import { SkillTreePanel } from "@/components/about/SkillTreePanel";
import { QuestPanel } from "@/components/about/QuestPanel";
import { SideQuestPanel } from "@/components/about/SideQuestPanel";
import { useT } from "@/i18n/useT";
import styles from "@/components/about/about.module.css";

/** About me as a character screen, sideways: the player card, the skill
 *  tree with the soft skills as perks, what I want to learn as a quest log,
 *  and the smaller builds as side quests. All of it stands on the hero's
 *  hex floor, seen from above. */
export function About() {
  const t = useT();
  return (
    <TopicRow id="about" label={t.about.title} className={styles.row}>
      <ProjectTrack label={t.about.title}>
        <PlayerPanel />
        <SkillTreePanel />
        <QuestPanel />
        <SideQuestPanel />
      </ProjectTrack>
    </TopicRow>
  );
}
