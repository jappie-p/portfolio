"use client";
import { Section } from "@/components/journey/Section";
import { Glass } from "@/components/ui/Glass";
import { useT } from "@/i18n/useT";

export function Websites() {
  const t = useT();
  return (
    <Section id="websites" label={t.nav.websites}>
      <Glass className="max-w-xl p-10 text-center">
        <h2 className="headline text-4xl text-forest">{t.sections.websites.title}</h2>
        <p className="mt-3 text-ink-dim">{t.sections.websites.lead}</p>
      </Glass>
    </Section>
  );
}
