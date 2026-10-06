import * as THREE from "three";
import { LIP } from "../../layout";
import type { Artwork } from "../artwork";
import type { Shared } from "../lights";
import type { Shades } from "../shadows";
import { makeIvy } from "./ivy";
import { linkPixels } from "./linkSprite";
import { makePixels } from "./pixels";
import { makeRuins } from "./ruins";
import { makeTerrain, type Slope } from "./terrain";
import { leftOf, spreadOf, type Breakout } from "./types";
import { makeBlocks, type Blocks, type Pixels } from "./voxels";
import { HEART, SWORD } from "./zeldaArt";
import { FIREFLIES, FRAME_IVY, LINK, NARROW_SLOPE, ROOM_IVY, SLOPE, STONES, glowing, flowers } from "./zeldaSet";

/** A sprite floating out of the print: where (metres from the picture's
 *  centre, z out of it), its turn about x, y and z, a block's size, how many
 *  blocks thick it is, and a phase so no two move together. */
type Piece = { art: Pixels; at: [number, number, number]; turn: [number, number, number]; size: number; thick: number; phase: number };

/** The sword out over the frame's left side; hearts at its top right, a
 *  pair come out of the picture's corner and a pair off the frame beside it. */
const PIECES: Piece[] = [
  { art: SWORD, at: [-0.76, 0.36, 0.16], turn: [0.16, -0.3, 0.9], size: 0.03, thick: 2, phase: 0.1 },
  { art: HEART, at: [0.4, 0.4, 0.08], turn: [0.06, 0.18, -0.08], size: 0.019, thick: 2, phase: 0.37 },
  { art: HEART, at: [0.55, 0.39, 0.11], turn: [-0.05, 0.12, 0.06], size: 0.019, thick: 2, phase: 0.52 },
  { art: HEART, at: [0.8, 0.27, 0.18], turn: [-0.1, -0.26, 0.1], size: 0.021, thick: 2, phase: 0.68 },
  { art: HEART, at: [0.95, 0.23, 0.24], turn: [0.16, -0.24, -0.12], size: 0.021, thick: 2, phase: 0.83 },
];

/** How much further out of the picture the pieces come as the camera steps up. */
const SPREAD = 1.6;

/** The Zelda print breaking out into the room. Crumbling stone stands round
 *  it, ivy grows over the frame and up the wall, and the game's grass pours
 *  out of the picture's foot as a slope of blocks down to the floor, Link
 *  standing on it, flowers and glowing blocks in the grass and fireflies in
 *  the air. The sword juts out over the frame's left side and hearts float
 *  off its top right corner. Stepping up to it, the pieces come further out,
 *  then go (and so does Link) before the project opens. */
export function makeZelda(shared: Shared, art: Artwork, shades: Shades["uniforms"]): Breakout {
  const work = art.uniforms.uSpot.value - 1;
  const face = art.work.depth / 2 - LIP;
  const blocks = makeBlocks(shared, art.uniforms, shades, PIECES.map((p) => p.art), []);
  // the group's origin sits at the frame's middle, half its depth off the wall
  const toFrame = new THREE.Vector3(0, -art.work.y, -art.work.depth / 2);
  const frameIvy = makeIvy(
    shared,
    FRAME_IVY.map((v) => ({ ...v, path: v.path.map(([x, y, z]) => [x + toFrame.x, y + toFrame.y, z + toFrame.z] as const) })),
  );
  const roomIvy = makeIvy(shared, ROOM_IVY);
  const ruins = makeRuins(shared, shades, work, STONES);
  // the slope of blocks, the flowers and glowing blocks in its grass and the
  // fireflies over it, once for each shape of room
  const slope = (shape: Slope) => {
    const terrain = makeTerrain(shared, shades, work, shape, art.uniforms.uLevel);
    const lamps = glowing(terrain.tops);
    terrain.light(lamps);
    const pixels = makePixels(shared, [...flowers(terrain.tops), ...lamps, ...FIREFLIES], art.uniforms.uLevel);
    const group = new THREE.Group();
    group.add(terrain.mesh, terrain.shadow, pixels.mesh, pixels.glow);
    return { group, tops: terrain.tops, fade: pixels.fade };
  };
  const wide = slope(SLOPE);
  const narrow = slope(NARROW_SLOPE);
  narrow.group.visible = false;
  const set = new THREE.Group();
  set.add(ruins.mesh, ruins.shadow, wide.group, narrow.group, roomIvy.mesh);

  // Link, once his sprite is in: standing on the slope, turned a little to the entrance
  let link: Blocks | null = null;
  let waiting = true;
  linkPixels()
    .then((sprite) => {
      link = makeBlocks(shared, art.uniforms, shades, [sprite], []);
      // the column nearest his spot along the floor (under the picture, where
      // both slopes stand the same)
      const away = (t: THREE.Vector3) => (t.x - LINK.near.x) ** 2 + (t.z - LINK.near.z) ** 2;
      const top = wide.tops.reduce((best, t) => (away(t) < away(best) ? t : best));
      const h = sprite.rows.length * LINK.size;
      link.poses[0].compose(
        new THREE.Vector3(top.x, top.y + h / 2, top.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, LINK.turn, 0)),
        new THREE.Vector3(LINK.size, LINK.size, LINK.size * LINK.thick),
      );
      set.add(link.mesh, link.shadow);
    })
    .catch(() => {})
    .finally(() => (waiting = false));

  const at = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const size = new THREE.Vector3();
  return {
    parts: [blocks.mesh, blocks.shadow, frameIvy.mesh],
    set: [set],
    loading: () => waiting,
    update(time, near) {
      const spread = SPREAD * spreadOf(near);
      const left = leftOf(near);
      PIECES.forEach((p, i) => {
        const w = time * 0.5 + p.phase * 6.2832;
        const breathe = 0.85 + 0.15 * Math.sin(time * 0.31 + p.phase * 6.2832);
        // each a little more or less eager than the next
        const out = 1 + spread * (0.7 + 0.6 * p.phase);
        at.set(p.at[0] + Math.sin(w * 0.83) * 0.006, p.at[1] + Math.sin(w * 1.17 + 1) * 0.009, face + p.at[2] * breathe * out);
        e.set(p.turn[0] + Math.sin(w * 0.71) * 0.07, p.turn[1] + Math.sin(w * 0.93 + 2) * 0.1, p.turn[2] + Math.sin(w * 0.59 + 4) * 0.05);
        blocks.poses[i].compose(at, q.setFromEuler(e), size.set(p.size, p.size, p.size * p.thick));
      });
      blocks.spread.value = spread;
      blocks.fade.value = left;
      frameIvy.fade.value = left;
      wide.fade.value = narrow.fade.value = left;
      if (link) link.fade.value = left;
    },
    fit(tight) {
      // the narrow room hangs the works closer: its slope comes down sooner
      wide.group.visible = !tight;
      narrow.group.visible = tight;
    },
  };
}
