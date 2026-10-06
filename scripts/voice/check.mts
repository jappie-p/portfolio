// Holding a take up against its line: its words, and the syllables that set its pace.
import type { Lang } from "./cast.mts";

/** A line as plain words: lower case, no accents or punctuation. */
export const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/go2guy/g, "go to guy")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Syllables, roughly: a group of vowels each, less an English silent final
 *  e. Pace counts these, not words: "met me mee" is three words but no
 *  longer than "agenda". */
export const syllables = (ws: string[], lang: Lang) =>
  ws.reduce((n, w) => n + Math.max(1, ((lang === "en" ? w.replace(/([^aeiouy])e$/, "$1") : w).match(/[aeiouy]+/g) ?? []).length), 0);

/** Sounds that are performance, not words: a laugh heard as "haha", an "aha". */
const INTERJECTIONS = new Set(["ha", "haha", "hahaha", "aha", "oh", "ooh", "hm", "hmm"]);

/** Words as speech-to-text may spell them: without the interjections, and
 *  doubled letters single ("scroll", and the Dutch "scrol"). */
const comparable = (ws: string[]) => ws.filter((w) => !INTERJECTIONS.has(w)).map((w) => w.replace(/(.)\1+/g, "$1"));

/** How many words a take got wrong: dropped, added or swapped. Words that
 *  only run together or split apart ("in to", "into") are no error. */
export function misses(line: string[], take: string[]) {
  const want = comparable(line);
  const got = comparable(take);
  if (want.join("") === got.join("")) return 0;
  let row = Array.from({ length: got.length + 1 }, (_, j) => j);
  for (let i = 1; i <= want.length; i++) {
    const next = [i];
    for (let j = 1; j <= got.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (want[i - 1] === got[j - 1] ? 0 : 1));
    row = next;
  }
  return row[got.length];
}
