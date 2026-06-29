"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { PROJECT_NAMES } from "@/lib/chapters";
import { useT } from "@/i18n/useT";

/**
 * Cyber topic as a tall, pinned scroll-scrub scene. The firewall clip pins
 * full-screen and scrubs 0 -> end as you scroll DOWN through the section; the
 * heading stays pinned over it and the Homelab card reveals near the end.
 *
 * All-intra video so each seek is a single cheap decode; an rVFC pump gates
 * seeks on video.seeking so a fast scroll stays locked to position.
 *
 * Modes (decided client-side; SSR/first paint is the static floor):
 *  - scrub:   fine pointer + rVFC -> tall pinned scroll-scrub
 *  - ambient: coarse pointer / no rVFC -> one screen, muted autoplay loop
 *  - static:  reduced motion -> one screen, poster only
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SRC = `${BASE}/firewall-intra.mp4`;
const POSTER = `${BASE}/firewall-poster.jpg`;
const FRAMES = 239; // 240 frames, 0-indexed
const FPS = 24;

type Mode = "static" | "scrub" | "ambient";
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function CyberScrollScene() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("static");
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Pick a mode once, on the client. Capability-based (never UA sniffing).
  useEffect(() => {
    if (prefersReducedMotion()) return; // stays "static"
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const hasRvfc =
      typeof HTMLVideoElement !== "undefined" &&
      "requestVideoFrameCallback" in HTMLVideoElement.prototype;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(coarse || !hasRvfc ? "ambient" : "scrub");
  }, []);

  // Scrub the firewall off the section's vertical scroll progress (only while
  // the sticky pin is engaged), and reveal the Homelab card over the last leg.
  useEffect(() => {
    if (mode !== "scrub") return;
    const v = videoRef.current;
    const section = sectionRef.current;
    if (!v || !section) return;

    let ready = v.readyState >= 1; // HAVE_METADATA
    let pendingFrame: number | null = null;
    let raf = 0;
    let cancelled = false;

    // One seek at a time, compared by frame INDEX; the seeking guard is the
    // anti-jank gate so seeks never stack during a fast scroll.
    const reconcile = () => {
      if (cancelled || pendingFrame == null || !ready || v.seeking) return;
      if (Math.round(v.currentTime * FPS) !== pendingFrame) v.currentTime = pendingFrame / FPS;
    };
    const loop = () => {
      if (cancelled) return;
      reconcile();
      v.requestVideoFrameCallback(loop);
    };
    v.requestVideoFrameCallback(loop);

    const compute = () => {
      const vh = window.innerHeight || 1;
      const rect = section.getBoundingClientRect();
      const span = rect.height - vh; // scroll distance while the pin is stuck
      const p = span > 0 ? clamp01(-rect.top / span) : 0;
      pendingFrame = Math.round(p * FRAMES);
      if (cardRef.current) {
        const a = clamp01((p - 0.55) / 0.25); // reveal over the final ~25%
        cardRef.current.style.opacity = String(a);
        cardRef.current.style.transform = `translateY(${(1 - a) * 24}px)`;
      }
      reconcile(); // kick a seek now so the rVFC loop wakes back up
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };
    const onMeta = () => {
      ready = true;
      compute();
    };
    if (ready) compute();
    else v.addEventListener("loadedmetadata", onMeta, { once: true });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      v.removeEventListener("loadedmetadata", onMeta);
      if (raf) cancelAnimationFrame(raf);
      pendingFrame = null;
    };
  }, [mode]);

  // Lazy buffering (the asset is ~16MB) + ambient playback, triggered when the
  // section is ~2 screens away so it's ready before the user arrives.
  useEffect(() => {
    if (mode === "static") return;
    const v = videoRef.current;
    const section = sectionRef.current;
    if (!v || !section) return;
    let triggered = false;
    const tryPlay = () => v.play().catch(() => {});
    const start = () => {
      if (triggered) return;
      triggered = true;
      v.preload = "auto";
      v.load();
      if (mode === "ambient") {
        v.muted = true;
        v.playsInline = true;
        tryPlay();
        window.addEventListener("pointerdown", tryPlay, { once: true });
      }
    };
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && start(),
      { root: null, rootMargin: "200% 0px 200% 0px", threshold: 0 },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      window.removeEventListener("pointerdown", tryPlay);
    };
  }, [mode]);

  const s = t.sections.cyber;
  const short = mode !== "scrub";

  return (
    <section
      ref={sectionRef}
      data-section="cyber"
      aria-label={s.title}
      className={`cyber-scene ${short ? "cyber-scene--short" : ""}`}
    >
      <div className="cyber-pin bg-[#0a1626]">
        {mode === "static" ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${POSTER})` }}
            aria-hidden
          />
        ) : (
          <video
            ref={videoRef}
            src={SRC}
            poster={POSTER}
            muted
            playsInline
            loop={mode === "ambient"}
            preload="none"
            disableRemotePlayback
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* legibility scrim for the white heading text */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1626]/40 via-[#0a1626]/10 to-[#0a1626]/60" />

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
