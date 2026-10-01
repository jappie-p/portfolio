"use client";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { useT } from "@/i18n/useT";
import { PanelHeading } from "./PanelHeading";
import { SkillSky } from "./SkillSky";
import { Traits } from "./Traits";

/** Skills: the hard skills as constellations, the soft skills beside them as
 *  six traits (under them on a phone). */
export function SkillsPanel() {
  const t = useT();
  const a = t.about;
  return (
    <ProjectPanel label={a.skillsTitle}>
      <div className="grid w-full max-w-7xl gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <PanelHeading label={t.nav.about} title={a.skillsTitle} lead={a.skillsLead} />
          <SkillSky />
        </div>
        <div className="flex flex-col items-start lg:pt-2">
          <Traits />
          <NextButton label={a.learnTitle} />
        </div>
      </div>
    </ProjectPanel>
  );
}
