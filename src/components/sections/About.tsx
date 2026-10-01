"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { Backdrop } from "@/components/journey/Backdrop";
import { TopicRow, ProjectTrack } from "@/components/journey/panels";
import { BioPanel } from "@/components/about/BioPanel";
import { SkillsPanel } from "@/components/about/SkillsPanel";
import { LearnPanel } from "@/components/about/LearnPanel";
import { MorePanel } from "@/components/about/MorePanel";
import { useT } from "@/i18n/useT";
import styles from "@/components/about/row.module.css";

// the sky loads once the row comes near (see Backdrop)
const AboutSky = dynamic(() => import("@/components/about/sky/AboutSky").then((m) => m.AboutSky), { ssr: false });

/** About me, sideways across one night sky: who I am and why, my skills as
 *  constellations, what I want to learn as stars not lit yet, and the
 *  smaller work. The sky sits behind the whole row and pans with the track. */
export function About() {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  return (
    <TopicRow id="about" label={t.about.title} className={styles.row}>
      <Backdrop>{(st) => <AboutSky {...st} track={track} />}</Backdrop>
      <ProjectTrack label={t.about.title} ref={track}>
        <BioPanel />
        <SkillsPanel />
        <LearnPanel />
        <MorePanel />
      </ProjectTrack>
    </TopicRow>
  );
}
