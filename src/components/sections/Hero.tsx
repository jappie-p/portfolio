"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { TopicRow } from "@/components/journey/panels";
import { HeroDoors } from "@/components/hero/HeroDoors";
import { Typewriter } from "@/components/ui/Typewriter";
import { SplitText } from "@/components/ui/SplitText";
import { jumpTo, useInView, useSceneMode } from "@/lib/scene";
import { useT } from "@/i18n/useT";

const HexHorizon = dynamic(() => import("@/components/scenes/HexHorizon").then((m) => m.HexHorizon), { ssr: false });

/** The opening: who I am and what I build, over a honeycomb floor that powers
 *  on, with a row of doors standing on it, one into every world on the site. */
export function Hero() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const mode = useSceneMode();
  const inView = useInView(ref);

  return (
    <TopicRow id="hero" label={t.nav.home} ref={ref} className="overflow-hidden">
      {mode !== "off" && <HexHorizon tone="hero" active={inView} still={mode === "still"} />}
      {/* keep the copy legible over the floor, and fade the scene into the page */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(62%_34%_at_50%_26%,rgba(5,8,13,0.78),transparent_78%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#05080d] to-transparent" />

      <div data-panel className="relative z-10 flex h-full w-full flex-col items-center px-6 pt-[clamp(6.5rem,15dvh,9.5rem)]">
        <div className="hero-intro flex max-w-5xl flex-col items-center text-center">
          <p className="label text-leaf">{t.hero.role}</p>
          <SplitText as="h1" intro delay={120} text={t.hero.name} className="hero-name headline mt-4 text-[clamp(3.25rem,8vw,7rem)]" />
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-dim sm:text-xl">
            <Typewriter text={t.hero.identity} />
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => jumpTo("websites")} className="btn btn-primary">
              {t.hero.work}
              <span aria-hidden className="btn-arrow">
                →
              </span>
            </button>
            <button type="button" onClick={() => jumpTo("contact")} className="btn btn-ghost">
              {t.hero.contact}
            </button>
          </div>
        </div>
      </div>

      <HeroDoors />

      <div aria-hidden className="pointer-events-none absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="label text-[10px] text-ink-faint">{t.hero.scroll}</span>
        <span className="block h-6 w-px overflow-hidden bg-white/10">
          <span className="scroll-cue-line block h-full w-full bg-leaf" />
        </span>
      </div>
    </TopicRow>
  );
}
