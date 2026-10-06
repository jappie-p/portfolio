import * as THREE from "three";
import { LIP } from "../../layout";
import type { Artwork } from "../artwork";
import type { Shared } from "../lights";
import type { Shades } from "../shadows";
import { makeConfetti } from "./confetti";
import { makeNeon } from "./neon";
import { makeRays, type Ray } from "./rays";
import { makeStreams, type Stream } from "./streams";
import { leftOf, spreadOf, type Breakout } from "./types";

/** The two outermost beams off the truss in the picture, carried on past
 *  the frame's top corners: warm white to the left, cool to the right. */
const RAYS: Ray[] = [
  { from: [-0.442, 0.368], heading: 2.326, length: 1.15, color: [0.085, 0.07, 0.046], phase: 0.15 },
  { from: [0.412, 0.368], heading: 0.901, length: 1.15, color: [0.052, 0.064, 0.095], phase: 0.62 },
];

/** The stage's light flowing out of the picture's right half, keeping
 *  clear of the copy beside the frame: magenta sweeping down to the floor
 *  between the plaque and the copy, violet looping up and out, cyan running
 *  off high to the right. */
const STREAMS: Stream[] = [
  { curve: [[0.3, -0.2, 0], [0.65, -0.4, 0.1], [0.55, -0.95, 0.5], [0.75, -1.5, 1.0]], color: [1.0, 0.16, 0.7], phase: 0.1 },
  { curve: [[0.2, -0.05, 0], [0.75, -0.25, 0.08], [0.95, 0.55, 0.45], [1.45, 0.25, 0.95]], color: [0.5, 0.18, 1.0], phase: 0.43 },
  { curve: [[0.35, 0.1, 0], [0.8, 0.45, 0.1], [1.05, 0.05, 0.3], [1.55, 0.45, 0.7]], color: [0.12, 0.6, 1.0], phase: 0.76 },
];

/** The sign: its cap height, where it hangs (metres from the picture's
 *  centre, standing off the frame's face) and how far it tips. */
const SIGN = { cap: 0.115, at: [-0.18, 0.8, 0.05] as const, tip: 0.07 };
const MAGENTA = new THREE.Color(1.0, 0.2, 0.78);

/** How much further out of the picture the confetti comes as the camera steps up. */
const SPREAD = 1.4;

/** The Festival print bursting out: its name in neon over the frame's top,
 *  ribbons of the stage's light flowing out into the room, confetti
 *  drifting out of the picture and over the frame, and two of the stage's
 *  beams spilling past its corners onto the wall. Stepping up to it, the
 *  confetti comes further out, then all of it goes before the project
 *  opens. */
export function makeFestival(shared: Shared, art: Artwork, shades: Shades["uniforms"]): Breakout {
  const face = art.work.depth / 2 - LIP;
  const confetti = makeConfetti(shared, art.uniforms, shades, 84, face);
  // just in front of the frame, so the light crosses its edge
  const rays = makeRays(shared, art.uniforms.uLevel, RAYS, face + LIP + 0.01);
  const streams = makeStreams(
    shared,
    art.uniforms.uLevel,
    STREAMS.map((s) => ({ ...s, curve: s.curve.map(([x, y, z]) => [x, y, face + z] as [number, number, number]) })),
    0.05,
  );
  const neon = makeNeon(shared, art.uniforms.uLevel, "FESTIVAL", MAGENTA, SIGN.cap);
  neon.mesh.position.set(SIGN.at[0], SIGN.at[1], face + LIP + SIGN.at[2]);
  neon.mesh.rotation.z = SIGN.tip;
  return {
    parts: [confetti.mesh, confetti.shadow, rays.mesh, streams.mesh, neon.mesh],
    textures: [neon.texture],
    update(_time, near) {
      const left = leftOf(near);
      confetti.spread.value = SPREAD * spreadOf(near);
      confetti.fade.value = left;
      rays.uFade.value = left;
      streams.uFade.value = left;
      neon.fade.value = left;
    },
    // in the narrow room the works hang closer and the copy sits right
    // above the frame: shorter rays and streams
    fit(narrow) {
      rays.uReach.value = narrow ? 0.6 : 1;
      streams.uReach.value = narrow ? 0.7 : 1;
    },
  };
}
