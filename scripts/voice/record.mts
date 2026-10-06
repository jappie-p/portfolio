// Records the narrator's lines with ElevenLabs: the how-to's guide on the
// front door and Jarvis in the AI topic (see cast.mts), in both languages,
// straight from the dictionaries into public/voice/<lang>/<line>.mp3.
//
// Every take is heard back, and one that drops or garbles a word is never
// kept. Every line lands on its character's pace, in syllables a second.
// The guide (v3, which ignores speed) is taken from fresh seeds until a take
// needs little stretching onto the pace, and then stretched: the less a take
// is stretched, the more of its performance survives. Jarvis is taken again
// from the same seed at a corrected speed (a fresh seed would move the pace
// more than the speed does). Bump VOICE_VERSION in src/lib/voice-lines.ts
// afterwards, so browsers fetch the new takes.
//
//   ELEVENLABS_API_KEY=... npm run voice                          every line
//   ELEVENLABS_API_KEY=... npm run voice -- tour-done nl:ai-cover  just these
//
// Needs ffmpeg and Rubber Band (brew install ffmpeg rubberband). The key
// comes from the environment only; never write it into the repo.
import { mkdir, writeFile } from "node:fs/promises";
import { en } from "../../src/i18n/en.ts";
import { nl } from "../../src/i18n/nl.ts";
import { lineTexts, VOICE_LINES, type VoiceLine } from "../../src/lib/voice-lines.ts";
import { heard, take } from "./api.mts";
import { canStretch, seconds, stretch } from "./audio.mts";
import { castFor, performance, type Character, type Lang } from "./cast.mts";
import { misses, plain, syllables } from "./check.mts";

/** How close to its pace a take has to land, how many takes a line gets,
 *  and how much a performance may be stretched before another take is tried. */
const CLOSE = 0.06;
const TAKES = 5;
const MAX_STRETCH = 1.2;
/** The slowest and fastest speed ElevenLabs takes. */
const SPEED = [0.7, 1.2] as const;
const LANGS = [
  ["nl", nl],
  ["en", en],
] as const;

if (!process.env.ELEVENLABS_API_KEY) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}
if (!canStretch()) {
  console.error("Install ffmpeg and Rubber Band first: brew install ffmpeg rubberband");
  process.exit(1);
}

// which lines: all of them, or the ones named (a line in both languages, or lang:line)
const picks = process.argv.slice(2).map((arg) => {
  const [lang, line] = arg.includes(":") ? arg.split(":") : [undefined, arg];
  if (!VOICE_LINES.includes(line as VoiceLine) || (lang && !LANGS.some(([l]) => l === lang))) {
    console.error(`Unknown line "${arg}". Lines: ${VOICE_LINES.join(", ")}`);
    process.exit(1);
  }
  return { lang, line };
});
const wanted = (lang: Lang, line: VoiceLine) => !picks.length || picks.some((p) => p.line === line && (!p.lang || p.lang === lang));

type Line = { lang: Lang; name: string; who: Character; spoken: string; want: string[]; size: number; target: number };
type Kept = { audio: Uint8Array<ArrayBuffer>; pace: number };

/** A take heard back: how many words it got wrong, logged with what was heard. */
async function check(l: Line, audio: Uint8Array<ArrayBuffer>, what: string) {
  const got = await heard(audio, l.lang);
  const off = misses(l.want, plain(got));
  console.log(`  ${l.name} ${what}, ${off} word${off === 1 ? "" : "s"} off${off ? `, heard "${got}"` : ""}`);
  return off;
}

/** The guide: fresh seeds until a clean take needs little stretching, then
 *  the least stretched one, stretched onto the pace. */
async function stretched(l: Line): Promise<Kept | null> {
  let best: { audio: Uint8Array<ArrayBuffer>; ratio: number } | null = null;
  for (let n = 1, seed = 1; n <= TAKES; n++, seed++) {
    const audio = await take(l.who, l.spoken, seed);
    const ratio = l.size / seconds(audio) / l.target;
    // one wrong word is one too many: "jump" heard as "job" is a different line
    if ((await check(l, audio, `take ${n}: seed ${seed}, needs stretching x${ratio.toFixed(2)}`)) > 0) continue;
    if (!best || Math.abs(Math.log(ratio)) < Math.abs(Math.log(best.ratio))) best = { audio, ratio };
    if (Math.abs(Math.log(ratio)) <= Math.log(MAX_STRETCH)) break;
  }
  if (!best) return null;
  const audio = stretch(best.audio, best.ratio);
  // the stretched take is heard once more: it is the one people hear
  if ((await check(l, audio, `kept take, stretched x${best.ratio.toFixed(2)}`)) > 0) return null;
  return { audio, pace: l.size / seconds(audio) };
}

/** Jarvis: retaken from the same seed at a corrected speed until on pace. */
async function paced(l: Line): Promise<Kept | null> {
  let best: Kept | null = null;
  let speed = 0.88;
  let seed = 1;
  for (let n = 1; n <= TAKES; n++) {
    const audio = await take(l.who, l.spoken, seed, speed);
    const pace = l.size / seconds(audio);
    if ((await check(l, audio, `take ${n}: seed ${seed}, speed ${speed.toFixed(2)}, ${pace.toFixed(2)} syl/s`)) > 0) {
      seed += 1;
      continue;
    }
    if (!best || Math.abs(pace - l.target) < Math.abs(best.pace - l.target)) best = { audio, pace };
    if (Math.abs(best.pace / l.target - 1) <= CLOSE) break;
    // at the end of the speed range, only another seed can move the pace
    const next = Math.min(SPEED[1], Math.max(SPEED[0], (speed * l.target) / pace));
    if (Math.abs(next - speed) < 0.005) seed += 1;
    speed = next;
  }
  return best;
}

let failed = false;
for (const [lang, dict] of LANGS) {
  const texts = lineTexts(dict);
  await mkdir(`public/voice/${lang}`, { recursive: true });
  for (const line of VOICE_LINES) {
    if (!wanted(lang, line)) continue;
    const who = castFor(line);
    const want = plain(texts[line]);
    const l: Line = { lang, name: `${lang}/${line}`, who, spoken: performance(line, texts[line]), want, size: syllables(want, lang), target: who.pace[lang] };
    const kept = who.stretch ? await stretched(l) : await paced(l);
    if (!kept) {
      console.error(`${l.name}: no clean take in ${TAKES}, kept the old file`);
      failed = true;
      continue;
    }
    await writeFile(`public/voice/${lang}/${line}.mp3`, kept.audio);
    console.log(`${l.name}.mp3  ${kept.pace.toFixed(2)} syl/s (aim ${l.target})  ${(kept.audio.length / 1024).toFixed(0)} KB`);
  }
}
if (failed) process.exit(1);
