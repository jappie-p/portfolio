"use client";
import { SOFT_SKILLS } from "@/data/skills";
import { useT } from "@/i18n/useT";

/** The soft skills as six traits, set as type: a name and one line each. */
export function Traits() {
  const t = useT();
  return (
    <section aria-labelledby="soft-skills">
      <h3 id="soft-skills" className="label text-(--quiet)">
        {t.about.softTitle}
      </h3>
      <ul data-reveal className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-1">
        {SOFT_SKILLS.map((id) => (
          <li key={id}>
            <p className="font-display text-lg font-medium tracking-[-0.01em] text-ink">{t.softSkills[id].title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-dim">{t.softSkills[id].text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
