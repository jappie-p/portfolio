import type { CanvasScene } from "./types";

const MAX_DPR = 2;
/** Backing-store budget per canvas: 1920x1080 at 2x still fits, larger screens scale down. */
const MAX_PIXELS = 8.3e6;
/** Frames a new size has to hold before the scene rebuilds (window drags). */
const SETTLE_FRAMES = 6;

export function pixelRatio(w: number, h: number): number {
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  return Math.max(0.75, Math.min(dpr, Math.sqrt(MAX_PIXELS / Math.max(1, w * h))));
}

/**
 * Owns one canvas scene inside `host`:
 * - sizes it from a ResizeObserver and builds it lazily, the first time it is
 *   on screen or active;
 * - animates only while active and not still (no rAF, no timers otherwise);
 * - holds one composed frame at `stillTime` when still;
 * - eases the mouse position (window-wide, mouse only) into -1..1 parallax.
 */
export class SceneRunner {
  private scene: CanvasScene | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private built = "";
  private drawn = "";
  private visible = false;
  private active = false;
  private still = false;
  private raf = 0;
  private last = 0;
  private settle = 0;
  private t: number;
  private px = 0;
  private py = 0;
  private tx = 0;
  private ty = 0;
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;

  constructor(
    private readonly host: HTMLElement,
    private readonly create: (host: HTMLElement) => CanvasScene,
    private readonly stillTime: number,
  ) {
    this.t = stillTime;
    this.ro = new ResizeObserver(this.onResize);
    this.io = new IntersectionObserver(this.onIntersect);
    this.ro.observe(host);
    this.io.observe(host);
  }

  setMode(active: boolean, still: boolean) {
    this.active = active;
    this.still = still;
    if (still) {
      this.t = this.stillTime;
      this.px = this.py = this.tx = this.ty = 0;
      this.drawn = "";
    }
    if (active && !still) this.start();
    else {
      this.stop();
      this.paintIfStale();
    }
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.io.disconnect();
  }

  private get key() {
    return `${this.w}x${this.h}@${this.dpr}`;
  }

  /** Build or rebuild for the current size; false while there is no size yet. */
  private ensure(): boolean {
    if (this.w < 1 || this.h < 1) return false;
    if (!this.scene) this.scene = this.create(this.host);
    if (this.built !== this.key) {
      this.scene.resize(this.w, this.h, this.dpr);
      this.built = this.key;
    }
    return true;
  }

  /** One frame outside the loop. Still frames are complete; a frame painted
   *  because the panel came into view may leave staged work to the loop that
   *  starts a moment later, so showing it never costs a long task. */
  private paintIfStale() {
    if (this.raf || !(this.visible || this.active)) return;
    if (this.drawn === this.key || !this.ensure()) return;
    this.scene!.draw(this.t, this.px, this.py, this.still);
    this.drawn = this.key;
  }

  private onResize = (entries: ResizeObserverEntry[]) => {
    const r = entries[entries.length - 1].contentRect;
    this.w = Math.round(r.width);
    this.h = Math.round(r.height);
    this.dpr = pixelRatio(this.w, this.h);
    this.paintIfStale();
  };

  private onIntersect = (entries: IntersectionObserverEntry[]) => {
    this.visible = entries.some((e) => e.isIntersecting);
    this.paintIfStale();
  };

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.tx = (e.clientX / window.innerWidth) * 2 - 1;
    this.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private start() {
    if (this.raf) return;
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener("pointermove", this.onPointer);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    if (this.built !== this.key) {
      // keep painting the old buffers (CSS stretches them) until the size holds
      if (!this.built || ++this.settle >= SETTLE_FRAMES) {
        this.settle = 0;
        // a rebuild is a frame's worth of work on its own: draw on the next
        this.ensure();
        return;
      }
    }
    if (!this.scene) return;
    this.t += dt;
    const k = 1 - Math.exp(-dt * 3);
    this.px += (this.tx - this.px) * k;
    this.py += (this.ty - this.py) * k;
    this.scene.draw(this.t, this.px, this.py, false);
    this.drawn = this.key;
  };
}
