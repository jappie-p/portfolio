"use client";
import type { PointerEvent, Ref } from "react";
import type { StaticImageData } from "next/image";
import { PROJECT_NAMES, type ProjectSlug } from "@/lib/chapters";
import { PROJECTS, SCHOOL_EXTRA, formatPeriod } from "@/data/projects";
import { useT } from "@/i18n/useT";
import { keep, type OverlayDom } from "./place";
import { focusOn, type Rig } from "./rig";
import s from "./gallery.module.css";

export type OverlayWork = { slug: ProjectSlug | "berlijn"; image?: StaticImageData; position?: string };

type Props = {
  rig: Rig;
  works: OverlayWork[];
  narrow: boolean;
  dom: OverlayDom;
  surface: Ref<HTMLDivElement>;
  onOpen: (i: number) => void;
};

/**
 * The gallery's HTML: one real button on each frame (what the mouse, the
 * keyboard and screen readers use), the picture's window inside it for the
 * zoom, and a museum label on the wall beside it. The scene places them all
 * every frame; this only lays them out.
 */
export function Overlay({ rig, works, narrow, dom, surface, onOpen }: Props) {
  const t = useT();

  const lean = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    rig.hover = i;
    rig.lean.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    rig.lean.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  const leave = (i: number) => () => {
    if (rig.hover === i) rig.hover = -1;
  };

  return (
    <div ref={surface} className={s.overlay} data-narrow={narrow || undefined}>
      {works.map((w, i) => {
        const extra = w.slug === "berlijn";
        const name = extra ? t.school.extraTitle : PROJECT_NAMES[w.slug as ProjectSlug];
        const p = extra ? null : PROJECTS[w.slug as ProjectSlug];
        const when = p ? formatPeriod(p.period, t.work.until, t.work.now) : String(SCHOOL_EXTRA.year);
        const team = (p ? p.team : SCHOOL_EXTRA.team) ? t.work.team : t.work.solo;
        return (
          <div key={w.slug}>
            <button
              ref={keep(dom.works, i)}
              type="button"
              className={s.work}
              style={{ display: "none" }}
              aria-label={`${name}: ${t.work.open}`}
              onClick={() => onOpen(i)}
              onPointerEnter={lean(i)}
              onPointerMove={lean(i)}
              onPointerLeave={leave(i)}
              onFocus={() => focusOn(rig, i)}
              onBlur={() => rig.focus === i && focusOn(rig, -1)}
            >
              <span ref={keep(dom.pics, i)} className={s.pic}>
                {/* eslint-disable-next-line @next/next/no-img-element -- the zoom grows this exact file, the one the scene shows */}
                {w.image && <img src={w.image.src} alt="" width={w.image.width} height={w.image.height} loading="lazy" decoding="async" style={{ objectPosition: w.position }} />}
              </span>
            </button>
            <p ref={keep(dom.labels, i)} className={s.label}>
              <span className={s.card}>
                <span className="label block text-[10px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className={s.rule} aria-hidden />
                <span className="headline block text-[15px] leading-tight text-ink">{name}</span>
                {extra && <span className="mt-2 block text-[13px] leading-snug text-ink-dim">{t.school.extraText}</span>}
                <span className="label mt-2 block text-[10px] text-ink-dim">
                  {when} · {team}
                </span>
                {!extra && (
                  <span aria-hidden className={`${s.cue} label text-[10px]`}>
                    {t.work.open} <span>→</span>
                  </span>
                )}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
