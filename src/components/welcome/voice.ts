import type { Locale } from "@/i18n/useT";
import type { Step } from "./Tour";
import { soundOn } from "./sound";

/** The narrator's lines as recorded files, per language and step. While
 *  one is missing, the browser's own voice reads the caption instead. */
const LINES: Partial<Record<Locale, Partial<Record<Step, string>>>> = {};

const LANG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB" };

let current: HTMLAudioElement | null = null;
/** Which line is the latest, so a voice list arriving late never speaks an old one. */
let latest = 0;

const speech = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

/** The best voice the browser has for a language: an enhanced or neural
 *  one, else Google's (Chrome's are decent), else the system's own. */
function voiceFor(locale: Locale): SpeechSynthesisVoice | null {
  const lang = locale === "nl" ? "nl" : "en";
  const rank = (v: SpeechSynthesisVoice) => (/premium|enhanced|natural|neural/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : 2) + (v.lang.toLowerCase().replace("_", "-") === LANG[locale].toLowerCase() ? 0 : 0.5);
  const fits = (speech()?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().startsWith(lang));
  return fits.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** Hush whatever the narrator is saying. */
export function hush() {
  latest += 1;
  current?.pause();
  current = null;
  speech()?.cancel();
}

/** Called from the click that opens the how-to: browsers only let a page
 *  speak once someone has interacted with it, and Safari wants the first
 *  word said inside that very click. It also starts the voice list loading. */
export function wakeVoice() {
  const s = speech();
  if (!s) return;
  s.getVoices();
  const quiet = new SpeechSynthesisUtterance(" ");
  quiet.volume = 0;
  s.speak(quiet);
}

/** Speak a step's line: its recording if there is one, else `text` in the
 *  browser's voice. Nothing when the reader has turned sound off. */
export function speak(locale: Locale, step: Step, text: string) {
  hush();
  if (!soundOn()) return;
  const src = LINES[locale]?.[step];
  if (src) {
    current = new Audio(src);
    void current.play().catch(() => {});
    return;
  }
  const s = speech();
  if (!s) return;
  const mine = latest;
  let said = false;
  const say = () => {
    if (said || mine !== latest) return;
    said = true;
    const line = new SpeechSynthesisUtterance(text);
    line.lang = LANG[locale];
    const voice = voiceFor(locale);
    if (voice) line.voice = voice;
    s.speak(line);
  };
  // Chrome fills its voice list a moment after the page asks for it
  if (s.getVoices().length) return say();
  s.addEventListener("voiceschanged", say, { once: true });
  window.setTimeout(say, 500);
}
