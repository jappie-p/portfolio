// Records the narrator's lines with ElevenLabs: the how-to on the front
// door, and Jarvis in the AI topic, in both languages, straight from the
// dictionaries into public/voice/<lang>/<line>.mp3. Bump VOICE_VERSION in
// src/lib/voice-lines.ts afterwards, so browsers fetch the new takes.
//
//   ELEVENLABS_API_KEY=... npm run voice
//
// The key comes from the environment only; never write it into the repo.
import { mkdir, writeFile } from "node:fs/promises";
import { en } from "../src/i18n/en.ts";
import { nl } from "../src/i18n/nl.ts";
import { lineTexts, VOICE_LINES } from "../src/lib/voice-lines.ts";

/** "Portfolio gids": designed for this site, a warm young Dutch guide. */
const VOICE = "7zlr5kPPCfyjVj2RYd5u";
const MODEL = "eleven_multilingual_v2";
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true };

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}

for (const [lang, dict] of [
  ["nl", nl],
  ["en", en],
] as const) {
  const texts = lineTexts(dict);
  await mkdir(`public/voice/${lang}`, { recursive: true });
  for (const line of VOICE_LINES) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_96`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts[line], model_id: MODEL, voice_settings: SETTINGS }),
    });
    if (!res.ok) {
      console.error(`${lang}/${line}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      process.exit(1);
    }
    const audio = Buffer.from(await res.arrayBuffer());
    await writeFile(`public/voice/${lang}/${line}.mp3`, audio);
    console.log(`${lang}/${line}.mp3  ${(audio.length / 1024).toFixed(0)} KB  "${texts[line].slice(0, 48)}..."`);
  }
}
