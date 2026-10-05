import type { Locale } from "@/i18n/useT";
import type { Step } from "./Tour";
import { soundOn } from "./sound";

/** The narrator's lines as recorded files, per language and step. Empty
 *  until a voice is recorded: the captions carry the words meanwhile. */
const LINES: Partial<Record<Locale, Partial<Record<Step, string>>>> = {};

let current: HTMLAudioElement | null = null;

/** Speak a step's line, if it has been recorded and sound is on. */
export function speak(locale: Locale, step: Step) {
  current?.pause();
  current = null;
  const src = LINES[locale]?.[step];
  if (!src || !soundOn()) return;
  current = new Audio(src);
  void current.play().catch(() => {});
}
