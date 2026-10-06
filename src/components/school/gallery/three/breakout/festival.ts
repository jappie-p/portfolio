import * as THREE from "three";
import { LIP, outerH } from "../../layout";
import type { Artwork } from "../artwork";
import type { Shared } from "../lights";
import type { Shades } from "../shadows";
import { makeConfetti } from "./confetti";
import { makeNeon } from "./neon";
import { makeRays, type Ray } from "./rays";
import { makeStreams, type Stream } from "./streams";
import { leftOf, spreadOf, type Breakout } from "./types";

/** The two outermost beams off the truss in the picture, carried on past
 *  the frame's top corners in the stage's colours: magenta to the left,
 *  violet to the right. */
const RAYS: Ray[] = [
  { from: [-0.442, 0.368], heading: 2.326, length: 1.15, color: [0.1, 0.032, 0.08], phase: 0.15 },
  { from: [0.412, 0.368], heading: 0.901, length: 1.15, color: [0.06, 0.036, 0.12], phase: 0.62 },
];

/** The stage's light flowing out of the picture's right half into the
 *  room, in three bands of two ribbons each, keeping clear of the copy
 *  beside the frame: magenta and blue pouring down to the floor between
 *  the plaque and the copy; violet and pink dipping under the copy and
 *  sweeping out along the floor; violet and cyan rising out over it and
 *  thinning away before the next work. */
const STREAMS: Stream[] = [
  { curve: [[0.22, -0.3, 0], [0.6, -0.48, 0.1], [0.52, -0.98, 0.5], [0.72, -1.47, 1.0]], color: [1.0, 0.14, 0.68], phase: 0.1, wide: 1.2 },
  { curve: [[0.3, -0.38, 0], [0.62, -0.62, 0.14], [0.45, -1.08, 0.52], [0.52, -1.47, 0.95]], color: [0.32, 0.3, 1.0], phase: 0.58, wide: 0.7 },
  { curve: [[0.4, -0.36, 0], [0.8, -0.72, 0.12], [1.05, -1.1, 0.42], [1.62, -1.46, 0.85]], color: [0.72, 0.16, 1.0], phase: 0.34, wide: 1.1 },
  { curve: [[0.46, -0.3, 0], [0.86, -0.8, 0.1], [1.12, -1.08, 0.36], [1.8, -1.34, 0.7]], color: [1.0, 0.24, 0.8], phase: 0.81, wide: 0.7 },
  { curve: [[0.3, 0.02, 0], [0.75, -0.2, 0.08], [0.95, 0.55, 0.45], [1.42, 0.28, 0.92]], color: [0.58, 0.16, 1.0], phase: 0.43, wide: 1.0 },
  { curve: [[0.4, 0.14, 0], [0.82, 0.45, 0.1], [1.05, 0.08, 0.3], [1.52, 0.46, 0.7]], color: [0.12, 0.55, 1.0], phase: 0.76, wide: 0.75 },
];

/** The sign: its cap height, where its board hangs (its left end over the
 *  frame's left edge, its foot just clear of the frame's top, flat on the
 *  wall), and how far it is out of true, hung by hand. */
const SIGN = { cap: 0.19, left: -0.8, clear: 0.02, tip: 0.018 };
/** In the narrow room the copy sits right above the frame: the sign comes
 *  down over the frame's top bar, smaller, hung on the frame's face. */
const NARROW_SIGN = { size: 0.62, drop: 0.2, out: 0.004 };
const WIDE_SIGN = { size: 1, drop: 0, out: 0 };
const MAGENTA = new THREE.Color(1.0, 0.2, 0.78);

/** How much further out of the picture the confetti comes as the camera steps up. */
const SPREAD = 1.4;

/** The Festival print bursting out: its name in neon over the frame's top,
 *  ribbons of the stage's light flowing out into the room, confetti
 *  drifting out of the picture and over the frame on the way to the right,
 *  and two of the stage's beams spilling past its corners onto the wall.
 *  Stepping up to it, the confetti comes further out, then all of it goes
 *  before the project opens. */
export function makeFestival(shared: Shared, art: Artwork, shades: Shades["uniforms"]): Breakout {
  const face = art.work.depth / 2 - LIP;
  const confetti = makeConfetti(shared, art.uniforms, shades, 128, face);
  // just in front of the frame, so the light crosses its edge
  const rays = makeRays(shared, art.uniforms.uLevel, RAYS, face + LIP + 0.01);
  const streams = makeStreams(
    shared,
    art.uniforms.uLevel,
    STREAMS.map((s) => ({ ...s, curve: s.curve.map(([x, y, z]) => [x, y, face + z] as [number, number, number]) })),
    0.085,
  );
  const neon = makeNeon(shared, art.uniforms.uLevel, "FESTIVAL", MAGENTA, SIGN.cap);
  neon.group.rotation.z = SIGN.tip;
  const top = outerH(art.work) / 2;
  const hangSign = (narrow: boolean) => {
    const n = narrow ? NARROW_SIGN : WIDE_SIGN;
    const half = neon.size.clone().multiplyScalar(n.size / 2);
    // on short standoffs off the wall, or over the frame on its face
    const z = narrow ? art.work.depth / 2 + n.out : -art.work.depth / 2 + 0.012;
    neon.group.position.set(SIGN.left * n.size + half.x, top + SIGN.clear + half.y - n.drop, z);
    neon.group.scale.setScalar(n.size);
  };
  hangSign(false);
  return {
    parts: [confetti.mesh, confetti.shadow, rays.mesh, streams.mesh, neon.group],
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
    // above the frame: shorter rays and streams, a smaller sign
    fit(narrow) {
      rays.uReach.value = narrow ? 0.6 : 1;
      streams.uReach.value = narrow ? 0.7 : 1;
      hangSign(narrow);
    },
  };
}
