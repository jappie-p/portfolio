import Image from "next/image";
import type { CSSProperties } from "react";
import portrait from "@/assets/about/jasper.webp";
import matte from "./portrait-matte.webp";
import styles from "./portrait.module.css";

const lift = `url(${matte.src})`;

/** The portrait, large, standing in the night sky. A matte of the same photo
 *  (made on-device with Apple Vision's foreground mask, so redo it when the
 *  photo changes) lifts the wall away; the figure is graded cool, as if lit by
 *  starlight, with a faint rim of light round the hair and shoulders, and the
 *  bottom of the frame dissolves into the sky. */
export function Portrait({ alt }: { alt: string }) {
  return (
    <div className={styles.portrait}>
      <div className={styles.cutout} style={{ maskImage: lift, WebkitMaskImage: lift } as CSSProperties}>
        <Image
          src={portrait}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 480px, (min-width: 640px) 400px, 88vw"
          placeholder="blur"
          className={`${styles.photo} object-cover object-[50%_28%]`}
        />
        <div aria-hidden className={styles.tone} />
        <div aria-hidden className={styles.starlight} />
      </div>
    </div>
  );
}
