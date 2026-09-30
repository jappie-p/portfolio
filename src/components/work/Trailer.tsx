"use client";
import { useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/data/site";
import { prefersReducedMotion } from "@/lib/motion";

/** A short muted loop from public/trailers (the files carry no audio track at
 *  all). It only plays while on screen; with reduced motion, or when the
 *  browser refuses autoplay, it shows its controls and waits for the viewer. */
export function Trailer({ name, label, className = "" }: { name: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setManual(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => setManual(true));
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const src = `${BASE_PATH}/trailers/${name}`;
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={`${src}.jpg`}
      controls={manual}
      aria-label={label}
      className={`block aspect-[16/10] h-auto w-full bg-black object-cover ${className}`}
    >
      <source src={`${src}.webm`} type="video/webm" />
      <source src={`${src}.mp4`} type="video/mp4" />
    </video>
  );
}
