"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { LEARNING } from "@/data/skills";
import { useT } from "@/i18n/useT";
import { smoothPath, type Pt } from "./trail";
import { useIgnite } from "./useIgnite";
import styles from "./learn.module.css";

/** How low each goal hangs on a wide screen: the path climbs from the first
 *  to the last, so it always runs above and left of the copy, never through it. */
const LIFT = ["8.5rem", "5.75rem", "2.75rem", "0rem"];

/**
 * What I want to learn, as the next constellation to draw: from a lit star
 * (where I am now) a dotted path runs through four stars not lit yet, in the
 * order I want to get to them. It climbs across the panel on a wide screen
 * and runs down the side on a phone. The path is measured from the stars
 * themselves, so it follows the copy however it wraps.
 */
export function LearnPath() {
  const t = useT();
  const field = useRef<HTMLDivElement>(null);
  // plain characters only: the id goes into url(#...)
  const mask = `trail${useId().replace(/[^\w-]/g, "")}`;
  const [trail, setTrail] = useState<{ d: string; w: number; h: number } | null>(null);
  useIgnite(field, 0.35);

  // measured on resize, once the fonts settle, and when the copy changes language
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      if (!box.width) return;
      const pts = Array.from(el.querySelectorAll<HTMLElement>("[data-node]"), (n): Pt => {
        const r = n.getBoundingClientRect();
        return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
      });
      const d = smoothPath(pts);
      const w = Math.round(box.width);
      const h = Math.round(box.height);
      setTrail((cur) => (cur && cur.d === d && cur.w === w && cur.h === h ? cur : { d, w, h }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [t]);

  return (
    <div ref={field} className="relative mt-12 lg:mt-10">
      {trail && (
        <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width={trail.w} height={trail.h}>
          <defs>
            <mask id={mask} maskUnits="userSpaceOnUse" x={-40} y={-40} width={trail.w + 80} height={trail.h + 80}>
              <path d={trail.d} pathLength={1} className={styles.trailMask} />
            </mask>
          </defs>
          <path d={trail.d} className={styles.trail} mask={`url(#${mask})`} />
        </svg>
      )}
      <span aria-hidden data-node className={`${styles.now} left-[0.7rem] top-2.5 lg:left-3 lg:top-[12.5rem]`} style={{ "--d": "0.05s" } as CSSProperties} />
      <ol className="relative grid gap-10 pt-16 lg:grid-cols-4 lg:gap-9 lg:pl-20 lg:pt-0">
        {LEARNING.map((id, i) => (
          <li key={id} className="relative pl-10 lg:pl-0 lg:pt-[var(--lift)]" style={{ "--lift": LIFT[i] } as CSSProperties}>
            <span aria-hidden data-node className={styles.unlit} style={{ "--d": `${0.55 + i * 0.48}s` } as CSSProperties}>
              <svg viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="9.25" />
              </svg>
            </span>
            <h3 className="headline text-[1.375rem] text-ink">{t.learning[id].title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">{t.learning[id].text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
