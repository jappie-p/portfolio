"use client";
import Image, { getImageProps } from "next/image";
import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { focusPosition, zoomInto } from "@/components/journey/zoom";
import { jumpTo } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import { DOORS, DOOR_ASPECT, type Door } from "./doors";
import s from "./doors.module.css";

const SIZES = "(min-width: 1024px) 420px, 150px";

/** The hero's row of doors, one into every part of the site in the order the
 *  page walks them. Each frames that world and spills its light on the floor;
 *  the row leans with the pointer, and a door zooms you through to its world. */
export function HeroDoors() {
  const t = useT();
  const row = useRef<HTMLUListElement>(null);

  // lean with the mouse anywhere over the hero, not only over the doors
  useEffect(() => {
    const ul = row.current;
    const hero = ul?.closest("[data-section]");
    if (!ul || !hero || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      ul.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
      ul.style.setProperty("--py", (e.clientY / innerHeight - 0.5).toFixed(3));
    };
    const onLeave = () => {
      ul.style.setProperty("--px", "0");
      ul.style.setProperty("--py", "0");
    };
    hero.addEventListener("pointermove", onMove as EventListener, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const open = (door: Door, position: string) => (e: MouseEvent<HTMLButtonElement>) => {
    const arch = e.currentTarget.firstElementChild as HTMLElement;
    const { props } = getImageProps({ src: door.image, alt: "", sizes: "100vw" });
    zoomInto(arch, () => jumpTo(door.id, { panel: door.panel, instant: true }), { srcSet: props.srcSet, position });
  };

  return (
    <nav aria-label={t.hero.doors} className={s.doors}>
      <ul ref={row} className={s.row}>
        {DOORS.map((door, i) => {
          const position = focusPosition(door.focus, DOOR_ASPECT, door.image.width / door.image.height);
          const style = { "--i": i, "--t": ((i - (DOORS.length - 1) / 2) / ((DOORS.length - 1) / 2)).toFixed(3), "--hue": door.hue } as CSSProperties;
          return (
            <li key={door.id} className={s.slot} style={style}>
              <span className={s.rise}>
                <button type="button" className={s.door} aria-label={`${t.hero.enter} ${t.nav[door.id]}`} onClick={open(door, position)}>
                  <span className={s.arch}>
                    <Image src={door.image} alt="" fill sizes={SIZES} placeholder="blur" className={s.world} style={{ objectPosition: position }} />
                  </span>
                </button>
              </span>
              <span aria-hidden className={s.reflection}>
                <Image src={door.image} alt="" fill sizes={SIZES} className={s.world} style={{ objectPosition: position }} />
              </span>
              <span aria-hidden className={s.pool} />
              <span aria-hidden className={s.label}>
                <span className={s.num}>{String(i + 1).padStart(2, "0")}</span>
                {t.nav[door.id]}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
