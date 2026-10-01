"use client";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { jumpTo } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import { LearnPath } from "./LearnPath";
import { PanelHeading } from "./PanelHeading";

/** What I want to learn next as unlit stars, then references in one line. */
export function LearnPanel() {
  const t = useT();
  const a = t.about;
  return (
    <ProjectPanel label={a.learnTitle}>
      <div className="w-full max-w-6xl">
        <PanelHeading label={t.nav.about} title={a.learnTitle} lead={a.learnLead} />
        <LearnPath />
        <div data-reveal className="mt-14 border-t border-white/10 pt-7">
          <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-baseline lg:gap-6">
              <h3 className="label shrink-0 text-(--quiet)">{a.refsTitle}</h3>
              <p className="max-w-2xl leading-relaxed text-ink-dim">{a.refsText}</p>
            </div>
            <button type="button" onClick={() => jumpTo("contact")} className="btn btn-ghost shrink-0">
              {a.refsCta}
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
        <NextButton label={a.moreTitle} />
      </div>
    </ProjectPanel>
  );
}
