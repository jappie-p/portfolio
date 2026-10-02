"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { TopicRow } from "@/components/journey/panels";
import { LoadIn, type Stage } from "@/components/hero/LoadIn";
import type { FieldState } from "@/components/hero/field/HexField";
import { Typewriter } from "@/components/ui/Typewriter";
import { SplitText } from "@/components/ui/SplitText";
import { hasHardwareWebGL } from "@/lib/webgl";
import { jumpTo, useInView, useSceneMode, useStill } from "@/lib/scene";
import { useT } from "@/i18n/useT";

const HeroField = dynamic(() => import("@/components/hero/HeroField").then((m) => m.HeroField), { ssr: false });

/** The opening, built up the way a game scene is: a field of hexagonal
 *  columns and the name go from pencil sketch to wireframe to the lit
 *  render while the page loads; then the field floats and the columns rise
 *  under the pointer. */
export function Hero() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const mode = useSceneMode();
  const still = useStill();
  const inView = useInView(ref);
  const [field] = useState<FieldState>(() => ({ stage: 0, rise: 0, draw: 0 }));
  const [stage, setStage] = useState<Stage>("sketch");
  const [sceneReady, setSceneReady] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);

  // without a GPU there is no field to wait for
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasHardwareWebGL()) setSceneReady(true);
  }, []);

  return (
    <TopicRow id="hero" label={t.nav.home} ref={ref} className="overflow-hidden">
      {mode !== "off" && <HeroField state={field} active={inView} still={mode === "still"} onReady={onReady} />}
      {/* keep the copy legible over the field, and fade the scene into the page */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(64%_40%_at_50%_34%,rgba(5,8,13,0.7),transparent_78%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#05080d] to-transparent" />

      <div data-load={stage} className="contents">
        <div data-panel className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 pb-[22dvh] pt-20 sm:pb-[20dvh]">
          <div className="hero-intro flex max-w-5xl flex-col items-center text-center">
            <p className="label text-leaf">{t.hero.role}</p>
            <SplitText as="h1" intro delay={120} text={t.hero.name} className="hero-name headline mt-4 text-[clamp(3.25rem,9vw,8rem)]" />
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

        <LoadIn state={field} still={still} ready={sceneReady} onStage={setStage} labels={[t.hero.load.sketch, t.hero.load.wire, t.hero.load.render]} />

        <div aria-hidden className="scroll-cue pointer-events-none absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="label text-[10px] text-ink-faint">{t.hero.scroll}</span>
          <span className="block h-6 w-px overflow-hidden bg-white/10">
            <span className="scroll-cue-line block h-full w-full bg-leaf" />
          </span>
        </div>
      </div>
    </TopicRow>
  );
}
