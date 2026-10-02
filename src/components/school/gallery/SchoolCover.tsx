"use client";
import { useState } from "react";
import { ProjectPanel } from "@/components/journey/panels";
import { useSceneMode } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import { GalleryWall } from "../PosterWall";
import { PrintWall } from "./CoverCopy";
import { LiveGallery } from "./LiveGallery";

/** School's first panel: the live gallery where the GPU and motion allow,
 *  the poster wall otherwise (no hardware WebGL, reduced motion, a lost
 *  context). The panel stays one element through the switch, so the
 *  observers that watch it keep watching it. */
export function SchoolCover() {
  const t = useT();
  const mode = useSceneMode();
  const [lost, setLost] = useState(false);
  const live = mode === "live" && !lost;
  return (
    <ProjectPanel label={t.school.title} backdrop={live ? undefined : <GalleryWall />} className={live ? "[@media(max-aspect-ratio:9/10)]:justify-start" : ""}>
      {live ? <LiveGallery onLost={() => setLost(true)} /> : <PrintWall />}
    </ProjectPanel>
  );
}
