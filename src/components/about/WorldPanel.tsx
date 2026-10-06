"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { BASE_PATH } from "@/data/site";
import { useInView, useNearOnce, useSceneMode } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import type { Kind, StoryId } from "./room/types";
import { numberOf } from "./room/stories";
import a from "./about.module.css";
import w from "./world.module.css";

const RoomCanvas = dynamic(() => import("./room/RoomCanvas").then((m) => m.RoomCanvas), { ssr: false });

const FILTERS: (Kind | "alles")[] = ["alles", "bouwen", "buiten", "groei"];

/**
 * My world: my room as a live diorama, every piece in it a story. The copy
 * stands at the left, the room fills the panel, the filter sits under it;
 * opening a piece moves the camera in and its story slides in beside it.
 */
export function WorldPanel() {
  const t = useT();
  const wd = t.about.world;
  const mode = useSceneMode();
  const host = useRef<HTMLDivElement>(null);
  // built a screen ahead either way, so stepping over from the hello panel
  // finds it ready
  const near = useNearOnce(host, "100% 100%");
  const inView = useInView(host);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Kind | "alles">("alles");
  const [selected, setSelected] = useState<StoryId | null>(null);
  // the story stays on the card while it slides out
  const [shown, setShown] = useState<StoryId | null>(null);
  const story = shown ? t.about.stories[shown] : null;

  const select = (id: StoryId | null) => {
    setSelected(id);
    if (id) setShown(id);
  };

  // Escape closes the story
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <ProjectPanel label={`${wd.title} ${wd.titleEm}`} className={w.panel}>
      <div ref={host} className={w.room} data-room-ready={ready || undefined}>
        {near && mode !== "off" && (
          <RoomCanvas
            active={inView}
            still={mode === "still"}
            filter={filter}
            selected={selected}
            onSelect={select}
            labels={wd.pins}
            onReady={() => setReady(true)}
          />
        )}
      </div>

      <div className={w.copy} data-away={selected ? "" : undefined}>
        <div data-reveal className="flex flex-col items-start">
          <p className={a.kicker}>{wd.kicker}</p>
          <h2 className={`${a.display} ${w.title}`}>
            {wd.title} <span className={a.em}>{wd.titleEm}</span>
          </h2>
          <p className={w.lead}>{wd.lead}</p>
          <svg aria-hidden className={w.arrow} viewBox="0 0 64 40" fill="none">
            <path d="M4 4c2 16 14 28 46 28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M42 24l9 8-10 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <NextButton label={wd.next} className={w.next} />
      </div>

      <div className={w.filters} role="group" aria-label={wd.kicker} data-away={selected ? "" : undefined}>
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} className={w.filter} onClick={() => setFilter(f)}>
            {wd.filters[f]}
          </button>
        ))}
      </div>

      <aside className={w.story} data-open={selected ? "" : undefined} aria-hidden={!selected} inert={!selected}>
        {story && shown && (
          <>
            <div className={w.storyHead}>
              <span className={w.storyNo}>{String(numberOf(shown)).padStart(2, "0")}</span>
              <p className={a.kicker}>{story.kicker}</p>
            </div>
            <h3 className={`${a.display} ${w.storyTitle}`}>{story.title}</h3>
            <p className={w.storyText}>{story.text}</p>
            {story.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- a path Jasper drops in /public, any size
              <img className={w.photo} src={`${BASE_PATH}${story.photo}`} alt="" />
            ) : (
              <div className={w.photo} aria-hidden>
                <span>{wd.photoSoon}</span>
              </div>
            )}
            <button type="button" className={w.close} onClick={() => setSelected(null)}>
              <span aria-hidden>←</span> {wd.close}
            </button>
          </>
        )}
      </aside>
    </ProjectPanel>
  );
}
