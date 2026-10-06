// Who says which line, and how: one voice, two characters.
import type { VoiceLine } from "../../src/lib/voice-lines.ts";

/** "Portfolio gids": designed for this site, a warm young Dutch voice. */
export const VOICE = "7zlr5kPPCfyjVj2RYd5u";

export type Lang = "nl" | "en";

export type Character = {
  model: string;
  settings: Record<string, number | boolean>;
  /** the pace every line lands on, in syllables a second */
  pace: Record<Lang, number>;
  /** v3 ignores the speed setting: its takes are stretched onto the pace afterwards */
  stretch: boolean;
};

/** The how-to's guide is a game's mentor at full tilt: v3 acts out his stage
 *  directions, on its most expressive stability. Jarvis is an assistant who
 *  reports, calm and even. */
export const CAST = {
  guide: { model: "eleven_v3", settings: { stability: 0 }, pace: { nl: 3.5, en: 3.4 }, stretch: true },
  jarvis: {
    model: "eleven_multilingual_v2",
    settings: { stability: 0.58, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    pace: { nl: 3.1, en: 3.0 },
    stretch: false,
  },
} satisfies Record<string, Character>;

export const castFor = (line: VoiceLine): Character => (line.startsWith("tour-") ? CAST.guide : CAST.jarvis);

/** The guide's stage directions, one per sentence. Both languages share
 *  them: their lines are written sentence for sentence. */
const DIRECTIONS: Partial<Record<VoiceLine, string[]>> = {
  "tour-down-mouse": ["excited", "happily", "dramatically", "mischievously"],
  "tour-down-touch": ["excited", "happily", "dramatically", "mischievously"],
  "tour-side-mouse": ["amazed", "whispers", "excited"],
  "tour-side-touch": ["amazed", "whispers", "excited"],
  "tour-dive-mouse": ["laughs", "dramatically", "excited"],
  "tour-dive-touch": ["laughs", "dramatically", "excited"],
  "tour-done": ["triumphantly", "proudly", "curious", "warmly", "shouts"],
};

/** A line as the voice performs it: each sentence led by its direction. The
 *  captions show the line without them. */
export function performance(line: VoiceLine, text: string) {
  const cues = DIRECTIONS[line];
  if (!cues) return text;
  const sentences = (text.match(/[^.!?]+[.!?]+/g) ?? [text]).map((s) => s.trim());
  if (sentences.length !== cues.length) {
    throw new Error(`${line} has ${sentences.length} sentences and ${cues.length} directions: update DIRECTIONS in scripts/voice/cast.mts`);
  }
  return sentences.map((s, i) => `[${cues[i]}] ${s}`).join(" ");
}
