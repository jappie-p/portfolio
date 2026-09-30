import { WALL } from "./layout";
import { hexPitch } from "./hex";
import { clamp01, lerp } from "./scene-math";

// Game-feel timing, as pure functions: salvo rhythm, hit envelopes, camera
// trauma and the power-on sweep. The shaders mirror the same shapes.

/** Flight time of a salvo from off-screen to the wall, in seconds. */
export const TRAVEL = 0.55;

/** Seconds between salvos for one flood: faster as the attack grows. `jitter` is 0..1. */
export function salvoPeriod(attack: number, flood: number, jitter: number): number {
  return (lerp(3.4, 1.4, clamp01(attack)) + flood * 0.35) * (0.85 + jitter * 0.3);
}

/** A hit flashes instantly and fades fast. */
export function hitEnvelope(since: number): number {
  return since < 0 ? 0 : Math.exp(-since * 5);
}

/** Camera trauma: hits add to it, it bleeds off over time, and the shake
 *  grows with its square, so small hits barely move and big ones kick. */
export const addTrauma = (trauma: number, amount: number) => Math.min(1, trauma + amount);
export const decayTrauma = (trauma: number, dt: number) => Math.max(0, trauma - dt * 1.3);
export const shakeAmount = (trauma: number) => trauma * trauma;

/** The firewall throws a shockwave this often while it is pushing back. */
export const PULSE_PERIOD = 2.2;

/** Power-on sequence, in seconds after the section comes into view. */
export const BOOT = {
  /** how fast the light front sweeps along the wall (world units per second) */
  sweepSpeed: 12,
  /** the HUD screens start flickering on */
  panelsAt: 0.45,
  panelStagger: 0.12,
  panelDuration: 0.45,
  /** traffic and floods come up once the wall is lit */
  powerAt: 1.0,
  powerDuration: 0.6,
  /** the first salvo lands */
  firstHitAt: 1.9,
} as const;

const PITCH = hexPitch(WALL.cellR, WALL.gap).x;
const WALL_START = WALL.cols[0] * PITCH - 1.2;
const WALL_END = WALL.cols[1] * PITCH + 1.2;

/** Position of the power-on light front along the wall (s), `since` seconds after boot. */
export function bootFront(since: number): number {
  if (since < 0) return WALL_START - 8;
  return Math.min(WALL_START + since * BOOT.sweepSpeed, WALL_END + 8);
}

/** 0..1 ramp that turns the traffic and floods on after the wall is lit. */
export function bootPower(since: number): number {
  return clamp01((since - BOOT.powerAt) / BOOT.powerDuration);
}

/** 0..1 open state of the i-th HUD screen. */
export function panelOpen(since: number, order: number): number {
  return clamp01((since - BOOT.panelsAt - order * BOOT.panelStagger) / BOOT.panelDuration);
}

/** Ease out with a small overshoot, for things that snap open. */
export function easeOutBack(t: number): number {
  const c = 1.7;
  const x = t - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}
