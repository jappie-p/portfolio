// One clock drives everything: 120 bpm, phrases of 16 beats. The drop lands
// on beat 2 of every phrase (a second after the panel comes alive), with the
// big confetti burst; beat 10 gets a smaller one.

export const BPM = 120;
export const PHRASE = 16;
export const DROP = 2;
export const PUFF = 10;

export const toBeat = (t: number) => (t * BPM) / 60;

/** A sharp hit on the beat that dies away: 1 at phase 0. */
export const kick = (phase: number, k = 6) => Math.exp(-k * phase);

/** How hard the last drop still rings: 1 on the drop, fading over a few beats. */
export function dropLevel(beat: number): number {
  if (beat < DROP) return 0;
  const since = (beat - DROP) % PHRASE;
  return Math.exp(-since * 0.9);
}

/** 0..1 for the few beats after a drop, when the crowd jumps higher. */
export function hype(beat: number): number {
  if (beat < DROP) return 0;
  const since = (beat - DROP) % PHRASE;
  return since < 6 ? 1 - since / 6 : 0;
}
