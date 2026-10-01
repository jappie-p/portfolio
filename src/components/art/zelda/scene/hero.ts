import type { Layout } from "./layout";
import { FRAMES, type Facing } from "./link";
import { between, type Rng } from "./rng";

type Phase = "inside" | "exit" | "turn" | "walk" | "away" | "enter";

const WALK = 30; // px/s along the path
const DOORWAY = 17; // px/s stepping out of and into the door
const STRIDE = 2.75; // px per animation frame: the feet stay planted
const STRIDE_DOOR = 2.1;

/** Link's evening: out of the front door, along the path and off to the
 *  right, then back home from the right and in again. */
export class Hero {
  phase: Phase = "inside";
  x = 0;
  y = 0;
  facing: Facing = "down";
  visible = false;
  /** the front door, eased 0 (shut) to 1 (open) by the scene */
  doorOpen = false;
  private timer = 1.1;
  private dist = 0;
  private home = 1;
  private span = 1;

  constructor(private rand: Rng) {}

  /** Mid-path and walking right: the reduced-motion still frame. */
  pose(L: Layout, x: number) {
    this.phase = "walk";
    this.facing = "right";
    this.visible = true;
    this.x = x;
    this.y = L.feet;
    this.dist = 0;
  }

  update(dt: number, L: Layout) {
    this.timer -= dt;
    switch (this.phase) {
      case "inside":
        this.visible = false;
        this.home += dt;
        // the door opens just before he steps out, and shuts just after he is in
        this.doorOpen = this.timer < 0.35 || this.home < 0.3;
        if (this.timer <= 0) this.go("exit", 0, L);
        break;
      case "exit":
        this.y += DOORWAY * dt;
        this.dist += DOORWAY * dt;
        if (this.y >= L.feet) this.go("turn", 0.16, L);
        break;
      case "turn":
        if (this.timer <= 0) this.go("walk", 0, L);
        break;
      case "walk":
        this.y = L.feet;
        this.x += (this.facing === "right" ? 1 : -1) * WALK * dt;
        this.dist += WALK * dt;
        if (this.facing === "right" && this.x > L.W + 16) this.go("away", between(this.rand, 2.5, 4.5), L);
        if (this.facing === "left" && this.x <= L.doorX) this.go("enter", 0, L);
        break;
      case "away":
        this.visible = false;
        if (this.timer <= 0) {
          this.go("walk", 0, L);
          this.facing = "left";
          this.x = L.W + 16;
        }
        break;
      case "enter":
        this.y -= DOORWAY * dt;
        this.dist += DOORWAY * dt;
        if (this.y <= L.doorFeet) this.go("inside", between(this.rand, 3.5, 6.5), L);
        break;
    }
  }

  private go(phase: Phase, timer: number, L: Layout) {
    this.phase = phase;
    this.timer = timer;
    this.dist = 0;
    if (phase === "exit") {
      this.visible = true;
      this.doorOpen = true;
      this.x = L.doorX;
      this.y = L.doorFeet;
      this.facing = "down";
    }
    if (phase === "turn") {
      this.y = L.feet;
      this.facing = "right";
    }
    if (phase === "walk") {
      this.doorOpen = false;
      this.y = L.feet;
    }
    if (phase === "enter") {
      this.x = L.doorX;
      this.facing = "up";
      this.doorOpen = true;
      this.span = this.y - L.doorFeet;
    }
    if (phase === "inside") {
      this.visible = false;
      this.home = 0;
    }
  }

  /** Which cell of the walk cycle to draw. */
  frame(): number {
    if (this.phase === "turn") return 0;
    const stride = this.facing === "down" || this.facing === "up" ? STRIDE_DOOR : STRIDE;
    return Math.floor(this.dist / stride) % FRAMES;
  }

  /** Walking on the path (so rupees can be picked up and slimes can flee). */
  get onPath() {
    return this.visible && this.phase === "walk";
  }

  /** Fades him in as he steps out of the doorway, and out as he steps in. */
  get presence() {
    if (this.phase === "exit") return Math.min(1, 0.2 + this.dist / 4);
    if (this.phase === "enter") return Math.max(0, Math.min(1, 0.2 + (this.span - this.dist) / 4));
    return 1;
  }
}
