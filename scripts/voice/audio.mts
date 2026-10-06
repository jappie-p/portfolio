// A take's length, and stretching it onto a pace without changing its pitch.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Takes are mp3 at a constant 96 kbit/s: 12 000 bytes a second. */
export const seconds = (audio: Uint8Array) => audio.length / 12_000;

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });

/** Whether ffmpeg and Rubber Band are installed. */
export function canStretch() {
  try {
    run("ffmpeg", ["-version"]);
    run("rubberband", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

/** A take made `ratio` times as long at the same pitch, by Rubber Band's
 *  finer engine, back in the same mp3 format. */
export function stretch(audio: Uint8Array, ratio: number): Uint8Array<ArrayBuffer> {
  const dir = mkdtempSync(join(tmpdir(), "voice-"));
  const at = (name: string) => join(dir, name);
  try {
    writeFileSync(at("take.mp3"), audio);
    run("ffmpeg", ["-v", "error", "-i", at("take.mp3"), at("take.wav")]);
    run("rubberband", ["-3", "-q", "-t", ratio.toFixed(4), at("take.wav"), at("paced.wav")]);
    run("ffmpeg", ["-v", "error", "-i", at("paced.wav"), "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k", "-write_xing", "0", "-id3v2_version", "0", at("paced.mp3")]);
    return new Uint8Array(readFileSync(at("paced.mp3")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
