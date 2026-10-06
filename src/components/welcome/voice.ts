import type { Locale } from "@/i18n/useT";
import { hush as hushClip, playClip, soundOn } from "@/lib/audio";
import { lineUrl, type VoiceLine } from "@/lib/voice-lines";
import { BASE_PATH } from "@/data/site";

const LANG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB" };

const speech = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

/** Which line is the latest, so a fallback arriving late never speaks an old one. */
let latest = 0;

/** The best voice the browser has for a language: an enhanced or neural
 *  one, else Google's, else the system's own. Only for when a recording
 *  cannot play. */
function voiceFor(locale: Locale): SpeechSynthesisVoice | null {
  const lang = locale === "nl" ? "nl" : "en";
  const rank = (v: SpeechSynthesisVoice) => (/premium|enhanced|natural|neural/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : 2);
  const fits = (speech()?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().startsWith(lang));
  return fits.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** Hush whatever the narrator is saying. */
export function hush() {
  latest += 1;
  hushClip();
  speech()?.cancel();
}

/** Called from the click that opens the how-to: Safari wants speech to
 *  start inside that very click (for the fallback voice), and it starts
 *  the browser's voice list loading. */
export function wakeVoice() {
  const s = speech();
  if (!s) return;
  s.getVoices();
  const quiet = new SpeechSynthesisUtterance(" ");
  quiet.volume = 0;
  s.speak(quiet);
}

/** The browser reads `text` itself, when the recording will not play. */
function readAloud(locale: Locale, text: string, mine: number) {
  const s = speech();
  if (!s) return;
  let said = false;
  const say = () => {
    if (said || mine !== latest) return;
    said = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG[locale];
    const voice = voiceFor(locale);
    if (voice) u.voice = voice;
    s.speak(u);
  };
  // Chrome fills its voice list a moment after the page asks for it
  if (s.getVoices().length) return say();
  s.addEventListener("voiceschanged", say, { once: true });
  window.setTimeout(say, 500);
}

/** Speak a line: the narrator's recording (see scripts/voice/record.mts), or, if
 *  that cannot play, the same words in the browser's voice. Nothing when
 *  the reader has turned sound off. */
export function speak(locale: Locale, line: VoiceLine, text: string) {
  hush();
  if (!soundOn()) return;
  const mine = latest;
  playClip(lineUrl(BASE_PATH, locale, line)).then(
    (played) => !played && mine === latest && readAloud(locale, text, mine),
    () => mine === latest && readAloud(locale, text, mine),
  );
}
