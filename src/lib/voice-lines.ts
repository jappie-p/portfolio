import type { Dictionary } from "../i18n/types";
import type { Locale } from "../i18n/useT";

/** Every line the narrator speaks: the how-to's steps, then Jarvis's
 *  chapters in the AI topic. Recorded by `npm run voice` (scripts/voice/record.mts). */
export const VOICE_LINES = [
  "tour-down-mouse",
  "tour-down-touch",
  "tour-side-mouse",
  "tour-side-touch",
  "tour-dive-mouse",
  "tour-dive-touch",
  "tour-done",
  "ai-cover",
  "ai-jarvis",
  "ai-gotoguy",
] as const;
export type VoiceLine = (typeof VOICE_LINES)[number];

/** Bump after recording again, so browsers fetch the new takes. */
export const VOICE_VERSION = 6;

/** What each line says, in a dictionary's language (the captions show the same words). */
export function lineTexts(t: Dictionary): Record<VoiceLine, string> {
  return {
    "tour-down-mouse": t.tour.down.sayMouse,
    "tour-down-touch": t.tour.down.sayTouch,
    "tour-side-mouse": t.tour.side.sayMouse,
    "tour-side-touch": t.tour.side.sayTouch,
    "tour-dive-mouse": t.tour.dive.sayMouse,
    "tour-dive-touch": t.tour.dive.sayTouch,
    "tour-done": `${t.tour.done.title} ${t.tour.done.say}`,
    "ai-cover": t.voice.ai.cover,
    "ai-jarvis": t.voice.ai.jarvis,
    "ai-gotoguy": t.voice.ai.gotoguy,
  };
}

/** Where a line's recording is served, under the site's base path. */
export const lineUrl = (base: string, locale: Locale, line: VoiceLine) => `${base}/voice/${locale}/${line}.mp3?v=${VOICE_VERSION}`;
