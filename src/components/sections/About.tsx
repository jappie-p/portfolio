"use client";
import Image from "next/image";
import { TopicRow, ProjectTrack, ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { SITE, BASE_PATH } from "@/data/site";
import { LEARNING, SKILLS, SOFT_SKILLS } from "@/data/skills";
import { ARCHIVE } from "@/data/projects";
import { jumpTo } from "@/lib/scene";
import { useLocale, useT } from "@/i18n/useT";
import portrait from "@/assets/about/jasper.webp";

/** Hexagonal portrait with a slowly turning glow ring. */
function Portrait({ alt }: { alt: string }) {
  return (
    <div className="portrait relative h-64 w-56 shrink-0 sm:h-80 sm:w-72">
      <div aria-hidden className="portrait-ring absolute -inset-[3px]" />
      <div className="portrait-hex absolute inset-0 overflow-hidden bg-[#0b1118]">
        <Image src={portrait} alt={alt} fill sizes="(min-width: 640px) 288px, 224px" placeholder="blur" className="object-cover object-[50%_35%]" />
        {/* settle the bright photo into the dark page */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_32%,transparent_52%,rgba(5,8,13,0.6))]" />
      </div>
    </div>
  );
}

/** A panel heading: small label, big title, optional lead. */
function Heading({ label, title, lead }: { label: string; title: string; lead?: string }) {
  return (
    <div data-reveal className="flex flex-col items-start">
      <p className="label text-leaf">{label}</p>
      <h2 className="headline mt-4 text-5xl text-ink sm:text-6xl">{title}</h2>
      {lead && <p className="mt-4 max-w-xl text-lg text-ink-dim">{lead}</p>}
    </div>
  );
}

/** About me, sideways: who I am and why, my skills, what I want to learn next
 *  (with references), and the smaller work. */
export function About() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const a = t.about;
  const links = [
    { href: SITE.github, label: t.contact.github },
    { href: SITE.linkedin, label: t.contact.linkedin },
  ].filter((l) => l.href);

  return (
    <TopicRow id="about" label={a.title}>
      <ProjectTrack label={a.title}>
        <ProjectPanel label={a.title}>
          <div className="grid w-full max-w-5xl items-center gap-10 sm:grid-cols-[auto_1fr] sm:gap-16">
            <div data-reveal className="flex justify-center">
              <Portrait alt={a.photoAlt} />
            </div>
            <div data-reveal className="flex flex-col items-start">
              <p className="label text-leaf">
                {t.hero.name} · {t.hero.role}
              </p>
              <h2 className="headline mt-4 text-5xl text-ink sm:text-6xl">{a.title}</h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-dim">{a.intro}</p>
              <h3 className="label mt-7 text-ink-faint">{a.whyTitle}</h3>
              <p className="mt-3 max-w-xl leading-relaxed text-ink-dim">{a.why}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
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
              <NextButton label={a.skillsTitle} />
            </div>
          </div>
        </ProjectPanel>

        <ProjectPanel label={a.skillsTitle}>
          <div className="w-full max-w-6xl">
            <Heading label={t.nav.about} title={a.skillsTitle} lead={a.skillsLead} />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
              <section aria-labelledby="hard-skills">
                <h3 id="hard-skills" className="label text-ink-faint">
                  {a.hardTitle}
                </h3>
                <ul data-reveal className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SKILLS.map((g) => (
                    <li key={g.id} className="skill-tile glass p-4">
                      <h4 className="text-sm font-medium text-ink">{t.skills[g.id]}</h4>
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {g.items.map((item) => (
                          <li key={item} className="chip">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="soft-skills">
                <h3 id="soft-skills" className="label text-ink-faint">
                  {a.softTitle}
                </h3>
                <ul data-reveal className="glass mt-4 divide-y divide-white/5 border-leaf/20">
                  {SOFT_SKILLS.map((id) => (
                    <li key={id} className="flex gap-3 px-5 py-3">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                      <div>
                        <p className="text-sm font-medium text-ink">{t.softSkills[id].title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-ink-dim">{t.softSkills[id].text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <NextButton label={a.learnTitle} />
          </div>
        </ProjectPanel>

        <ProjectPanel label={a.learnTitle}>
          <div className="w-full max-w-5xl">
            <Heading label={t.nav.about} title={a.learnTitle} lead={a.learnLead} />
            <ol data-reveal className="mt-10 grid gap-4 sm:grid-cols-2">
              {LEARNING.map((id, i) => (
                <li key={id} className="skill-tile glass flex gap-4 p-5">
                  <span className="label pt-1 text-leaf">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="headline text-2xl text-ink">{t.learning[id].title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-dim">{t.learning[id].text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div data-reveal className="mt-6">
              <div className="glass flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                  <h3 className="label text-ink-faint">{a.refsTitle}</h3>
                  <p className="mt-2 leading-relaxed text-ink-dim">{a.refsText}</p>
                </div>
                <button type="button" onClick={() => jumpTo("contact")} className="btn btn-ghost shrink-0">
                  {a.refsCta}
                  <span aria-hidden className="btn-arrow">
                    →
                  </span>
                </button>
              </div>
            </div>
            <NextButton label={a.moreTitle} />
          </div>
        </ProjectPanel>

        <ProjectPanel label={a.moreTitle}>
          <div className="w-full max-w-4xl">
            <Heading label={t.nav.about} title={a.moreTitle} lead={a.moreLead} />
            <ul data-reveal className="glass mt-10 divide-y divide-white/5">
              {ARCHIVE.map((item) => {
                const copy = t.archive[item.id];
                return (
                  <li key={item.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-4">
                        <span className="label text-ink-faint">{item.year}</span>
                        {item.href ? (
                          <a href={item.href} target="_blank" rel="noopener noreferrer" className="headline text-2xl text-ink transition-colors hover:text-leaf">
                            {copy.title} <span aria-hidden className="text-lg">↗</span>
                          </a>
                        ) : (
                          <span className="headline text-2xl text-ink">{copy.title}</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-ink-dim">{copy.text}</p>
                    </div>
                    <ul className="flex shrink-0 flex-wrap gap-2">
                      {item.tech.map((x) => (
                        <li key={x} className="chip">
                          {x}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </ProjectPanel>
      </ProjectTrack>
    </TopicRow>
  );
}
