import type { Pane } from "./houses";
import { canvas, ctx2d } from "./sprites";

const SCALE = 0.5;

/** A half-resolution mask of what stands in front, read back once per size,
 *  so rooms in farther buildings only light up where they can be seen. */
export class Occluder {
  private readonly c: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cw: number;
  private readonly ch: number;
  private data: Uint8ClampedArray | null = null;

  constructor(
    w: number,
    private readonly top: number,
    bottom: number,
  ) {
    this.cw = Math.max(1, Math.ceil(w * SCALE));
    this.ch = Math.max(1, Math.ceil((bottom - top) * SCALE));
    this.c = canvas(this.cw, this.ch);
    this.ctx = ctx2d(this.c, true);
    this.ctx.setTransform(SCALE, 0, 0, SCALE, 0, -top * SCALE);
  }

  fill(p: Path2D) {
    this.ctx.fill(p);
  }

  snapshot() {
    this.data = this.ctx.getImageData(0, 0, this.cw, this.ch).data;
  }

  /** The panes nothing drawn before the last snapshot covers. */
  visible(panes: readonly Pane[]): Pane[] {
    const d = this.data;
    if (!d) return panes.slice();
    const hit = (x: number, y: number) => {
      const ix = Math.floor(x * SCALE);
      const iy = Math.floor((y - this.top) * SCALE);
      if (ix < 0 || iy < 0 || ix >= this.cw || iy >= this.ch) return false;
      return d[(iy * this.cw + ix) * 4 + 3] > 40;
    };
    return panes.filter((p) => !hit(p.x + p.w / 2, p.y + p.h / 2) && !hit(p.x, p.y) && !hit(p.x + p.w, p.y) && !hit(p.x, p.y + p.h) && !hit(p.x + p.w, p.y + p.h));
  }

  dispose() {
    this.c.width = this.c.height = 0;
  }
}
