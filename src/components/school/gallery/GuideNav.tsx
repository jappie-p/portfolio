"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { focusPosition } from "@/components/journey/zoom";
import { PROJECT_NAMES, TOPIC_INDEX } from "@/lib/chapters";
import { prefersReducedMotion } from "@/lib/motion";
import { useJourney } from "@/lib/store";
import { useT } from "@/i18n/useT";
import { SCHOOL_WORLDS } from "../worlds";
import { guide, useGuide } from "./guide";
import { ORDER, type WorkId } from "./layout";
import s from "./guide.module.css";

/** The panel nudges toward the next one once per visit, with the first hint. */
let nudged = false;

function Thumb({ id }: { id: WorkId }) {
  if (id === "berlijn") return <span aria-hidden className={`${s.thumb} ${s.card}`} />;
  const w = SCHOOL_WORLDS[id];
  return (
    <span aria-hidden className={s.thumb}>
      <Image src={w.image} alt="" sizes="64px" style={{ objectPosition: focusPosition(w.focus, 1, 1.6) }} />
    </span>
  );
}

/**
 * Inside a School project, the way on: the next print peeking in at the
 * right edge (the one before at the left), back out into the gallery, and
 * the first time a hint that you can swipe. Only while the gallery guides
 * the row; the swipes and keys themselves are the gallery's (see swipe.ts).
 */
export function GuideNav() {
  const t = useT();
  const g = t.school.guide;
  const live = useGuide((st) => st.live);
  const swiped = useGuide((st) => st.swiped);
  const topic = useJourney((st) => st.topic);
  const project = useJourney((st) => st.project);
  const ref = useRef<HTMLDivElement>(null);
  const at = live && topic === TOPIC_INDEX.school ? project - 1 : -1;
  const hint = at >= 0 && !swiped;

  // with the first hint, the panel leans toward the next one and back
  useEffect(() => {
    if (!hint || nudged || prefersReducedMotion()) return;
    const panel = ref.current?.closest("[data-section]")?.querySelectorAll<HTMLElement>(".project-panel")[at + 1];
    if (!panel) return;
    nudged = true;
    const a = panel.animate([{ translate: "0 0" }, { translate: "-26px 0", offset: 0.4 }, { translate: "0 0" }], { duration: 1100, delay: 1500, easing: "cubic-bezier(0.45, 0, 0.2, 1)" });
    return () => a.cancel();
  }, [hint, at]);

  if (at < 0) return <div ref={ref} hidden />;
  const next = ORDER[at + 1];
  const prev = at > 0 ? ORDER[at - 1] : null;
  const name = (id: WorkId) => (id === "berlijn" ? t.school.extraTitle : PROJECT_NAMES[id]);

  return (
    <div ref={ref} className={s.nav}>
      {prev && (
        <button type="button" className={`${s.peek} ${s.prev}`} onClick={() => guide.step(-1)} aria-label={`${g.prev}: ${name(prev)}`}>
          <span className={s.words}>
            <span className={s.kicker}>{g.prev}</span>
            <span className={s.name}>{name(prev)}</span>
          </span>
          <Thumb id={prev} />
          <span aria-hidden className={s.chev}>
            ←
          </span>
        </button>
      )}
      {next && (
        <button type="button" className={`${s.peek} ${s.next}`} onClick={() => guide.step(1)} aria-label={`${g.next}: ${name(next)}`}>
          <span aria-hidden className={s.chev}>
            →
          </span>
          <Thumb id={next} />
          <span className={s.words}>
            <span className={s.kicker}>{g.next}</span>
            <span className={s.name}>{name(next)}</span>
          </span>
        </button>
      )}
      <div className={s.foot}>
        <button type="button" className={`btn btn-ghost ${s.out}`} onClick={() => guide.out()} aria-label={g.back}>
          <svg aria-hidden viewBox="0 0 20 20" className={s.icon}>
            <rect x="2.5" y="4.5" width="6" height="7" rx="0.8" />
            <rect x="11.5" y="4.5" width="6" height="7" rx="0.8" />
            <path d="M2 15.5h16" />
          </svg>
          {g.gallery}
        </button>
        <span className={s.count} aria-hidden>
          {String(at + 1).padStart(2, "0")} / {String(ORDER.length - 1).padStart(2, "0")}
        </span>
      </div>
      {hint && (
        <p className={s.hint} role="status">
          <span aria-hidden className={s.touch}>
            <span className={s.dot} />
          </span>
          <span aria-hidden className={s.keys}>
            <kbd>←</kbd>
            <kbd>→</kbd>
          </span>
          <span className={s.swipe}>{g.swipe}</span>
          <span className={s.trackpad}>{g.keys}</span>
        </p>
      )}
    </div>
  );
}
