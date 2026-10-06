"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { awake, hasSpoken, hush, playClip, setSound, soundOn, speaking, subscribe, wakeAudio } from "@/lib/audio";
import { TOPIC_INDEX } from "@/lib/chapters";
import { useJourney } from "@/lib/store";
import { lineUrl, type VoiceLine } from "@/lib/voice-lines";
import { BASE_PATH } from "@/data/site";
import { useLocale, useT } from "@/i18n/useT";
import s from "./jarvis-voice.module.css";

/** What Jarvis says on each of the topic's three chapters, in order. */
const LINES: VoiceLine[] = ["ai-cover", "ai-jarvis", "ai-gotoguy"];

/**
 * Jarvis speaks in the AI topic, in the same voice as the front door's
 * how-to: a line per chapter as you reach it, once each, while sound is on
 * and the page has been touched (browsers keep audio locked till then).
 * Until then, and whenever it is muted, the button offers to let him speak.
 */
export function JarvisVoice() {
  const t = useT();
  const v = t.voice;
  const locale = useLocale((st) => st.locale);
  const topic = useJourney((st) => st.topic);
  const project = useJourney((st) => st.project);
  const on = useSyncExternalStore(subscribe, soundOn, () => false);
  const talking = useSyncExternalStore(subscribe, speaking, () => false);
  const spoke = useSyncExternalStore(subscribe, hasSpoken, () => false);
  const heard = useRef(new Set<string>());
  const line = topic === TOPIC_INDEX.ai ? LINES[Math.min(project, LINES.length - 1)] : null;

  const say = (l: VoiceLine) => {
    heard.current.add(`${locale}/${l}`);
    void playClip(lineUrl(BASE_PATH, locale, l));
  };

  // each chapter once, as you reach it; quiet again once you leave the topic
  useEffect(() => {
    if (!line) return void (speaking() && hush());
    if (!on || !awake() || heard.current.has(`${locale}/${line}`)) return;
    say(line);
    // `say` only reads what is in the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, on, locale]);

  const toggle = () => {
    if (on && talking) return setSound(false);
    setSound(true);
    wakeAudio();
    if (line) say(line);
  };

  return (
    <button type="button" className={s.voice} onClick={toggle} aria-label={on && talking ? v.mute : v.listen} data-talking={talking || undefined} data-invite={!talking && (!on || !spoke) ? true : undefined}>
      <span aria-hidden className={s.wave}>
        <i />
        <i />
        <i />
        <i />
      </span>
      {v.name}
    </button>
  );
}
