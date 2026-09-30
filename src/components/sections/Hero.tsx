"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { TopicRow, Panel } from "@/components/journey/panels";
import { Typewriter } from "@/components/ui/Typewriter";
import { jumpTo, useInView, useSceneMode } from "@/lib/scene";
import { useT } from "@/i18n/useT";

const HexHorizon = dynamic(() => import("@/components/scenes/HexHorizon").then((m) => m.HexHorizon), { ssr: false });

/** The opening: name, where I come from, what I build, over a live honeycomb
 *  horizon that follows the pointer. */
export function Hero() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const mode = useSceneMode();
  const inView = useInView(ref);

  return (
    <TopicRow id="hero" label={t.nav.home} ref={ref} className="overflow-hidden">
      {mode !== "off" && <HexHorizon tone="hero" active={inView} still={mode === "still"} />}
      {/* keep the copy legible over the floor, and fade the scene into the page */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_42%,rgba(5,8,13,0.72),transparent_75%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05080d] to-transparent" />

      <Panel>
        <div data-reveal className="flex max-w-4xl flex-col items-center text-center">
          <p className="label text-leaf">{t.hero.role}</p>
          <h1 className="hero-name headline mt-5 text-6xl sm:text-8xl lg:text-9xl">{t.hero.name}</h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-dim sm:text-xl">
            <Typewriter text={t.hero.identity} />
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
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
      </Panel>

      <div aria-hidden className="pointer-events-none absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="label text-[10px] text-ink-faint">{t.hero.scroll}</span>
        <span className="block h-7 w-px overflow-hidden bg-white/10">
          <span className="scroll-cue-line block h-full w-full bg-leaf" />
        </span>
      </div>
    </TopicRow>
  );
}
