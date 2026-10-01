import { makeFireflies, makeRupees, makeSlimes, updateMeteor, updateRupees, updateSlimes, updateSmoke, type Burst, type Meteor, type Puff } from "./actors";
import { buildClouds, driftClouds } from "./clouds";
import { buildGround } from "./ground";
import { Hero } from "./hero";
import { buildHills, buildTrees, type Band } from "./land";
import { layout, MARGIN, STAGE_H, type Layout } from "./layout";
import { loadLink, type LinkSheet } from "./link";
import { composeNear, DEPTH, makeArt, paintFireflies, paintLights, paintStars, PARALLAX, type Art, type Frame, type World } from "./paint";
import { context, makeCanvas } from "./raster";
import { seeded } from "./rng";
import { buildSky } from "./sky";

const MAX_DEVICE_PIXELS = 6_000_000;

/** The evening in the school game's world, as a canvas backdrop. It paints
 *  each layer at low resolution, then scales them up with nearest-neighbour
 *  sampling to whole device pixels, so the pixels stay crisp while the layers
 *  still glide past each other a device pixel at a time. */
export class Scene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly art: Art = makeArt();
  private readonly rand = seeded(97);
  private readonly hero = new Hero(this.rand);
  private world: World | null = null;
  private link: LinkSheet | null = null;
  private s = 1;
  private t = 0;
  private cam = 0;
  private aim: number | null = null;
  private door = 0;
  private fire = 1;
  private puffs: Puff[] = [];
  private bursts: Burst[] = [];
  private smokeClock = { next: 0 };
  private meteor: { current: Meteor | null; wait: number } = { current: null, wait: 7 };
  private raf = 0;
  private last = 0;
  private still = false;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    atlas: string,
  ) {
    this.ctx = context(canvas);
    loadLink(atlas)
      .then((sheet) => {
        if (this.disposed) return;
        this.link = sheet;
        if (!this.raf) this.draw();
      })
      .catch(() => {
        // without the sprite sheet the world is still worth looking at
      });
  }

  /** Fits the canvas to its box: an integer number of device pixels per
   *  logical pixel (about 180 logical rows tall), device pixel ratio capped at 2. */
  resize(cssW: number, cssH: number, dpr: number) {
    if (this.disposed || cssW < 1 || cssH < 1) return;
    let ratio = Math.min(2, dpr || 1);
    // big retina screens render at 1x and let the pixelated upscale double it:
    // the pixels are 5+ CSS px squares, so nothing is lost but fill rate
    if (cssW * cssH * ratio * ratio > MAX_DEVICE_PIXELS) ratio = 1;
    const devW = Math.round(cssW * ratio);
    const devH = Math.round(cssH * ratio);
    const s = Math.max(1, Math.round(Math.min(devH / STAGE_H, devW / 160)));
    const W = Math.ceil(devW / s);
    const H = Math.ceil(devH / s);
    this.canvas.style.width = `${(W * s) / ratio}px`;
    this.canvas.style.height = `${(H * s) / ratio}px`;
    if (!this.world || this.world.L.W !== W || this.world.L.H !== H || this.s !== s) {
      this.canvas.width = W * s;
      this.canvas.height = H * s;
      this.ctx.imageSmoothingEnabled = false;
      this.s = s;
      this.world = this.build(layout(W, H));
      this.puffs = [];
      this.bursts = [];
      if (this.still) this.stage();
    }
    if (!this.raf) this.draw();
  }

  run(on: boolean) {
    if (on && !this.raf && !this.disposed && !this.still) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else if (!on && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  /** Reduced motion: stop, and hold one composed frame. */
  setStill(still: boolean) {
    if (still === this.still) return;
    this.still = still;
    if (!still) return;
    this.run(false);
    this.stage();
    this.draw();
  }

  /** Pointer position across the viewport, -1 (left) to 1 (right); null lets the camera drift. */
  point(x: number | null) {
    this.aim = x;
  }

  dispose() {
    this.run(false);
    this.disposed = true;
    this.world = null;
  }

  private build(L: Layout): World {
    const sky = buildSky(L);
    const near = makeCanvas(L.W + MARGIN * 2, L.H);
    const r = seeded(59);
    return {
      L,
      sky,
      clouds: buildClouds(L, sky.at),
      hills: buildHills(L),
      trees: buildTrees(L),
      ground: buildGround(L),
      near,
      nearCtx: context(near),
      nearTop: Math.max(0, L.houseY - 36),
      slimes: makeSlimes(L, r),
      rupees: makeRupees(L, r),
      fireflies: makeFireflies(L, r),
    };
  }

  /** The still frame: Link halfway along the path, smoke already rising. */
  private stage() {
    const w = this.world;
    if (!w) return;
    this.t = 14.2;
    this.cam = 0;
    this.door = 0;
    this.hero.pose(w.L, Math.round(w.L.W * 0.29));
    this.puffs = [];
    for (let i = 0; i < 60; i++) updateSmoke(this.puffs, w.ground.house.smoke, 0.1, this.smokeClock, this.rand);
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    const w = this.world;
    if (!w) return;
    this.t += dt;
    // a slow sway of the camera; with a pointer, the near layers slide the
    // other way, as if you leaned to look past them
    const idle = Math.sin(this.t * 0.11) * 0.45;
    const target = this.aim === null ? idle : idle * 0.25 - this.aim * 0.8;
    this.cam += (target - this.cam) * (1 - Math.exp(-dt * 2.2));
    this.hero.update(dt, w.L);
    this.door += ((this.hero.doorOpen ? 1 : 0) - this.door) * (1 - Math.exp(-dt * 12));
    this.fire = 0.8 + 0.1 * Math.sin(this.t * 8.3) + 0.06 * Math.sin(this.t * 21.7 + 1.3) + 0.04 * Math.sin(this.t * 3.1);
    updateSlimes(w.slimes, this.hero, dt, this.rand);
    updateRupees(w.rupees, this.hero, this.bursts, dt, this.rand);
    updateSmoke(this.puffs, w.ground.house.smoke, dt, this.smokeClock, this.rand);
    updateMeteor(this.meteor, w.L, dt, this.rand);
    driftClouds(w.clouds, w.L.W, dt);
  }

  private frame(): Frame {
    return {
      t: this.t,
      still: this.still,
      s: this.s,
      cam: this.cam,
      door: this.door,
      fire: this.still ? 0.9 : this.fire,
      hero: this.hero,
      link: this.link,
      puffs: this.puffs,
      bursts: this.bursts,
      meteor: this.still ? null : this.meteor.current,
    };
  }

  private band(b: Band, x: number, w: World) {
    const LW = w.L.W + MARGIN * 2;
    const h = w.L.H - b.top;
    if (h > 0) this.ctx.drawImage(b.canvas, 0, b.top, LW, h, x, b.top * this.s, LW * this.s, h * this.s);
  }

  private draw() {
    const w = this.world;
    if (!w) return;
    const { ctx, s } = this;
    const f = this.frame();
    const LW = w.L.W + MARGIN * 2;
    const shift = (depth: number) => Math.round((this.cam * depth * PARALLAX - MARGIN) * s);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;

    const skyX = shift(DEPTH.sky);
    ctx.drawImage(w.sky.canvas, skyX, 0, LW * s, w.L.H * s);
    paintStars(ctx, w, f, skyX);
    for (const c of w.clouds) {
      ctx.drawImage(c.sprite, Math.round((c.x + this.cam * c.depth * PARALLAX) * s), c.y * s, c.sprite.width * s, c.sprite.height * s);
    }
    this.band(w.hills, shift(DEPTH.hills), w);
    this.band(w.trees, shift(DEPTH.trees), w);

    composeNear(w, f, this.art);
    const nearX = shift(DEPTH.near);
    const h = w.L.H - w.nearTop;
    ctx.drawImage(w.near, 0, w.nearTop, LW, h, nearX, w.nearTop * s, LW * s, h * s);
    paintFireflies(ctx, w, f);
    paintLights(ctx, w, f, this.art, skyX, nearX);
  }
}
