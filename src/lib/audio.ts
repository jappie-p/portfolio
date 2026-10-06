/** The site's sound, all through one Web Audio context: the how-to's chimes
 *  and the narrator, who is also Jarvis in the AI topic. It stays silent
 *  until someone clicks or presses a key (browsers keep audio locked until
 *  then), and it remembers when the reader turns it off. */

const KEY = "sound";
let ctx: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;
/** listens to whatever is being said, for things that move with the voice */
let analyser: AnalyserNode | null = null;
const wave = new Float32Array(512);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
/** Counts every new line or hush, so a line still loading never cuts off a newer one. */
let turn = 0;
const buffers = new Map<string, Promise<AudioBuffer>>();

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
  if (!on) hush();
  notify();
}

/** For useSyncExternalStore: told whenever a line starts or ends, or sound is turned on or off. */
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Whether a line is being said right now, and whether one has been yet on this visit. */
export const speaking = () => playing !== null;
let spoken = false;
export const hasSpoken = () => spoken;

/** How loud the line being said is right now, 0..1 (0 in silence). */
export function voiceLevel(): number {
  if (!analyser || !playing) return 0;
  analyser.getFloatTimeDomainData(wave);
  let sum = 0;
  for (const v of wave) sum += v * v;
  return Math.min(1, Math.sqrt(sum / wave.length) * 5);
}

/** The context, made on first use. */
export function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  return (ctx ??= new AudioContext());
}

/** Inside a click or key press: unlock the sound (Safari only allows that there). */
export function wakeAudio() {
  const ac = audio();
  if (ac?.state === "suspended") void ac.resume();
}

/** Whether sound can play right now without another click. */
export const awake = () => ctx?.state === "running";

/** Fetch and decode a recorded line once; later plays start at once. */
export function preload(url: string): Promise<AudioBuffer> {
  let b = buffers.get(url);
  if (!b) {
    const ac = audio();
    if (!ac) return Promise.reject(new Error("no audio"));
    b = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} ${url}`))))
      .then((data) => ac.decodeAudioData(data));
    b.catch(() => buffers.delete(url));
    buffers.set(url, b);
  }
  return b;
}

/** Stop whatever is being said. */
export function hush() {
  turn += 1;
  const was = playing;
  playing = null;
  was?.stop();
  if (was) notify();
}

/** Say a recorded line, over anything said before. Resolves true when it
 *  played to the end, false when it could not play or was cut off. */
export async function playClip(url: string): Promise<boolean> {
  hush();
  const mine = turn;
  const ac = audio();
  if (!ac || !soundOn() || ac.state !== "running") return false;
  const buffer = await preload(url);
  if (mine !== turn) return false;
  if (!analyser) {
    analyser = ac.createAnalyser();
    analyser.fftSize = wave.length;
    analyser.connect(ac.destination);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.connect(analyser);
  playing = src;
  spoken = true;
  src.start();
  notify();
  return new Promise((done) => {
    src.onended = () => {
      const whole = playing === src;
      if (whole) {
        playing = null;
        notify();
      }
      done(whole);
    };
  });
}
