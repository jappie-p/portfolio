"use client";
import { Section } from "@/components/journey/Section";
import { Glass } from "@/components/ui/Glass";
import { useT } from "@/i18n/useT";

export function About() {
  const t = useT();
  return (
    <Section id="about" label={t.nav.about}>
      <Glass className="max-w-xl p-10 text-center">
        <h2 className="headline text-4xl text-forest">{t.nav.about}</h2>
        <p className="mt-3 text-ink-dim">{t.about.lead}</p>
      </Glass>
    </Section>
  );
}
