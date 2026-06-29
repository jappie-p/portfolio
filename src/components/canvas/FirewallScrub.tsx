"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Cyber topic backdrop: an all-intra firewall clip that the user scrubs by
 * scrolling the cyber horizontal project track. Every frame is a keyframe, so
 * each seek is a single cheap decode; a requestVideoFrameCallback pump gates
 * seeks (never issue a new one while the last is unsettled) so a fast fling
 * stays locked to scroll position instead of lagging behind.
 *
 * Modes (decided client-side, so SSR/first paint is always the static floor):
 *  - scrub:   fine pointer + rVFC support -> scroll-driven currentTime
 *  - ambient: coarse pointer / no rVFC    -> muted autoplay loop (touch-safe)
 *  - static:  reduced motion              -> just the navy panel + poster
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SRC = `${BASE}/firewall-intra.mp4`;
const POSTER = `${BASE}/firewall-poster.jpg`;
const FRAMES = 239; // 240 frames, 0-indexed
const FPS = 24;

type Mode = "static" | "scrub" | "ambient";

export function FirewallScrub() {
  const [mode, setMode] = useState<Mode>("static");
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pick a mode once, on the client. Capability-based (never UA sniffing, since
  // iPadOS reports as desktop). Until this runs, the static floor is rendered.
  useEffect(() => {
    if (prefersReducedMotion()) return; // stays "static"
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const hasRvfc =
      typeof HTMLVideoElement !== "undefined" &&
      "requestVideoFrameCallback" in HTMLVideoElement.prototype;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(coarse || !hasRvfc ? "ambient" : "scrub");
  }, []);

  // Scrub wiring: only in scrub mode, where rVFC is guaranteed present.
  useEffect(() => {
    if (mode !== "scrub") return;
    const v = videoRef.current;
    const track = wrapRef.current
      ?.closest(".topic-row")
      ?.querySelector<HTMLElement>(".project-track");
    if (!v || !track) return;

    let ready = v.readyState >= 1; // HAVE_METADATA
    let pendingFrame: number | null = null;
    let raf = 0;
    let cancelled = false;

    // Move toward the latest scroll target, one seek at a time. Compare by frame
    // INDEX (not time distance) so every single-frame step advances and the true
    // end frame settles; the seeking guard is the anti-jank gate (never stack).
    const reconcile = () => {
      if (cancelled || pendingFrame == null || !ready || v.seeking) return;
      if (Math.round(v.currentTime * FPS) !== pendingFrame) v.currentTime = pendingFrame / FPS;
    };

    // Each painted frame (incl. the frame a seek lands on) re-checks and re-arms.
    // Goes dormant when caught up; a scroll kick (below) revives it.
    const loop = () => {
      if (cancelled) return;
      reconcile();
      v.requestVideoFrameCallback(loop);
    };
    v.requestVideoFrameCallback(loop);

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = track.scrollWidth - track.clientWidth;
        const p = max > 0 ? Math.min(1, Math.max(0, track.scrollLeft / max)) : 0;
        pendingFrame = Math.round(p * FRAMES);
        reconcile(); // kick a seek now so the rVFC loop wakes back up
      });
    };

    const onMeta = () => {
      ready = true;
      onScroll(); // paint the frame matching the current scroll position
    };
    if (ready) onScroll();
    else v.addEventListener("loadedmetadata", onMeta, { once: true });

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelled = true;
      track.removeEventListener("scroll", onScroll);
      v.removeEventListener("loadedmetadata", onMeta);
      if (raf) cancelAnimationFrame(raf);
      pendingFrame = null;
    };
  }, [mode]);

  // Lazy buffering: the asset is a sharp ~16MB all-intra clip, so don't pull it
  // on page load. Start buffering only once the cyber row is ~2 screens away,
  // which gives it time to be ready before the user arrives to scrub it. For
  // ambient mode this is also where playback starts (with an interaction retry).
  useEffect(() => {
    if (mode === "static") return;
    const v = videoRef.current;
    const row = wrapRef.current?.closest(".topic-row");
    if (!v || !row) return;
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
    io.observe(row);
    return () => {
      io.disconnect();
      window.removeEventListener("pointerdown", tryPlay);
    };
  }, [mode]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-0 bg-[#0a1626]" aria-hidden>
      {mode === "static" ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${POSTER})` }} />
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
          className="h-full w-full object-cover"
        />
      )}
      {/* shared legibility scrim for the white cover text that sits at z-10 above */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1626]/30 via-transparent to-[#0a1626]/45" />
    </div>
  );
}
