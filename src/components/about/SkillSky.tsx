"use client";
import { useEffect, useRef, useState } from "react";
import { SKILLS } from "@/data/skills";
import { PROJECT_NAMES } from "@/lib/chapters";
import { useT } from "@/i18n/useT";
import { Constellation, type StarEvents, type StarText } from "./Constellation";
import { SKILL_STARS, type SkillStar } from "./skill-stars";

/** Nudges that keep the six constellations from sitting on a grid. */
const DRIFT = ["lg:translate-y-1", "lg:translate-y-8", "lg:-translate-y-2", "lg:translate-x-3", "lg:-translate-y-1", "lg:translate-y-5"];

/**
 * The hard skills as a night sky: one constellation per group, a star per
 * skill. Pointing at a star (or focusing it) lights its constellation and
 * names the projects that use it; a tap or click pins that until the next tap,
 * a click elsewhere or Escape.
 */
export function SkillSky() {
  const t = useT();
  const a = t.about;
  const sky = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const pinned = useRef(false);

  const clear = () => {
    pinned.current = false;
    setActive(null);
  };
  const release = (name: string) => {
    if (!pinned.current) setActive((cur) => (cur === name ? null : cur));
  };
  const on: StarEvents = {
    enter: (name) => !pinned.current && setActive(name),
    leave: release,
    focus: (name) => {
      pinned.current = false;
      setActive(name);
    },
    blur: (name) => {
      pinned.current = false;
      release(name);
    },
    press: (name) => {
      if (pinned.current && active === name) return clear();
      pinned.current = true;
      setActive(name);
    },
  };

  // a pinned star lets go on Escape or a tap anywhere else
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clear();
    const onDown = (e: PointerEvent) => pinned.current && !sky.current?.contains(e.target as Node) && clear();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [active]);

  const text = (s: SkillStar): StarText => {
    if (!s.uses.length) return { names: a.skyNone };
    const names = s.uses.map((u) => (u.kind === "project" ? PROJECT_NAMES[u.slug] : t.archive[u.id].title));
    return { count: `${s.uses.length} ${s.uses.length === 1 ? a.skyProject : a.skyProjects}`, names: names.join(", ") };
  };
  const group = active ? Object.values(SKILL_STARS).flat().find((s) => s.name === active)?.group : undefined;

  return (
    <section ref={sky} aria-labelledby="hard-skills" className="mt-10 sm:mt-12">
      <div data-reveal className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
        <h3 id="hard-skills" className="label shrink-0 text-(--quiet)">
          {a.hardTitle}
        </h3>
        <p className="max-w-[46rem] text-sm leading-relaxed text-ink-dim">{a.skyLegend}</p>
      </div>
      <ul className="mt-8 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:mt-7 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-6">
        {SKILLS.map((g, i) => (
          <Constellation
            key={g.id}
            group={g.id}
            title={t.skills[g.id]}
            stars={SKILL_STARS[g.id]}
            order={i}
            active={active}
            state={group ? (group === g.id ? "lit" : "dim") : undefined}
            text={text}
            on={on}
            className={DRIFT[i]}
          />
        ))}
      </ul>
    </section>
  );
}
