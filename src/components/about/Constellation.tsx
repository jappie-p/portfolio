"use client";
import { useId, useRef, type CSSProperties } from "react";
import type { SkillGroupId } from "@/data/skills";
import { BOX_H, BOX_W, SHAPES, type Spot } from "./constellations";
import { starLight, starRadius, type SkillStar } from "./skill-stars";
import { useIgnite } from "./useIgnite";
import styles from "./constellation.module.css";

/** Under a star: how many projects use it, and which (or why none is listed). */
export type StarText = { count?: string; names: string };

export type StarEvents = {
  enter: (name: string) => void;
  leave: (name: string) => void;
  focus: (name: string) => void;
  blur: (name: string) => void;
  press: (name: string) => void;
};

/** Stars with this many projects or more get a faint cross. */
const BRIGHT = 4;

/** Where a star's caption goes: away from the box's edges, and above it when
 *  the star sits low. */
const captionAt = (s: Spot) => ({
  x: s.x < 36 ? "start" : s.x > 64 ? "end" : "mid",
  y: s.y > BOX_H * 0.56 ? "above" : "below",
});

/** A line between two stars, stopped short of both so it never touches them. */
function segment(a: Spot, ra: number, b: Spot, rb: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ga = 2.6 + ra * 0.5;
  const gb = 2.6 + rb * 0.5;
  const f = (n: number) => n.toFixed(2);
  return `M${f(a.x + (dx / len) * ga)} ${f(a.y + (dy / len) * ga)}L${f(b.x - (dx / len) * gb)} ${f(b.y - (dy / len) * gb)}`;
}

/**
 * One skill group as a constellation: its stars (sized by how many projects
 * use each skill) joined by lines, every star a button with its name beside
 * it. Pointing at or focusing a star lights its constellation and shows which
 * projects use it; the same text is the button's description for screen
 * readers. Draws itself in the first time it comes on screen.
 */
export function Constellation({
  title,
  stars,
  group,
  order,
  active,
  state,
  text,
  on,
  className = "",
}: {
  title: string;
  stars: SkillStar[];
  group: SkillGroupId;
  /** its place in the sky, for the stagger */
  order: number;
  active: string | null;
  state?: "lit" | "dim";
  text: (s: SkillStar) => StarText;
  on: StarEvents;
  className?: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const id = useId();
  useIgnite(ref);
  const shape = SHAPES[group];
  const radius = Object.fromEntries(stars.map((s) => [s.name, starRadius(s.uses.length)]));
  const base = order * 0.12;

  return (
    <li ref={ref} className={`${styles.constellation} ${className}`} data-state={state}>
      <h4 className={`label ${styles.groupName}`}>{title}</h4>
      <svg aria-hidden viewBox={`0 0 ${BOX_W} ${BOX_H}`} className={styles.lines}>
        {shape.lines.map(([a, b], i) => (
          <path
            key={`${a}-${b}`}
            d={segment(shape.stars[a], radius[a], shape.stars[b], radius[b])}
            pathLength={1}
            className={styles.line}
            style={{ "--d": `${base + i * 0.14}s` } as CSSProperties}
          />
        ))}
      </svg>
      <ul>
        {stars.map((s, i) => {
          const spot = shape.stars[s.name];
          const current = active === s.name;
          const words = text(s);
          const at = captionAt(spot);
          return (
            <li
              key={s.name}
              className={styles.star}
              data-active={current || undefined}
              style={{ left: `${spot.x}%`, top: `${(spot.y / BOX_H) * 100}%`, "--d": `${base + 0.25 + i * 0.11}s` } as CSSProperties}
            >
              <button
                type="button"
                data-star
                data-side={spot.side}
                aria-describedby={`${id}-${i}`}
                className={styles.button}
                onPointerEnter={() => on.enter(s.name)}
                onPointerLeave={() => on.leave(s.name)}
                onFocus={() => on.focus(s.name)}
                onBlur={() => on.blur(s.name)}
                onClick={() => on.press(s.name)}
              >
                <span
                  aria-hidden
                  className={styles.dot}
                  style={{ "--r": `${radius[s.name].toFixed(2)}px`, "--k": starLight(s.uses.length).toFixed(2) } as CSSProperties}
                >
                  {s.uses.length >= BRIGHT && <span className={styles.spikes} />}
                </span>
                <span className={styles.name}>{s.name}</span>
              </button>
              <span id={`${id}-${i}`} className="sr-only">
                {words.count ? `${words.count}: ${words.names}` : words.names}
              </span>
              {current && (
                <span aria-hidden className={styles.caption} data-x={at.x} data-y={at.y} data-side={spot.side}>
                  {words.count && <span className={styles.count}>{words.count}</span>}
                  {words.names}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
