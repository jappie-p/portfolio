"use client";
import Image, { getImageProps, type StaticImageData } from "next/image";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { focusPosition, zoomInto } from "@/components/journey/zoom";
import s from "./posters.module.css";

const ASPECT = 3 / 4;
const MAX_TILT = 6;

/** One framed print on the School wall: a slice of the project's world under
 *  its own spotlight. It leans toward the pointer, and a click zooms into it
 *  and lands on the project's panel. */
export function Poster({ image, focus, label, onArrive, children }: { image: StaticImageData; focus: number; label: string; onArrive: () => void; children: ReactNode }) {
  const frame = useRef<HTMLButtonElement>(null);
  const picture = useRef<HTMLSpanElement>(null);
  const position = focusPosition(focus, ASPECT, image.width / image.height);

  const lean = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const st = e.currentTarget.style;
    st.setProperty("--ry", `${x * MAX_TILT * 2}deg`);
    st.setProperty("--rx", `${-y * MAX_TILT * 2}deg`);
    st.setProperty("--gx", `${(x + 0.5) * 100}%`);
    st.setProperty("--gy", `${(y + 0.5) * 100}%`);
    st.setProperty("--glare", "1");
  };
  const settle = () => {
    const st = frame.current?.style;
    if (!st) return;
    st.setProperty("--ry", "0deg");
    st.setProperty("--rx", "0deg");
    st.setProperty("--glare", "0.35");
  };
  const open = () => {
    if (!picture.current) return;
    const { props } = getImageProps({ src: image, alt: "", sizes: "100vw" });
    zoomInto(picture.current, onArrive, { srcSet: props.srcSet, position });
  };

  return (
    <figure className={s.poster}>
      <span aria-hidden className={s.pool} />
      <span aria-hidden className={s.cone} />
      <span aria-hidden className={s.dust} />
      <button ref={frame} type="button" aria-label={label} onClick={open} onPointerMove={lean} onPointerLeave={settle} className={s.frame}>
        <span className={s.mat}>
          <span ref={picture} className={s.picture}>
            <Image src={image} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 520px, 240px" className={s.image} style={{ objectPosition: position }} />
          </span>
        </span>
      </button>
      <figcaption className={s.caption}>{children}</figcaption>
    </figure>
  );
}
