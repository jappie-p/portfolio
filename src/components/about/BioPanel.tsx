"use client";
import { ProjectPanel } from "@/components/journey/panels";
import { SplitText } from "@/components/ui/SplitText";
import { NextButton } from "@/components/ui/NextButton";
import { SITE, BASE_PATH } from "@/data/site";
import { useLocale, useT } from "@/i18n/useT";
import { Portrait } from "./Portrait";

/** Who I am: the portrait in starlight beside the story, with why I do this
 *  set as a pull quote, then the cv. */
export function BioPanel() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const a = t.about;
  const links = [
    { href: SITE.github, label: t.contact.github },
    { href: SITE.linkedin, label: t.contact.linkedin },
  ].filter((l) => l.href);

  return (
    <ProjectPanel label={a.title}>
      <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20">
        <div data-reveal className="flex justify-center lg:justify-end">
          <Portrait alt={a.photoAlt} />
        </div>
        <div className="flex flex-col items-start">
          <div data-reveal className="flex flex-col items-start">
            <p className="label text-leaf">
              {t.hero.name} · {t.hero.role}
            </p>
            <SplitText as="h2" text={a.title} className="headline mt-5 text-6xl text-ink sm:text-7xl" />
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-dim">{a.intro}</p>
            <div className="relative mt-9 max-w-xl pl-6">
              <span aria-hidden className="absolute inset-y-1 left-0 w-px bg-gradient-to-b from-leaf/70 via-leaf/25 to-transparent" />
              <h3 className="label text-(--quiet)">{a.whyTitle}</h3>
              <p className="mt-3 font-display text-[1.15rem] leading-[1.45] tracking-[0.005em] text-ink [word-spacing:0.06em] sm:text-[1.25rem] sm:leading-[1.45]">
                {a.why}
              </p>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href={`${BASE_PATH}${SITE.cv[locale]}`} target="_blank" rel="noopener" className="btn btn-primary">
                {a.cv}
                <span className="label text-[10px] tracking-[0.2em] opacity-70">pdf</span>
              </a>
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  {l.label}
                  <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
          </div>
          {/* outside the rise-in, so it is ready to press the moment the panel is */}
          <NextButton label={a.skillsTitle} />
        </div>
      </div>
    </ProjectPanel>
  );
}
