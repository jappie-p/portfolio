/** The how-to's little sounds, made on the spot with Web Audio (no files):
 *  a soft two-note chime when a step is done, a tick when the map moves, a
 *  rising sweep on the way in. Quiet, and off once the reader turns it off. */

export type Cue = "done" | "move" | "enter";

const KEY = "tour-sound";
let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // private mode: it stays as it is for this visit
  }
}

/** One soft tone: a quick attack and a long, gentle fall. */
function tone(ac: AudioContext, at: number, freq: number, len: number, level: number, type: OscillatorType = "sine") {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(level, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + len + 0.05);
}

/** Play a cue. Only after a click or key press (browsers keep audio
 *  locked until then), and never when the reader has turned sound off. */
export function play(cue: Cue) {
  if (!soundOn() || typeof window === "undefined" || !("AudioContext" in window)) return;
  ctx ??= new AudioContext();
  const ac = ctx;
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime + 0.01;
  if (cue === "done") {
    tone(ac, t, 659.25, 0.5, 0.05);
    tone(ac, t + 0.09, 987.77, 0.7, 0.045);
  } else if (cue === "move") {
    tone(ac, t, 392, 0.16, 0.035, "triangle");
  } else {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.7);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 1);
  }
}
