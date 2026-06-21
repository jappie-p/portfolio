"use client";
import { TopicRow, Panel } from "@/components/journey/panels";
import { WorldCanvas } from "@/components/canvas/WorldCanvas";
import { useT } from "@/i18n/useT";

export function Hero() {
  const t = useT();
  return (
    <TopicRow id="hero" label={t.nav.home}>
      <WorldCanvas />
      <Panel>
        <div className="relative z-10 max-w-2xl text-center [text-shadow:0_2px_24px_rgba(10,8,6,0.55)]">
          <h1 className="headline text-5xl text-white sm:text-7xl">{t.hero.name}</h1>
          <p className="mt-4 text-lg text-white/75">{t.hero.role}</p>
          <p className="mt-2 text-white/90">{t.hero.identity}</p>
          <p className="mt-10 text-sm text-white/50">{t.hero.cta} ↓</p>
        </div>
      </Panel>
    </TopicRow>
  );
}
