"use client";
import { useT } from "@/i18n/useT";
import { keep, type OverlayDom } from "./place";
import { goTo, last, type Rig } from "./rig";
import s from "./gallery.module.css";

/**
 * Along the foot of the gallery: which room you are in, how far down the
 * wall you have walked (the scene sets --walk every frame), and buttons to
 * walk on or back, for a mouse without a sideways wheel.
 */
export function RoomBar({ rig, dom }: { rig: Rig; dom: OverlayDom }) {
  const t = useT();
  const m = t.school.museum;
  const walk = (dir: 1 | -1) => {
    if (rig.glide.on || rig.dolly.hold) return;
    goTo(rig, Math.min(Math.max(Math.round(rig.target) + dir, 0), last(rig)));
  };
  return (
    <div ref={keep(dom, "bar")} className={s.bar}>
      <p className={s.roomName}>
        <span>{m.room}</span>
        <span aria-hidden className={s.slash}>
          /
        </span>
        <span>{t.nav.school}</span>
      </p>
      <span aria-hidden className={s.walked} />
      <div className={s.explore}>
        <button type="button" className={s.step} onClick={() => walk(-1)} aria-label={m.prev}>
          <span aria-hidden>←</span>
        </button>
        <span className={s.exploreText}>{m.explore}</span>
        <button type="button" className={s.step} onClick={() => walk(1)} aria-label={m.next}>
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
