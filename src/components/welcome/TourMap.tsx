"use client";
import type { CSSProperties, Ref } from "react";
import { PROJECT_NAMES, TOPICS, topicPanelCount, type TopicId } from "@/lib/chapters";
import s from "./tour.module.css";

export type Cell = { row: number; col: number };

/** The site as the map shows it: one row per topic, a tile per panel. */
const ROWS = TOPICS.map((tp) => ({ id: tp.id as TopicId, count: topicPanelCount(tp.id) }));

/** The works in the School gallery, as the map's little prints. */
const WORKS = TOPICS.find((tp) => tp.id === "school")!.projects;

/** Each topic's light, as its own world is coloured. */
const TINT: Record<TopicId, string> = {
  hero: "#4ade80",
  about: "#a78bfa",
  websites: "#2dd4bf",
  ai: "#f59e0b",
  cyber: "#22d3ee",
  school: "#f472b6",
  contact: "#4ade80",
};

type Props = {
  /** where you are: the frame sits on this tile */
  at: Cell;
  /** the move this step asks for, shown by a ghost of the frame making it, again and again */
  demo: { from: Cell; to: Cell } | null;
  labels: Record<TopicId, string>;
  you: string;
  /** the gallery tile's prints can be picked (the third step) */
  pick: ((i: number) => void) | null;
  /** the print picked, growing to fill its tile */
  picked: number;
  /** rows lit up, from the top, when it is all done */
  lit: number;
  /** the first tile, which the way in grows out of */
  heroRef: Ref<HTMLSpanElement>;
};

/**
 * The how-to's map of the site, like a level map: topics one under the
 * other, each topic's projects side by side, and a frame for where you are
 * that moves as you learn the moves.
 */
export function TourMap({ at, demo, labels, you, pick, picked, lit, heroRef }: Props) {
  return (
    <div className={s.board} style={{ "--row": at.row, "--col": at.col } as CSSProperties}>
      {ROWS.map((r, i) => (
        <div key={r.id} className={s.row} data-lit={lit > i || undefined} style={{ "--i": i } as CSSProperties}>
          <span className={s.label}>{labels[r.id]}</span>
          {Array.from({ length: r.count }, (_, c) => (
            <span
              key={c}
              ref={i === 0 && c === 0 ? heroRef : undefined}
              className={`${s.tile} ${c === 0 ? s.cover : ""}`}
              data-topic={r.id}
              data-here={(at.row === i && at.col === c) || undefined}
              style={{ "--tint": TINT[r.id] } as CSSProperties}
            >
              {r.id === "school" && c === 0 && (
                <span className={s.prints}>
                  {WORKS.map((slug, p) =>
                    pick ? (
                      <button key={slug} type="button" className={s.print} data-picked={picked === p || undefined} onClick={() => pick(p)} aria-label={PROJECT_NAMES[slug]} />
                    ) : (
                      <span key={slug} className={s.print} data-picked={picked === p || undefined} />
                    ),
                  )}
                </span>
              )}
            </span>
          ))}
        </div>
      ))}
      {demo && (
        <span
          aria-hidden
          key={`${demo.from.row}${demo.from.col}`}
          className={s.ghost}
          style={{ "--r0": demo.from.row, "--c0": demo.from.col, "--r1": demo.to.row, "--c1": demo.to.col } as CSSProperties}
        />
      )}
      <span aria-hidden className={s.frame}>
        <span className={s.you}>{you}</span>
      </span>
    </div>
  );
}
