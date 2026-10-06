"use client";
import { TopicRow, ProjectTrack } from "@/components/journey/panels";
import { ClosingPanel } from "@/components/about/ClosingPanel";
import { GrowthPanel } from "@/components/about/GrowthPanel";
import { HeroPanel } from "@/components/about/HeroPanel";
import { WorldPanel } from "@/components/about/WorldPanel";
import { useT } from "@/i18n/useT";
import styles from "@/components/about/about.module.css";

/** About me as a warm, light world of its own, sideways: who I am beside my
 *  photo, my room as a live diorama where every object tells a story, how I
 *  grew (story, skills, what I want to learn), and the invitation to build
 *  something together. */
export function About() {
  const t = useT();
  return (
    <TopicRow id="about" label={t.about.title} className={styles.row}>
      <ProjectTrack label={t.about.title}>
        <HeroPanel />
        <WorldPanel />
        <GrowthPanel />
        <ClosingPanel />
      </ProjectTrack>
    </TopicRow>
  );
}
