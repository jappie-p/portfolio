"use client";

import { useEffect, useRef } from "react";

// Thin scroll-progress bar pinned to the top of v2 — orientation through the
// long pinned sections. Reads window scroll directly (cheap, no store).
export default function V2Progress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed left-0 top-0 z-[65] h-[2px] w-full bg-transparent">
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-ember"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
