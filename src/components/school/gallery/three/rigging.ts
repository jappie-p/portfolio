import * as THREE from "three";
import type { Room } from "../layout";
import { makeBeam, type Beam } from "./beams";
import { makeDust } from "./dust";
import { makeFixtures, type Fixtures } from "./fixtures";
import type { Shared, Spot } from "./lights";
import type { FrameSlots } from "./wall";

/** How visible each spot's beam is: the title's wash and the small card's
 *  spot faintest. */
const haze = (s: Spot) => (s.work < 0 ? 0.012 : s.work === 3 ? 0.016 : 0.026);

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
    this.beams = spots.map((s) => makeBeam(this.shared, this.slots, s, haze(s)));
    this.dust = makeDust(this.shared, spots);
    const ends = room.works.map((w) => w.x);
    this.fixtures = makeFixtures(this.shared, spots, Math.min(...ends) - 9, Math.max(...ends) + 6);
    this.group.add(...this.beams.map((b) => b.mesh), this.dust.points, this.fixtures.group);
  }

  /** Each spot's level this frame: its beam and its lamp's glow follow it. */
  light(level: number[], pixelsPerUnit: number) {
    this.beams.forEach((b, i) => b.color.set(1, 0.86, 0.7).multiplyScalar(b.base * (level[i] ?? 0)));
    this.fixtures?.glows.forEach((g, i) => (g.level.value = level[i] ?? 0));
    if (this.dust) this.dust.uPx.value = pixelsPerUnit;
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
