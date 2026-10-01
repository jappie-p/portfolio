import { TAU, between, mulberry32, wrap } from "./rng";
import { glow, rgba, type RGB } from "./sprites";

/** Cool white, pale blue, and the odd warm star. */
const TINTS: readonly RGB[] = [
  [232, 239, 255],
  [176, 200, 255],
  [255, 228, 200],
];
/** Stars stay this far outside the screen before they wrap round. */
const PAD = 60;

type Spec = {
  seed: number;
  /** stars per screen pixel */
  density: number;
  size: [number, number];
  light: [number, number];
  /** how much of its light a star loses at the bottom of a twinkle */
  twinkle: number;
  /** parallax: px the layer moves per px of sideways scroll */
  depth: number;
  /** px the layer leans at the screen edge as the mouse moves */
  lean: number;
  halo: boolean;
};

/** Three depths of star: a fine far dust, a middle field, and a few bright near ones with a halo. */
const SPECS: readonly Spec[] = [
  { seed: 11, density: 1 / 1900, size: [0.45, 1.05], light: [0.12, 0.6], twinkle: 0.3, depth: 0.2, lean: 3, halo: false },
  { seed: 23, density: 1 / 9000, size: [0.85, 1.55], light: [0.3, 0.85], twinkle: 0.5, depth: 0.36, lean: 6, halo: false },
  { seed: 37, density: 1 / 46000, size: [1.2, 2.1], light: [0.55, 1], twinkle: 0.32, depth: 0.55, lean: 11, halo: true },
];

/** One parallax layer on a tile that repeats both ways, so any scroll length works. */
export class StarLayer {
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly s: Float32Array;
  private readonly b: Float32Array;
  private readonly f: Float32Array;
  private readonly p: Float32Array;
  /** where each tint's run of stars ends (stars are sorted by tint) */
  private readonly runs: number[] = [];
  private readonly halos: HTMLCanvasElement[];

  constructor(
    private readonly spec: Spec,
    private readonly tw: number,
    private readonly th: number,
  ) {
    const r = mulberry32(spec.seed);
    const n = Math.round(tw * th * spec.density);
    const stars = Array.from({ length: n }, () => {
      const pick = r();
      return {
        tint: pick < 0.7 ? 0 : pick < 0.92 ? 1 : 2,
        x: r() * tw,
        y: r() * th,
        // most stars are small and faint: skew both toward the low end
        s: spec.size[0] + (spec.size[1] - spec.size[0]) * r() ** 2,
        b: spec.light[0] + (spec.light[1] - spec.light[0]) * r() ** 2.2,
        f: between(r, 0.25, 1.1),
        p: r() * TAU,
      };
    }).sort((a, b) => a.tint - b.tint);
    this.x = Float32Array.from(stars, (s) => s.x);
    this.y = Float32Array.from(stars, (s) => s.y);
    this.s = Float32Array.from(stars, (s) => s.s);
    this.b = Float32Array.from(stars, (s) => s.b);
    this.f = Float32Array.from(stars, (s) => s.f);
    this.p = Float32Array.from(stars, (s) => s.p);
    for (let k = 0; k < TINTS.length; k++) this.runs.push(stars.filter((s) => s.tint <= k).length);
    this.halos = TINTS.map((t) => glow(t, 48));
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, sx: number, sy: number, px: number, py: number) {
    const { spec, tw, th } = this;
    const ox = sx * spec.depth + px * spec.lean;
    const oy = sy * spec.depth + py * spec.lean * 0.6;
    let i = 0;
    for (let k = 0; k < TINTS.length; k++) {
      ctx.fillStyle = rgba(TINTS[k]);
      const halo = this.halos[k];
      for (; i < this.runs[k]; i++) {
        const X = wrap(this.x[i] - ox, tw) - PAD;
        if (X < -4 || X > w + 4) continue;
        const Y = wrap(this.y[i] - oy, th) - PAD;
        if (Y < -4 || Y > h + 4) continue;
        const a = this.b[i] * (1 - spec.twinkle * (0.5 + 0.5 * Math.sin(t * this.f[i] + this.p[i])));
        const s = this.s[i];
        if (spec.halo) {
          ctx.globalAlpha = a * 0.55;
          const R = s * 5.5;
          ctx.drawImage(halo, X - R, Y - R, R * 2, R * 2);
          if (this.b[i] > 0.86) {
            // the brightest few get a faint cross
            ctx.globalAlpha = a * 0.22;
            ctx.fillRect(X - s * 4, Y - 0.25, s * 8, 0.5);
            ctx.fillRect(X - 0.25, Y - s * 4, 0.5, s * 8);
          }
        }
        ctx.globalAlpha = a;
        ctx.fillRect(X - s / 2, Y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** The three layers for a screen of w x h. */
export function starLayers(w: number, h: number): StarLayer[] {
  const tw = Math.round(w * 1.25 + PAD * 2);
  const th = Math.round(h * 1.25 + PAD * 2);
  return SPECS.map((s) => new StarLayer(s, tw, th));
}
