"use client";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangSync, useLocale, useT } from "@/i18n/useT";
import preview from "@/assets/welcome/experience.webp";
import school from "@/assets/welcome/world-school.webp";
import room from "@/assets/welcome/world-about.webp";
import cyber from "@/assets/welcome/world-cyber.webp";
import ai from "@/assets/welcome/world-ai.webp";
import city from "@/assets/welcome/world-contact.webp";
import { enterExperience, tourDone } from "./enter";
import { wakeAudio } from "@/lib/audio";
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

/** The worlds behind the door, in the order the window shows them: the
 *  hero's field, the School gallery, my room, the firewall, Jarvis, the
 *  city where it all is. */
const WORLDS = [preview, school, room, cyber, ai, city];

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
    wakeAudio();
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
            {/* the simple version, drawn as a page: a bar, a name, a few
                lines, the projects as tiles */}
            <span aria-hidden className={s.sheet}>
              <span className={s.wfPage}>
                <span className={s.wfBar}>
                  <i />
                  <b />
                  <b />
                  <b />
                </span>
                <span className={s.wfTitle} />
                <span className={s.wfLine} />
                <span className={`${s.wfLine} ${s.wfShort}`} />
                <span className={s.wfTiles}>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </span>
            <span className={s.badge}>{w.soon}</span>
            <h2 className={s.name}>{w.simpleTitle}</h2>
            <p className={s.text}>{w.simpleText}</p>
          </div>
          <Link href="/experience" onClick={choose} className={`${s.choice} ${s.rich}`}>
            <span ref={shot} className={s.shot} style={{ "--n": WORLDS.length } as CSSProperties}>
              <span className={s.frames}>
                {WORLDS.map((src, i) => (
                  <Image key={src.src} src={src} alt="" sizes="(min-width: 720px) 380px, 90vw" priority={i === 0} className={s.frame} style={{ "--i": i } as CSSProperties} />
                ))}
              </span>
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
