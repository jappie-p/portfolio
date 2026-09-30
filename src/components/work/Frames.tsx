import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";

/** A dark browser window with the real address in the bar, around a
 *  screenshot or (as children) a video. */
export function BrowserFrame({
  src,
  url,
  alt = "",
  sizes = "100vw",
  priority = false,
  className = "",
  children,
}: {
  src?: StaticImageData;
  url: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <figure className={`overflow-hidden rounded-xl border border-white/10 bg-[#0b1118] shadow-[0_30px_80px_rgba(0,0,0,0.55)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 flex-1 truncate rounded-md bg-white/5 px-3 py-1 text-center text-[11px] text-ink-dim">{host}</span>
      </div>
      {children ?? (src && <Image src={src} alt={alt} sizes={sizes} priority={priority} placeholder="blur" className="block h-auto w-full" />)}
    </figure>
  );
}

/** A phone with a mobile screenshot. */
export function PhoneFrame({ src, alt, sizes, className = "" }: { src: StaticImageData; alt: string; sizes: string; className?: string }) {
  return (
    <figure className={`overflow-hidden rounded-[1.6rem] border-[5px] border-[#1c232c] bg-black shadow-[0_24px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 ${className}`}>
      <Image src={src} alt={alt} sizes={sizes} placeholder="blur" className="block h-auto w-full" />
    </figure>
  );
}

/** A free-standing kiosk touchscreen: a thick portrait bezel on a short foot. */
export function KioskFrame({ src, alt, sizes, className = "" }: { src: StaticImageData; alt: string; sizes: string; className?: string }) {
  return (
    <figure className={`flex flex-col items-center ${className}`}>
      <div className="w-full overflow-hidden rounded-[1.1rem] border-[9px] border-[#161c24] bg-black shadow-[0_30px_70px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <Image src={src} alt={alt} sizes={sizes} placeholder="blur" className="block h-auto w-full" />
      </div>
      <div aria-hidden className="h-6 w-[14%] bg-gradient-to-b from-[#1b222b] to-[#10151b]" />
      <div aria-hidden className="h-2 w-[46%] rounded-full bg-[#161c24] shadow-[0_10px_30px_rgba(0,0,0,0.6)]" />
    </figure>
  );
}
