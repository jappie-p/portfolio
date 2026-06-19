"use client";
import { Section } from "@/components/journey/Section";
import { Glass } from "@/components/ui/Glass";
import { useT } from "@/i18n/useT";

export function Ai() {
  const t = useT();
  return (
    <Section id="ai" label={t.nav.ai}>
      <Glass className="max-w-xl p-10 text-center">
        <h2 className="headline text-4xl text-forest">{t.sections.ai.title}</h2>
        <p className="mt-3 text-ink-dim">{t.sections.ai.lead}</p>
      </Glass>
    </Section>
  );
}
