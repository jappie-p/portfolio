// The two ElevenLabs calls: a take of a line, and hearing a take back.
import { VOICE, type Character, type Lang } from "./cast.mts";

const API = "https://api.elevenlabs.io/v1";

async function call(path: string, init: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, ...init.headers } });
  if (!res.ok) {
    console.error(`${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    process.exit(1);
  }
  return res;
}

/** One take, as mp3 at a constant 96 kbit/s. Speed only where the model listens to it. */
export async function take(who: Character, text: string, seed: number, speed?: number) {
  const res = await call(`/text-to-speech/${VOICE}?output_format=mp3_44100_96`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: who.model, seed, voice_settings: speed ? { ...who.settings, speed } : who.settings }),
  });
  return new Uint8Array(await res.arrayBuffer());
}

/** What a take says, heard back by speech-to-text. A laugh is not a word. */
export async function heard(audio: Uint8Array<ArrayBuffer>, lang: Lang) {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", lang === "nl" ? "nld" : "eng");
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), "take.mp3");
  const res = await call("/speech-to-text", { method: "POST", body: form });
  return ((await res.json()) as { text: string }).text;
}
