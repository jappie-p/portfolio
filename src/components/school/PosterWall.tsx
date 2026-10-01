"use client";
import type { CSSProperties } from "react";
import { PROJECT_NAMES, TOPICS } from "@/lib/chapters";
import { PROJECTS, SCHOOL_EXTRA, formatPeriod } from "@/data/projects";
import { jumpTo } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import { Poster } from "./Poster";
import { SCHOOL_WORLDS } from "./worlds";
import s from "./posters.module.css";

const SLUGS = TOPICS.find((x) => x.id === "school")!.projects;

// plaster tooth: fine warm noise, rasterised once by the browser
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.62 0 0 0 0 0.6 0 0 0 0 0.56 0 0 0 0.22 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

/** The gallery wall behind the School cover, for the panel's backdrop slot. */
export function GalleryWall() {
  return <div aria-hidden className={s.wall} style={{ "--grain": GRAIN } as CSSProperties} />;
}

/** The School cover's prints, one per project, each a slice of the world its
 *  panel shows. A print zooms into its project; sideways scrolling still
 *  walks the panels one by one. */
export function PosterWall() {
  const t = useT();
  return (
    <div className={s.row}>
      {SLUGS.map((slug, i) => {
        const p = PROJECTS[slug];
        const world = SCHOOL_WORLDS[slug];
        return (
          <Poster
            key={slug}
            image={world.image}
            focus={world.focus}
            label={`${PROJECT_NAMES[slug]}: ${t.work.open}`}
            onArrive={() => jumpTo("school", { panel: i + 1, instant: true })}
          >
            <span className="headline block text-[0.95rem] leading-tight text-ink sm:text-lg">{PROJECT_NAMES[slug]}</span>
            <span className="label mt-2 block text-[10px] text-ink-faint">
              {formatPeriod(p.period, t.work.until, t.work.now)} · {p.team ? t.work.team : t.work.solo}
            </span>
          </Poster>
        );
      })}
    </div>
  );
}

/** A note taped to the wall for the app that has no panel of its own. */
export function WallNote({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <aside className={`${s.note} ${className}`}>
      <span aria-hidden className={s.tape} />
      <p className="headline text-lg leading-tight">{t.school.extraTitle}</p>
      <p className="mt-2 text-sm leading-snug text-[#3a3e45]">{t.school.extraText}</p>
      <p className="label mt-3 text-[10px] text-[#585e67]">
        {SCHOOL_EXTRA.year} · {SCHOOL_EXTRA.team ? t.work.team : t.work.solo}
      </p>
    </aside>
  );
}
