"use client";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { SplitText } from "@/components/ui/SplitText";
import { SITE, BASE_PATH } from "@/data/site";
import { useLocale, useT } from "@/i18n/useT";
import player from "@/assets/about/player.webp";
import { FACTS } from "./facts";
import a from "./about.module.css";
import s from "./player.module.css";

/** The cut-out portrait doubles as the mask the light on it is drawn through. */
const figure = { WebkitMaskImage: `url(${player.src})`, maskImage: `url(${player.src})` } as CSSProperties;

/** Where I am now: school, work and my own company, in that order. */
const GUILDS = [
  { id: "school", name: "GLU", since: 2024 },
  { id: "work", name: "Go to Guy", since: 2026 },
  { id: "company", name: "HypHosting", since: 2026 },
] as const;

/**
 * About me as a character screen: the portrait standing in the hex world
 * like a character render, my name behind it, and the player card: class
 * and origin, a few facts counted from the projects on this site, the story,
 * why I do this, where I am now, and the cv.
 */
export function PlayerPanel() {
  const t = useT();
  const locale = useLocale((st) => st.locale);
  const ab = t.about;
  const p = ab.player;
  const stats = [
    { n: FACTS.live, what: p.live },
    { n: FACTS.built, what: p.built },
    { n: FACTS.company, what: p.company },
  ];

  return (
    <ProjectPanel label={ab.title}>
      <div className={s.player}>
        <div data-reveal className={s.stage}>
          <span aria-hidden className={s.back}>
            Jasper
          </span>
          <span aria-hidden className={s.beam} />
          <span aria-hidden className={s.floor} />
          <div className={s.figure}>
            <Image src={player} alt={ab.photoAlt} fill unoptimized sizes="(min-width: 1024px) 40vw, 90vw" />
            <span aria-hidden className={`${s.light} ${s.shade}`} style={figure} />
            <span aria-hidden className={`${s.light} ${s.sweep}`} style={figure} />
          </div>
          <span aria-hidden className={`${a.kicker} ${s.tag}`}>
            {p.kicker}
          </span>
        </div>

        <div className={s.card}>
          <div data-reveal className="flex w-full flex-col items-start">
            <p className={a.kicker}>{ab.title}</p>
            <SplitText as="h2" text={t.hero.name} className={s.name} />
            <dl className={s.traits}>
              <div>
                <dt>{p.classLabel}</dt>
                <dd>{p.classValue}</dd>
              </div>
              <div>
                <dt>{p.originLabel}</dt>
                <dd>{p.originValue}</dd>
              </div>
              <div>
                <dt>{p.regionLabel}</dt>
                <dd>{p.regionValue}</dd>
              </div>
            </dl>
            <ul className={s.stats}>
              {stats.map((st) => (
                <li key={st.what} className={s.stat}>
                  <span aria-hidden className={s.num} style={{ "--to": st.n } as CSSProperties} />
                  <span className={s.what}>
                    <span className="sr-only">{st.n} </span>
                    {st.what}
                  </span>
                </li>
              ))}
            </ul>
            <p className={s.intro}>{ab.intro}</p>
            <div className={s.why}>
              <h3 className={a.kicker}>{ab.whyTitle}</h3>
              <p className={s.whyText}>{ab.why}</p>
            </div>
            <div className={s.guilds}>
              <h3 className={a.kicker}>{p.guildsTitle}</h3>
              <ul className={s.guildList}>
                {GUILDS.map((g) => (
                  <li key={g.id} className={s.guild}>
                    <span className={s.guildName}>{g.name}</span>
                    <span className={s.guildRole}>{p.guilds[g.id]}</span>
                    <span className={s.guildSince}>
                      {p.since} {g.since}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={s.actions}>
              <a href={`${BASE_PATH}${SITE.cv[locale]}`} target="_blank" rel="noopener" className="btn btn-primary">
                {ab.cv}
                <span className="label text-[10px] tracking-[0.2em] opacity-70">pdf</span>
              </a>
              <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                {t.contact.github}
                <span aria-hidden>↗</span>
              </a>
              <NextButton label={ab.skillsTitle} className="mt-0!" />
            </div>
          </div>
        </div>
      </div>
    </ProjectPanel>
  );
}
