import { CERULEAN, SAFFRON, VERMILION, mix, rgba, WHITE, type RGB } from "./palette";
import { canvas, ctx2d, heartPath } from "./sprites";
import { panelRect, type Panel, type Wall } from "./stage";
import { kick } from "./tempo";

const HOT: RGB = [255, 112, 92];
const CORE: RGB = [255, 206, 196];

/** The i-th pixel clockwise round a panel's border. */
function edge(p: Panel, i: number): [number, number] {
  const w = p.cols - 1;
  const h = p.rows - 1;
  if (i < w) return [p.c + i, p.r];
  if (i < w + h) return [p.c + w, p.r + i - w];
  if (i < 2 * w + h) return [p.c + w - (i - w - h), p.r + h];
  return [p.c, p.r + h - (i - 2 * w - h)];
}

/** A cheap, stable 0..1 hash of an integer. */
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** The LED screens. The header over the roof beats the festival's heart; a
 *  heart-shaped ring leaves it on every beat and rolls on down the wall behind
 *  the band. Painted one canvas pixel per LED, then blown up without smoothing
 *  and masked into dots, so it reads as a real LED wall. The same tiny canvas,
 *  smoothed, is the glow the screens throw into the haze. */
export class LedWall {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly heart = heartPath();
  private readonly mask: CanvasPattern | null;

  constructor(
    readonly wall: Wall,
    dpr: number,
    main: CanvasRenderingContext2D,
  ) {
    this.canvas = canvas(wall.cols, wall.rows);
    this.ctx = ctx2d(this.canvas);
    const px = Math.round(wall.cell * dpr);
    const tile = canvas(px, px);
    const t = ctx2d(tile);
    t.fillStyle = "rgba(2,1,4,0.8)";
    t.fillRect(0, 0, px, px);
    t.globalCompositeOperation = "destination-out";
    t.beginPath();
    t.roundRect(px * 0.12, px * 0.12, px * 0.76, px * 0.76, px * 0.24);
    t.fill();
    this.mask = main.createPattern(tile, "repeat");
    this.mask?.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, wall.x, wall.y]));
  }

  paint(beat: number, drop: number) {
    const { cols, rows, main, header } = this.wall;
    const c = this.ctx;
    const whole = Math.floor(beat);
    const phase = beat - whole;
    const k = kick(phase, 7);
    const hx = header.c + header.cols / 2;
    const hy = header.r + header.rows / 2;
    const size = header.rows * 0.78;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = "#030104";
    c.fillRect(0, 0, cols, rows);
    // the wall glows warmest right behind the band (and the phones)
    const mx = main.c + main.cols / 2;
    const my = main.r + main.rows * 0.5;
    const g = c.createRadialGradient(mx, my, 0, mx, my, main.cols * 0.62);
    g.addColorStop(0, rgba(VERMILION, 0.34 + 0.2 * k));
    g.addColorStop(0.55, rgba(VERMILION, 0.08));
    g.addColorStop(1, rgba(VERMILION, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, cols, rows);
    // on the drop every screen goes cerulean, and drains back to black
    if (drop > 0.02) {
      c.fillStyle = rgba(CERULEAN, Math.min(0.85, drop * 0.95));
      c.fillRect(0, 0, cols, rows);
    }

    // sparkle: a scatter of single LEDs flashing on the beat
    const n = Math.round(cols * rows * 0.01);
    for (let i = 0; i < n; i++) {
      const h1 = hash(whole * 131 + i * 17);
      const h2 = hash(h1 * 977 + i);
      c.fillStyle = rgba(i % 3 ? WHITE : SAFFRON, (0.2 + 0.5 * hash(i + whole)) * k);
      c.fillRect((h1 * cols) | 0, (h2 * rows) | 0, 1, 1);
    }

    // rings: born on each beat at the heart's edge, rolling out over every screen
    for (let i = 0; i < 6; i++) {
      const age = phase + i;
      const s = size * (1.75 + age * 1.7);
      const a = (1 - age / 6) ** 1.6;
      const born = whole - i;
      const tone = born % 3 === 0 ? SAFFRON : born % 3 === 1 ? mix(VERMILION, WHITE, 0.4) : VERMILION;
      this.stroke(hx, hy, s, rgba(tone, a * 0.8), 1 + age * 0.1);
    }

    // the header carries only the heart, in a glow of its own, with a chase of
    // marquee bulbs running round its edge
    c.fillStyle = "#030104";
    c.fillRect(header.c, header.r, header.cols, header.rows);
    const hg = c.createRadialGradient(hx, hy, 0, hx, hy, header.cols * 0.62);
    hg.addColorStop(0, rgba(VERMILION, 0.3 + 0.22 * k));
    hg.addColorStop(1, rgba(VERMILION, 0));
    c.fillStyle = hg;
    c.fillRect(header.c, header.r, header.cols, header.rows);
    if (drop > 0.02) {
      c.fillStyle = rgba(CERULEAN, Math.min(0.85, drop * 0.95));
      c.fillRect(header.c, header.r, header.cols, header.rows);
    }
    const step = Math.floor(beat * 2);
    const per = 2 * (header.cols + header.rows) - 4;
    for (let i = 0; i < per; i++) {
      if ((i + step) % 3) continue;
      const [x, y] = edge(header, i);
      c.fillStyle = rgba(SAFFRON, 0.5 + 0.4 * k);
      c.fillRect(x, y, 1, 1);
    }

    // the heart itself, swelling on the beat, white-hot at the core
    const hs = size * (1 + 0.12 * k + 0.08 * drop);
    this.fill(hx, hy, hs, drop > 0.3 ? mix(VERMILION, WHITE, drop * 0.5) : VERMILION, 1);
    this.fill(hx, hy + hs * 0.02, hs * 0.66, HOT, 0.9);
    this.fill(hx, hy + hs * 0.04, hs * 0.36, CORE, 0.3 + 0.6 * k);
  }

  /** The crisp LEDs, onto the main canvas (in CSS px). */
  blit(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
    for (const p of [this.wall.main, this.wall.header]) {
      const r = panelRect(this.wall, p);
      ctx.drawImage(this.canvas, p.c, p.r, p.cols, p.rows, r.x, r.y, r.w, r.h);
    }
    ctx.imageSmoothingEnabled = true;
    if (!this.mask) return;
    ctx.fillStyle = this.mask;
    for (const p of [this.wall.main, this.wall.header]) {
      const r = panelRect(this.wall, p);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  /** One panel's pixels, smoothed and grown by `grow`, as glow on the light layer. */
  bloom(ctx: CanvasRenderingContext2D, p: Panel, grow: number, alpha: number) {
    const r = panelRect(this.wall, p);
    const gx = r.w * (grow - 1) * 0.5;
    const gy = r.h * (grow - 1) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.canvas, p.c, p.r, p.cols, p.rows, r.x - gx, r.y - gy, r.w + gx * 2, r.h + gy * 2);
  }

  private fill(x: number, y: number, s: number, c: RGB, a: number) {
    const ctx = this.ctx;
    ctx.setTransform(s, 0, 0, s, x, y);
    ctx.fillStyle = rgba(c, a);
    ctx.fill(this.heart);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private stroke(x: number, y: number, s: number, style: string, width: number) {
    const ctx = this.ctx;
    ctx.setTransform(s, 0, 0, s, x, y);
    ctx.lineWidth = width / s;
    ctx.strokeStyle = style;
    ctx.stroke(this.heart);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
