"use client";
import { Section } from "@/components/journey/Section";
import { useT } from "@/i18n/useT";

export function Hero() {
  const t = useT();
  return (
    <Section id="hero" label={t.nav.home}>
      <div className="max-w-2xl text-center">
        <h1 className="headline text-5xl text-forest sm:text-7xl">{t.hero.name}</h1>
        <p className="mt-4 text-lg text-ink-dim">{t.hero.role}</p>
        <p className="mt-2 text-ink">{t.hero.identity}</p>
        <p className="mt-8 text-sm text-ink-faint">{t.hero.cta}</p>
      </div>
    </Section>
  );
}
