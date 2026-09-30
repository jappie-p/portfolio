"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { invalidate } from "@react-three/fiber";
import { prefersReducedMotion } from "@/lib/motion";
import { hasHardwareWebGL } from "@/lib/webgl";
import { PROJECT_NAMES } from "@/lib/chapters";
import { ProjectTrack } from "@/components/journey/panels";
import { useT } from "@/i18n/useT";
import { Chapter } from "./Chapter";
import { OpenCaseButton } from "@/components/work/CaseOverlay";
import { ProjectMeta } from "@/components/work/ProjectMeta";
import { trackProgress } from "./lib/scene-math";

// the scene loads only on the client, in its own chunk
const CyberCanvas = dynamic(() => import("./CyberCanvas").then((m) => m.CyberCanvas), { ssr: false });

const POSTER = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/firewall-poster.jpg`;

/**
 * Cyber topic: one screen like the other topics, with a live WebGL firewall
 * under DDoS attack behind a sideways chapter track. Scrolling sideways plays
 * the story (overview, attack, defence, secure) and swings the camera from
 * chapter to chapter; the Homelab card is the last stop. The scene powers on
 * once the section is properly in view.
 *
 * Modes, decided on the client (SSR and no GPU get the poster still):
 *  - live:  WebGL + motion
 *  - still: WebGL + reduced motion, one rendered frame per chapter
 */
export function CyberSection() {
  const t = useT();
  const [mode, setMode] = useState<"poster" | "live" | "still">("poster");
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const boot = useRef(false);

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
      if (mode === "still") invalidate();
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

  // mount the canvas a screen early and pause it far away; power on once properly in view
  useEffect(() => {
    const section = sectionRef.current;
    if (mode === "poster" || !section) return;
    const near = new IntersectionObserver(
      (entries) => {
        const n = entries.some((e) => e.isIntersecting);
        if (n) setMounted(true);
        setActive(n);
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        boot.current = true;
        seen.disconnect();
      },
      { threshold: 0.6 },
    );
    near.observe(section);
    seen.observe(section);
    return () => {
      near.disconnect();
      seen.disconnect();
    };
  }, [mode]);

  const s = t.sections.cyber;
  const story = t.cyberStory;

  return (
    <section ref={sectionRef} data-section="cyber" aria-label={s.title} className="topic-row relative w-screen overflow-hidden bg-[#03070e]">
      {mode === "poster" ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${POSTER})` }} aria-hidden />
      ) : (
        mounted && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden>
            <CyberCanvas progress={progress} boot={boot} active={active} still={mode === "still"} onReady={() => setReady(true)} />
          </div>
        )
      )}
      {/* legibility scrim for the chapter copy */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03070e]/85 via-[#03070e]/5 to-transparent" />

      <ProjectTrack label={s.title} ref={trackRef}>
        <Chapter label={s.title} next={t.ui.scrollSideways}>
          <p className="label text-white/70">{t.nav.cyber}</p>
          <h2 className="headline mt-3 text-4xl text-white sm:text-5xl">{s.title}</h2>
          <p className="mt-3 text-base text-white/80 sm:text-lg">{s.lead}</p>
        </Chapter>
        <Chapter label={story.attack.title} next={t.ui.next}>
          <p className="label text-rose-300">{story.attack.label}</p>
          <h3 className="headline mt-3 text-4xl text-white sm:text-5xl">{story.attack.title}</h3>
          <p className="mt-3 text-base text-white/80 sm:text-lg">{story.attack.body}</p>
        </Chapter>
        <Chapter label={story.defense.title} next={t.ui.next}>
          <p className="label text-cyan-300">{story.defense.label}</p>
          <h3 className="headline mt-3 text-4xl text-white sm:text-5xl">{story.defense.title}</h3>
          <p className="mt-3 text-base text-white/80 sm:text-lg">{story.defense.body}</p>
        </Chapter>
        <Chapter label={PROJECT_NAMES.homelab} align="end">
          <p className="label text-emerald-300">{story.secure.label}</p>
          <div className="glass mt-4 max-w-sm p-8 [text-shadow:none]">
            <ProjectMeta slug="homelab" />
            <h3 className="headline mt-3 text-4xl text-ink">{PROJECT_NAMES.homelab}</h3>
            <p className="mt-3 leading-relaxed text-ink-dim">{t.projects.homelab.blurb}</p>
            <OpenCaseButton slug="homelab" className="mt-6" />
          </div>
        </Chapter>
      </ProjectTrack>
    </section>
  );
}
