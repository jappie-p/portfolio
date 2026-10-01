import { SkyScene } from "./scene";

const MAX_DPR = 2;
/** Backing-store budget: 1920x1080 at 2x still fits, larger screens scale down. */
const MAX_PIXELS = 8.3e6;
/** Frames a new size has to hold before a live sky rebuilds (window drags). */
const SETTLE_FRAMES = 6;
/** The one frame shown for reduced motion, in scene seconds. */
const STILL_T = 4;

/**
 * Runs the sky inside `host`, reading the About track's scroll:
 * - builds on mount (and again on resize), so the first frame is ready before
 *   the row slides into view;
 * - animates only while live (on screen, motion allowed), nothing ticks otherwise;
 * - reduced motion holds a still frame that does not pan: it cuts to the next
 *   panel's own stretch of sky once the track lands there;
 * - the sideways scroll pans every layer; on a phone, the scroll of the panel
 *   in view drifts it down a little (blended across the slide between panels).
 * Sizes and scroll positions are cached from observers and scroll events, so
 * a frame never reads layout.
 */
export class SkyRunner {
  private readonly scene: SkyScene;
  private readonly ro: ResizeObserver;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private span = 0;
  private built = "";
  private settle = 0;
  private live = false;
  private still = false;
  private raf = 0;
  private t = 0;
  private last = 0;
  private sx = 0;
  private sy = 0;
  /** the panel the track is nearest, and the track's width */
  private panel = 0;
  private cw = 0;
  private px = 0;
  private py = 0;
  private tx = 0;
  private ty = 0;
  private mq: MediaQueryList | null = null;

  constructor(
    private readonly host: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly track: HTMLElement | null,
  ) {
    this.scene = new SkyScene(canvas);
    this.ro = new ResizeObserver(this.onResize);
    this.ro.observe(host);
    if (track) {
      this.ro.observe(track);
      // capture: the panels' own (vertical) scrolls do not bubble
      track.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
    }
    this.watchRatio();
  }

  setMode(active: boolean, still: boolean) {
    this.still = still;
    this.live = active && !still;
    this.readScroll();
    if (this.live) this.start();
    else {
      this.stop();
      this.paint();
    }
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.track?.removeEventListener("scroll", this.onScroll, { capture: true });
    this.mq?.removeEventListener("change", this.onRatio);
  }

  private get key() {
    return `${this.w}x${this.h}@${this.dpr}/${this.span}`;
  }

  private rebuild(): boolean {
    if (this.w < 1 || this.h < 1) return false;
    this.scene.resize(this.w, this.h, this.dpr, this.span);
    this.built = this.key;
    this.settle = 0;
    return true;
  }

  /** One frame outside the loop: the still frame, or the current one. */
  private paint() {
    if (this.built !== this.key && !this.rebuild()) return;
    if (this.still) this.scene.draw(STILL_T, this.panel * this.cw, 0, 0, 0);
    else this.scene.draw(this.t, this.sx, this.sy, this.px, this.py);
  }

  private measure() {
    this.w = this.host.clientWidth;
    this.h = this.host.clientHeight;
    this.dpr = Math.max(0.75, Math.min(MAX_DPR, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / Math.max(1, this.w * this.h))));
    this.span = this.track ? Math.max(0, this.track.scrollWidth - this.track.clientWidth) : 0;
  }

  private onResize = () => {
    this.measure();
    this.readScroll();
    if (!this.raf) this.paint();
  };

  private onRatio = () => {
    this.watchRatio();
    this.onResize();
  };

  /** a window dragged to a screen with another pixel ratio rebuilds sharp */
  private watchRatio() {
    this.mq?.removeEventListener("change", this.onRatio);
    this.mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    this.mq.addEventListener("change", this.onRatio);
  }

  private onScroll = () => {
    const was = this.panel;
    this.readScroll();
    if (this.still && this.panel !== was) this.paint();
  };

  private readScroll() {
    const track = this.track;
    if (!track) return;
    const x = track.scrollLeft;
    const cw = track.clientWidth || 1;
    const i = Math.floor(x / cw);
    const f = x / cw - i;
    const top = (k: number) => (track.children[k] as HTMLElement | undefined)?.scrollTop ?? 0;
    this.sx = x;
    this.sy = top(i) * (1 - f) + (f > 0 ? top(i + 1) * f : 0);
    this.cw = cw;
    this.panel = Math.round(x / cw);
  }

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.tx = (e.clientX / window.innerWidth) * 2 - 1;
    this.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private start() {
    if (this.raf) return;
    this.readScroll();
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
    this.t += dt;
    const k = 1 - Math.exp(-dt * 2.5);
    this.px += (this.tx - this.px) * k;
    this.py += (this.ty - this.py) * k;
    // keep painting the old buffers (CSS stretches them) until a new size holds
    if (this.built !== this.key && (!this.built || ++this.settle >= SETTLE_FRAMES) && !this.rebuild()) return;
    if (this.built) this.scene.draw(this.t, this.sx, this.sy, this.px, this.py);
  };
}
