import type { Dictionary } from "../i18n/types";
import type { Locale } from "../i18n/useT";

/** Every line the narrator speaks: the how-to's steps, then Jarvis's
 *  chapters in the AI topic. Recorded by `npm run voice` (scripts/voice.mts). */
export const VOICE_LINES = ["tour-down", "tour-side", "tour-dive", "tour-done", "ai-cover", "ai-jarvis", "ai-gotoguy"] as const;
export type VoiceLine = (typeof VOICE_LINES)[number];

/** Bump after recording again, so browsers fetch the new takes. */
export const VOICE_VERSION = 1;

/** What each line says, in a dictionary's language (the captions show the same words). */
export function lineTexts(t: Dictionary): Record<VoiceLine, string> {
  return {
    "tour-down": t.tour.down.say,
    "tour-side": t.tour.side.say,
    "tour-dive": t.tour.dive.say,
    "tour-done": `${t.tour.done.title} ${t.tour.done.say}`,
    "ai-cover": t.voice.ai.cover,
    "ai-jarvis": t.voice.ai.jarvis,
    "ai-gotoguy": t.voice.ai.gotoguy,
  };
}

/** Where a line's recording is served, under the site's base path. */
export const lineUrl = (base: string, locale: Locale, line: VoiceLine) => `${base}/voice/${locale}/${line}.mp3?v=${VOICE_VERSION}`;
