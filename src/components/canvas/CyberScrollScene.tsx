"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { hasWebGL } from "@/lib/webgl";
import { PROJECT_NAMES } from "@/lib/chapters";
import { useT } from "@/i18n/useT";
import { CyberCanvas } from "./CyberCanvas";

/**
 * Cyber topic as a tall, pinned scroll-scrub scene rendered LIVE in WebGL
 * (React Three Fiber) instead of a baked video, so it stays crisp at any screen
 * resolution. The firewall scene pins full-screen and the camera flies from a
 * wide shot to a close 3/4 as you scroll DOWN; the heading stays pinned and the
 * Homelab card reveals near the end.
 *
 * Modes:
 *  - scene:  WebGL + motion -> live R3F scene, camera scrubbed by scroll
 *  - static: no WebGL / reduced motion -> poster still + heading (no canvas)
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const POSTER = `${BASE}/firewall-poster.jpg`;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function CyberScrollScene() {
  const t = useT();
  const [mode, setMode] = useState<"static" | "scene">("static");
  const [mounted, setMounted] = useState(false); // lazy-mount the WebGL canvas
  const [active, setActive] = useState(false); // run the sim only while near
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  // Decide mode once on the client (SSR/first paint is the static floor).
  useEffect(() => {
    if (prefersReducedMotion() || !hasWebGL()) return; // stays "static"
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode("scene");
  }, []);

  // Scroll -> camera-scrub progress + Homelab card reveal (ref-driven, no
  // re-render; the camera reads progressRef every frame inside the canvas).
  useEffect(() => {
    if (mode !== "scene") return;
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    const compute = () => {
      const vh = window.innerHeight || 1;
      const rect = section.getBoundingClientRect();
      const span = rect.height - vh; // scroll distance while the pin is stuck
      const p = span > 0 ? clamp01(-rect.top / span) : 0;
      progressRef.current = p;
      if (cardRef.current) {
        const a = clamp01((p - 0.55) / 0.25); // reveal over the final ~25%
        cardRef.current.style.opacity = String(a);
        cardRef.current.style.transform = `translateY(${(1 - a) * 24}px)`;
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode]);

  // Lazy-mount the canvas when ~1 screen away, and pause the sim (active=false)
  // once the section leaves that band so we don't burn the GPU off-screen.
  useEffect(() => {
    if (mode !== "scene") return;
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((e) => e.isIntersecting);
        if (vis) setMounted(true);
        setActive(vis);
      },
      { root: null, rootMargin: "100% 0px 100% 0px", threshold: 0 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [mode]);

  const s = t.sections.cyber;
  const short = mode !== "scene";

  return (
    <section
      ref={sectionRef}
      data-section="cyber"
      aria-label={s.title}
      className={`cyber-scene ${short ? "cyber-scene--short" : ""}`}
    >
      <div className="cyber-pin bg-[#0a1626]">
        {mode === "scene" ? (
          mounted && <CyberCanvas progressRef={progressRef} active={active} />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${POSTER})` }}
            aria-hidden
          />
        )}
        {/* legibility scrim for the white heading text */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1626]/30 via-transparent to-[#0a1626]/55" />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-8 px-6 text-center">
          <div className="max-w-xl [text-shadow:0_2px_24px_rgba(10,8,6,0.55)]">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">{t.nav.cyber}</p>
            <h2 className="headline mt-3 text-5xl text-white sm:text-6xl">{s.title}</h2>
            <p className="mt-4 text-lg text-white/80">{s.lead}</p>
          </div>
          <div
            ref={cardRef}
            className="glass max-w-md p-8 text-center"
            style={{ opacity: short ? 1 : 0 }}
          >
            <h3 className="headline text-3xl text-forest">{PROJECT_NAMES.homelab}</h3>
            <p className="mt-3 text-ink-dim">{t.projects.homelab.blurb}</p>
            <button type="button" className="mt-6 rounded-full bg-leaf px-4 py-1.5 text-sm text-white">
              {t.ui.openCase}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
