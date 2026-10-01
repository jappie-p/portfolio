import { Motes } from "./motes";
import { NEBULA_DEPTH, NEBULA_PAD, NEBULA_SCALE, paintNebula } from "./nebula";
import { starLayers, type StarLayer } from "./stars";
import { ctx2d } from "./sprites";

/** How far the sky drifts down as a panel scrolls (phones), relative to the scroll. */
const VERTICAL = 0.6;

/**
 * The night sky behind the About row, Canvas 2D: a nebula painted once at a
 * quarter of the resolution, three twinkling star layers on repeating tiles,
 * and a few drifting motes. Every layer pans with the sideways scroll at its
 * own depth, so sliding between panels moves across one sky.
 */
export class SkyScene {
  private readonly ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private worldW = 0;
  private worldH = 0;
  private nebula: HTMLCanvasElement | null = null;
  private layers: StarLayer[] = [];
  private readonly motes = new Motes();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = ctx2d(canvas);
  }

  /** Rebuild for a screen of w x h CSS px at `dpr`, panning over `span` px of sideways scroll. */
  resize(w: number, h: number, dpr: number, span: number) {
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.worldW = Math.ceil(w + span * NEBULA_DEPTH + NEBULA_PAD * 2);
    this.worldH = Math.ceil(h * 1.35 + NEBULA_PAD * 2);
    this.nebula = paintNebula(w, h, this.worldW, this.worldH);
    this.layers = starLayers(w, h);
  }

  /** One frame at scene time `t` (s), sideways scroll `sx`, panel scroll `sy`
   *  and the eased mouse `px`, `py` in -1..1. */
  draw(t: number, sx: number, sy: number, px: number, py: number) {
    const { ctx, w, h, nebula } = this;
    if (!nebula) return;
    const k = NEBULA_SCALE;
    const vy = sy * VERTICAL;
    const nx = Math.min(this.worldW - w, Math.max(0, sx * NEBULA_DEPTH + NEBULA_PAD + px * 4));
    const ny = Math.min(this.worldH - h, Math.max(0, vy * NEBULA_DEPTH + NEBULA_PAD + py * 3));
    ctx.drawImage(nebula, nx * k, ny * k, w * k, h * k, 0, 0, w, h);
    for (const layer of this.layers) layer.draw(ctx, w, h, t, sx, vy, px, py);
    this.motes.draw(ctx, w, h, t, sx, vy, px, py);
  }
}
