"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangSync, useLocale, useT } from "@/i18n/useT";
import preview from "@/assets/welcome/experience.webp";
import { enterExperience, tourDone } from "./enter";
import { wakeSound } from "./sound";
import { wakeVoice } from "./voice";
import s from "./welcome.module.css";

// the how-to only loads once someone asks for it
const Tour = dynamic(() => import("./Tour").then((m) => m.Tour), { ssr: false });

/** NL / EN, in the welcome's own quiet style. */
function Languages() {
  const locale = useLocale((st) => st.locale);
  const set = useLocale((st) => st.set);
  return (
    <div className={s.langs} role="group" aria-label="Taal / Language">
      {(["nl", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={locale === l} onClick={() => set(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/**
 * The front door: a plain white page that asks how you would like to look
 * around. The simple version comes later; the experience opens with a
 * short how-to the first time (Tour), and straight away after that.
 * Without scripts the experience is a plain link.
 */
export function Welcome() {
  const t = useT();
  const w = t.welcome;
  const router = useRouter();
  const shot = useRef<HTMLSpanElement>(null);
  const [touring, setTouring] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(tourDone());
    router.prefetch("/experience");
  }, [router]);

  const go = () => router.push("/experience");
  // the how-to speaks: sound and voice wake up inside the click that opens it
  const tour = () => {
    wakeSound();
    wakeVoice();
    setTouring(true);
  };
  const choose = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (done) void enterExperience(shot.current, go);
    else tour();
  };

  return (
    <main className={`${s.page} welcome-page`}>
      <LangSync />
      <header className={s.top}>
        <span className={s.mark}>Jasper Pathuis</span>
        <Languages />
      </header>

      <div className={s.body} aria-hidden={touring || undefined}>
        <p className={s.kicker}>{w.kicker}</p>
        <h1 className={s.title}>{w.title}</h1>
        <div className={s.choices}>
          <div className={`${s.choice} ${s.simple}`} aria-disabled="true">
            <span aria-hidden className={s.sheet}>
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className={s.badge}>{w.soon}</span>
            <h2 className={s.name}>{w.simpleTitle}</h2>
            <p className={s.text}>{w.simpleText}</p>
          </div>
          <Link href="/experience" onClick={choose} className={`${s.choice} ${s.rich}`}>
            <span ref={shot} className={s.shot}>
              <Image src={preview} alt="" sizes="(min-width: 720px) 380px, 90vw" priority />
            </span>
            <h2 className={s.name}>{w.richTitle}</h2>
            <p className={s.text}>{w.richText}</p>
            <span className={s.cta}>
              {w.enter}
              <span aria-hidden className={s.arrow}>
                →
              </span>
            </span>
          </Link>
        </div>
        {done && (
          <button type="button" className={s.again} onClick={tour}>
            {w.again}
          </button>
        )}
      </div>

      {touring && <Tour onClose={() => setTouring(false)} onEnter={(from) => void enterExperience(from, go)} />}
    </main>
  );
}
