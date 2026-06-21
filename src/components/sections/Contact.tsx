"use client";
import { TopicRow, Panel } from "@/components/journey/panels";
import { Glass } from "@/components/ui/Glass";
import { useT } from "@/i18n/useT";

export function Contact() {
  const t = useT();
  return (
    <TopicRow id="contact" label={t.nav.contact}>
      <Panel>
        <Glass className="max-w-xl p-10 text-center">
          <h2 className="headline text-4xl text-forest">{t.nav.contact}</h2>
          <p className="mt-3 text-ink-dim">{t.contact.lead}</p>
        </Glass>
      </Panel>
    </TopicRow>
  );
}
