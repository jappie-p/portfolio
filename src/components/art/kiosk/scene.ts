import { calmAt, kioskLayout, type KioskLayout } from "./layout";
import { DRIFTERS } from "./Leaves";
import { Bokeh } from "./bokeh";
import { drawRoom } from "./room";
import { Motes } from "./shafts";

export type Mode = "live" | "paused" | "still";

/** Bokeh is soft by nature: this is enough resolution for it on any screen. */
const MAX_DPR = 1.5;
/** The still frame's moment, chosen so the leaves are spread nicely. */
const STILL_AT = 13;

/** The restaurant behind the kiosks: a canvas for the room, its lights and
 *  the dust in the lamplight, and SVG leaves moved by transform only. One
 *  clock for all of it. */
export class KioskScene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly room = document.createElement("canvas");
  private readonly bokeh = new Bokeh();
  private readonly motes = new Motes();
  private readonly leaves: HTMLElement[];
  private readonly fronds: HTMLElement[];
  private L: KioskLayout | null = null;
  private dpr = 1;
  private mode: Mode = "paused";
  private t = 0;
  private raf = 0;
  private prev = 0;

  constructor(
    private readonly el: HTMLCanvasElement,
    layer: HTMLElement,
  ) {
    const ctx = el.getContext("2d");
    if (!ctx) throw new Error("2d canvas unavailable");
    this.ctx = ctx;
    this.leaves = Array.from(layer.querySelectorAll<HTMLElement>("[data-leaf]"));
    this.fronds = Array.from(layer.querySelectorAll<HTMLElement>("[data-frond]"));
  }

  resize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    this.dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    this.el.width = Math.round(w * this.dpr);
    this.el.height = Math.round(h * this.dpr);
    const L = kioskLayout(w, h);
    this.L = L;
    this.room.width = Math.round(w);
    this.room.height = Math.round(h);
    const rc = this.room.getContext("2d");
    if (rc) drawRoom(rc, L);
    this.bokeh.layout(L);
    this.motes.layout(L);
    if (this.mode === "still") this.t = STILL_AT;
    if (this.mode !== "live") this.draw();
  }

  setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === "live") {
      if (!this.raf) {
        this.prev = performance.now();
        this.raf = requestAnimationFrame(this.tick);
      }
      return;
    }
    this.stop();
    if (mode === "still") this.t = STILL_AT;
    this.draw();
  }

  dispose() {
    this.stop();
    this.room.width = this.room.height = 0;
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    this.t += Math.min(0.05, Math.max(0, (now - this.prev) / 1000));
    this.prev = now;
    this.draw();
  };

  private draw() {
    const L = this.L;
    if (!L) return;
    const { ctx, dpr, t } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(this.room, 0, 0, L.w, L.h);
    this.bokeh.draw(ctx, t);
    this.motes.draw(ctx, t);
    this.drift(L, t);
  }

  /** Leaves fall slowly on the room's side, turning and tumbling as they go. */
  private drift(L: KioskLayout, t: number) {
    const { w, h, u } = L;
    const span = L.wide ? Math.max(200, L.calm.from - 60) : w;
    this.leaves.forEach((el, i) => {
      const s = DRIFTERS[i];
      if (!s) return;
      const size = s.size * u;
      const p = (t / s.period + s.offset) % 1;
      const x0 = -size + s.lane * span * 0.9;
      const x = x0 + s.drift * w * p + Math.sin(p * Math.PI * 4 + s.phase) * 22 * u;
      const y = -size * 1.5 + (h + size * 3) * p;
      const rot = s.tilt + Math.sin(t * s.spin + s.phase) * 30;
      const turn = Math.sin(t * s.tumble + s.phase) * 62;
      const fade = Math.min(1, p * 12, (1 - p) * 12) * (1 - 0.9 * calmAt(L, x + size / 2, y + size / 2));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) rotateY(${turn.toFixed(2)}deg) scale(${u.toFixed(3)})`;
      el.style.opacity = (s.opacity * fade).toFixed(3);
    });
    this.fronds.forEach((el, i) => {
      el.style.transform = `rotate(${(Math.sin(t * 0.55 + i * 2.1) * 1.3).toFixed(3)}deg)`;
    });
  }
}
