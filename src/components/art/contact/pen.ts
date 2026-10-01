/** Draws in metres on a building's own axis: x across from its centre line,
 *  y up from the street. Everything lands in one Path2D in CSS pixels. */
export class Pen {
  readonly p = new Path2D();

  constructor(
    private readonly x0: number,
    private readonly ground: number,
    private readonly m: number,
  ) {}

  X = (mx: number) => this.x0 + mx * this.m;
  Y = (my: number) => this.ground - my * this.m;

  rect(x0: number, y0: number, x1: number, y1: number) {
    this.p.rect(this.X(x0), this.Y(y1), (x1 - x0) * this.m, (y1 - y0) * this.m);
    return this;
  }

  /** A closed polygon from flat [x, y, x, y, ...] pairs. It always winds the
   *  way rect() does, so overlapping parts add up under the nonzero rule
   *  instead of cancelling into holes. */
  poly(pts: readonly number[]) {
    const n = pts.length / 2;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1];
    }
    // metres have y up: a clockwise outline on screen has negative area here
    for (let i = 0; i < n; i++) {
      const k = area > 0 ? n - 1 - i : i;
      const x = this.X(pts[k * 2]);
      const y = this.Y(pts[k * 2 + 1]);
      if (i) this.p.lineTo(x, y);
      else this.p.moveTo(x, y);
    }
    this.p.closePath();
    return this;
  }

  circle(x: number, y: number, r: number) {
    this.p.moveTo(this.X(x) + r * this.m, this.Y(y));
    this.p.arc(this.X(x), this.Y(y), r * this.m, 0, Math.PI * 2);
    return this;
  }

  /** A pointed Gothic opening: straight jambs up to `spring`, then two arcs
   *  that meet in a point `rise` (as a share of the width) above it. */
  lancet(x0: number, x1: number, y0: number, spring: number, rise = 0.8) {
    const cx = (x0 + x1) / 2;
    const apex = spring + (x1 - x0) * rise;
    const { X, Y } = this;
    this.p.moveTo(X(x0), Y(y0));
    this.p.lineTo(X(x0), Y(spring));
    this.p.quadraticCurveTo(X(x0), Y(spring + (apex - spring) * 0.62), X(cx), Y(apex));
    this.p.quadraticCurveTo(X(x1), Y(spring + (apex - spring) * 0.62), X(x1), Y(spring));
    this.p.lineTo(X(x1), Y(y0));
    this.p.closePath();
    return this;
  }

  /** A pinnacle: a square shaft and a pointed hood. */
  pinnacle(x: number, y0: number, y1: number, hw: number, point: number) {
    this.rect(x - hw, y0, x + hw, y1);
    this.poly([x - hw * 1.2, y1, x, y1 + point, x + hw * 1.2, y1]);
    return this;
  }

  /** A row of small pinnacles along a parapet. */
  crest(x0: number, x1: number, y: number, step: number, tall: number, hw: number) {
    const n = Math.max(1, Math.round((x1 - x0) / step));
    for (let i = 0; i <= n; i++) this.pinnacle(x0 + ((x1 - x0) * i) / n, y - 0.4, y + tall * 0.45, hw, tall * 0.55);
    return this;
  }
}
