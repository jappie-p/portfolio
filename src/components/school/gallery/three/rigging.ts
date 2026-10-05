import * as THREE from "three";
import type { Room } from "../layout";
import { makeBeam, type Beam } from "./beams";
import { makeDust } from "./dust";
import { makeFixtures, type Fixtures } from "./fixtures";
import type { Shared, Spot } from "./lights";
import type { FrameSlots } from "./wall";

/** How thick the haze is in each spot's beam: the title's wash and the small
 *  card's corner kept quiet, and all of it thinner in the narrow room, where
 *  the beams fall right behind the copy. */
const haze = (s: Spot, narrow: boolean) => (s.work < 0 ? 0.04 : s.work === 3 ? 0.07 : 0.24) * (narrow ? 0.42 : 1);

/** Everything the room's spots hang or throw: the track and its cans, the
 *  beams, the dust in them. Hung again whenever the room changes shape. */
export class Rigging {
  readonly group = new THREE.Group();
  private beams: Beam[] = [];
  private fixtures: Fixtures | null = null;
  private dust: ReturnType<typeof makeDust> | null = null;

  constructor(
    private readonly shared: Shared,
    private readonly slots: FrameSlots,
  ) {}

  hang(room: Room, spots: Spot[]) {
    this.clear();
    this.beams = spots.map((s) => makeBeam(this.shared, this.slots, s, haze(s, room.narrow)));
    this.dust = makeDust(this.shared, spots);
    const ends = room.works.map((w) => w.x);
    this.fixtures = makeFixtures(this.shared, spots, Math.min(...ends) - 9, Math.max(...ends) + 6);
    this.group.add(...this.beams.map((b) => b.mesh), this.dust.points, this.fixtures.group);
  }

  /** Each spot's level this frame: its beam and its lamp's glow follow it;
   *  `haze` thins the air in every beam at once (0..1). */
  light(level: number[], pixelsPerUnit: number, haze = 1) {
    this.beams.forEach((b, i) => b.color.set(1, 0.86, 0.7).multiplyScalar(b.base * (level[i] ?? 0) * haze));
    this.fixtures?.glows.forEach((g, i) => (g.level.value = level[i] ?? 0));
    if (this.dust) {
      this.dust.uPx.value = pixelsPerUnit;
      this.dust.uHaze.value = haze;
    }
  }

  clear() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh && !(o as THREE.Points).isPoints) return;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.group.clear();
  }
}
