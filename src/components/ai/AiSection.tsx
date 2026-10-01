"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { SplitText } from "@/components/ui/SplitText";
import dynamic from "next/dynamic";
import { redraw } from "@/lib/redraw";
import { prefersReducedMotion } from "@/lib/motion";
import { hasHardwareWebGL } from "@/lib/webgl";
import { onScreen } from "@/lib/scene";
import { useJourney } from "@/lib/store";
import { ProjectTrack } from "@/components/journey/panels";
import { Chapter } from "@/components/cyber/Chapter";
import { trackProgress } from "@/components/cyber/lib/scene-math";
import { ProjectCard } from "@/components/work/ProjectCard";
import { useT } from "@/i18n/useT";
import type { AiLabels } from "./sim";

const AiCanvas = dynamic(() => import("./AiCanvas").then((m) => m.AiCanvas), { ssr: false });

const POSTER = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/ai-poster.webp`;

/**
 * AI topic: the Jarvis orb as a live core in a violet network, played
 * sideways in three chapters. The cover shows the core alive in its network;
 * Jarvis pipes mail, the app and the agenda through it to Claude and push
 * notifications; Go to Guy turns it into a hub with the team's tools in a
 * ring and agents flying the work between them.
 *
 * Modes, decided on the client (SSR and no GPU get the poster still):
 *  - live:  WebGL + motion
 *  - still: WebGL + reduced motion, one rendered frame per chapter
 */
export function AiSection() {
  const t = useT();
  const [mode, setMode] = useState<"poster" | "live" | "still">("poster");
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const boot = useRef(false);

  const labels = useMemo<AiLabels>(
    () => ({ jarvis: t.diagrams.jarvis, hub: t.diagrams["go-to-guy"] }),
    [t],
  );

  useEffect(() => {
    if (!hasHardwareWebGL()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(prefersReducedMotion() ? "still" : "live");
  }, []);

  // sideways scroll -> story progress (ref-driven, no re-renders)
  useEffect(() => {
    const track = trackRef.current;
    if (mode === "poster" || !track) return;
    let raf = 0;
    const compute = () => {
      progress.current = trackProgress(track.scrollLeft, track.scrollWidth, track.clientWidth);
      if (mode === "still") redraw();
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };
    compute();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode]);

  // mount a screen early, draw only while on screen, power on once properly in view
  useEffect(() => {
    const section = sectionRef.current;
    if (mode === "poster" || !section) return;
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some(onScreen)) setMounted(true);
      },
      { rootMargin: "100% 0px 100% 0px", threshold: [0, 0.001] },
    );
    // draw only while some of it is actually on screen
    const shown = new IntersectionObserver((entries) => setActive(entries.some(onScreen)), { threshold: [0, 0.001] });
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        boot.current = true;
        seen.disconnect();
      },
      { threshold: 0.6 },
    );
    near.observe(section);
    shown.observe(section);
    seen.observe(section);
    return () => {
      near.disconnect();
      shown.disconnect();
      seen.disconnect();
    };
  }, [mode]);

  // the orb listens while its topic is on screen
  useEffect(() => {
    useJourney.getState().setOrbState(active ? "responding" : "idle");
  }, [active]);

  const s = t.sections.ai;
  const story = t.aiStory;

  return (
    <section ref={sectionRef} data-section="ai" aria-label={s.title} className="topic-row relative w-screen overflow-hidden bg-[#040210]">
      {mode === "poster" ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${POSTER})` }} aria-hidden />
      ) : (
        mounted && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden>
            <AiCanvas progress={progress} boot={boot} labels={labels} active={active} still={mode === "still"} onReady={() => setReady(true)} />
          </div>
        )
      )}
      {/* legibility scrim for the chapter copy */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#040210]/85 via-[#040210]/5 to-transparent" />

      <ProjectTrack label={s.title} ref={trackRef}>
        <Chapter label={s.title} next={t.ui.scrollSideways}>
          <p className="label text-violet-300">{t.nav.ai}</p>
          <SplitText as="h2" text={s.title} className="headline mt-3 text-6xl text-white sm:text-7xl" />
          <p className="mt-3 text-base text-white/80 sm:text-lg">{s.lead}</p>
        </Chapter>
        <Chapter label={story.jarvis.title} next={t.ui.next}>
          <p className="label text-cyan-300">{story.jarvis.label}</p>
          <SplitText as="h3" text={story.jarvis.title} className="headline mt-3 text-4xl text-white sm:text-5xl" />
          <p className="mt-3 text-base text-white/80 sm:text-lg">{story.jarvis.body}</p>
          <ProjectCard slug="jarvis" className="mt-5" />
        </Chapter>
        <Chapter label={story.gotoguy.title} align="end">
          <p className="label text-emerald-300">{story.gotoguy.label}</p>
          <SplitText as="h3" text={story.gotoguy.title} className="headline mt-3 text-4xl text-white sm:text-5xl" />
          <p className="mt-3 text-base text-white/80 sm:text-lg">{story.gotoguy.body}</p>
          <ProjectCard slug="go-to-guy" className="mt-5" />
        </Chapter>
      </ProjectTrack>
    </section>
  );
}
