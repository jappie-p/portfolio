import { Beacon, RING_DELAY, RING_TIME } from "./beacon";
import { Boats } from "./boats";
import { drawQuay, drawRailing, makeQuay, type Lamp } from "./canal";
import { Cyclist } from "./cyclist";
import { drawTower, lanternOf, towerOutline, type Lantern, type Tower } from "./dom";
import { CHURCH_LEFT, churchOutline, drawChurch } from "./domkerk";
import { drawHouses, makeHouses } from "./houses";
import { computeLayout, type Layout } from "./layout";
import { Occluder } from "./occlusion";
import { drawOldTown, makeOldTown } from "./oldtown";
import { HAZE, LAMP, rgba } from "./palette";
import { GLOW_MAX, Sky } from "./sky";
import { drawFar, makeFar } from "./skyline";
import { canvas, ctx2d, glowSprite, layer } from "./sprites";
import { drawTrees, makeTrees } from "./trees";
import { Canal } from "./water";
import { IN_CELLARS, IN_FAR, IN_HOUSES, IN_OLD, Windows } from "./windows";

export type Mode = "live" | "paused" | "still";

/** Air between the layers: whatever is drawn so far sinks a little further
 *  into the glow. */
function haze(c: CanvasRenderingContext2D, L: Layout, a: number) {
  c.save();
  c.globalCompositeOperation = "source-atop";
  c.fillStyle = rgba(HAZE, a);
  c.fillRect(0, L.bandTop - 300 * L.u, L.w, L.street - L.bandTop + 300 * L.u);
  c.restore();
}

/** The scene's clock starts here, and the still frame is taken here. */
const START = 14;

type Sheet = { c: HTMLCanvasElement; top: number; h: number };

/** Utrecht at night on one canvas. What never moves (the whole skyline, the
 *  trees and the quay) is painted once per size into two sheets; each frame
 *  lays the sky, the city sheet, its lit rooms, the lantern, the front sheet
 *  and the canal over each other. */
export class ContactScene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sky = new Sky();
  private readonly canal = new Canal();
  private readonly beacon = new Beacon();
  private readonly cyclist = new Cyclist();
  private readonly boats = new Boats();
  private readonly lampGlow = glowSprite(LAMP, 64);
  private city: Sheet = { c: canvas(1, 1), top: 0, h: 1 };
  private front: Sheet = { c: canvas(1, 1), top: 0, h: 1 };
  private L: Layout | null = null;
  private lantern: Lantern | null = null;
  private windows: Windows | null = null;
  private lamps: Lamp[] = [];
  private reds: { x: number; y: number }[] = [];
  private dpr = 1;
  private mode: Mode = "paused";
  private t = START;
  private sends = 0;
  private raf = 0;
  private prev = 0;

  constructor(private readonly el: HTMLCanvasElement) {
    this.ctx = ctx2d(el);
  }

  resize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.el.width = Math.round(w * dpr);
    this.el.height = Math.round(h * dpr);
    const L = computeLayout(w, h);
    this.L = L;
    const tower: Tower = { x: L.domX, ground: L.street, m: L.m };
    const domH = 112.5 * L.m;
    const domTop = L.street - domH;
    const keep: [number, number] = [L.domX + CHURCH_LEFT * L.m - 26 * L.u, L.domX + 9.65 * L.m + 26 * L.u];

    const houses = makeHouses(L);
    const quay = makeQuay(L, houses);
    this.lamps = quay.lamps;
    this.boats.build(L, quay);
    const trees = makeTrees(L, quay);
    const old = makeOldTown(L, keep);
    const far = makeFar(L, keep);
    const towerPath = towerOutline(tower);
    const churchPath = churchOutline(tower);

    // which rooms of the old town and the far towers can be seen at all
    const occ = new Occluder(w, Math.min(L.bandTop - 60 * L.u, domTop), L.street + 4);
    for (const hs of houses) {
      occ.fill(hs.outline);
      if (hs.roof) occ.fill(hs.roof);
    }
    occ.fill(towerPath);
    occ.fill(churchPath);
    occ.snapshot();
    const oldPanes = occ.visible(old.panes);
    for (const p of [old.roofs, old.slate, old.spires]) occ.fill(p);
    occ.snapshot();
    const farPanes = occ.visible(far.panes);
    this.reds = occ.visible(far.reds.map((p) => ({ x: p.x, y: p.y, w: 0, h: 0, shop: false, life: 0 })));
    occ.dispose();

    // the city sheet, far to near: towers on the horizon, the old town, the
    // Domkerk and the Dom, the canal houses
    this.free();
    const top = Math.floor(domTop - 6);
    const [cityC, c] = layer(w, L.street + 4 - top, dpr);
    c.translate(0, -top);
    drawFar(c, L, far);
    haze(c, L, 0.13);
    drawOldTown(c, L, old);
    haze(c, L, 0.05);
    drawChurch(c, tower, churchPath);
    drawTower(c, tower, towerPath);
    drawHouses(c, L, houses, quay.lamps);
    this.city = { c: cityC, top, h: L.street + 4 - top };

    // the front sheet: trees, the quay with its lamps, the railing
    const ftop = Math.floor(L.street - 125 * L.u);
    const [frontC, f] = layer(w, L.wharf + 1 - ftop, dpr);
    f.translate(0, -ftop);
    drawTrees(f, L, trees, quay.lamps);
    drawQuay(f, L, quay, this.lampGlow);
    drawRailing(f, L, quay);
    this.front = { c: frontC, top: ftop, h: L.wharf + 1 - ftop };

    this.lantern = lanternOf(tower, this.ctx);
    this.sky.build(L, domTop, domH);
    this.canal.build(L, dpr, { city: cityC, cityTop: top, front: frontC, frontTop: ftop, glow: this.sky.glow, glowAlpha: 1 / GLOW_MAX }, this.ctx);
    this.windows = new Windows(
      L,
      [
        [IN_FAR, farPanes],
        [IN_OLD, oldPanes],
        [IN_HOUSES, houses.flatMap((x) => x.panes)],
        [IN_CELLARS, quay.cellars],
      ],
      7,
    );
    // a resize after a send keeps the city as bright as the send left it
    for (let i = 0; i < this.sends; i++) this.windows.wave(this.t, L.domX, 1e9);
    if (this.sends) this.windows.settle(this.t);
    if (this.mode !== "live") this.draw();
  }

  setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === "live") return this.start();
    this.stop();
    this.draw();
  }

  /** The contact form was sent: light the beacon (or, when nothing may move,
   *  show the city it leaves behind). */
  fire() {
    const { L, windows } = this;
    this.sends++;
    // before the first size there is nothing to light: the first build
    // replays the sends, so only the lantern needs telling
    if (!L || !windows) return this.beacon.settle(this.t);
    if (this.mode === "live") {
      this.beacon.fire(this.t);
      windows.wave(this.t + RING_DELAY, L.domX, this.reach(L) / RING_TIME);
      return;
    }
    this.beacon.settle(this.t);
    windows.wave(this.t, L.domX, 1e9);
    windows.settle(this.t);
    this.draw();
  }

  dispose() {
    this.stop();
    this.free();
    this.el.width = this.el.height = 0;
  }

  private free() {
    for (const s of [this.city, this.front]) s.c.width = s.c.height = 0;
  }

  private reach(L: Layout) {
    return Math.max(L.domX, L.w - L.domX) + 60 * L.u;
  }

  private start() {
    if (this.raf) return;
    this.prev = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    this.t += Math.min(0.05, Math.max(0, (now - this.prev) / 1000));
    this.prev = now;
    this.windows?.step(this.t);
    this.draw();
  };

  private draw() {
    const { L, lantern, windows, ctx, dpr, t } = this;
    if (!L || !lantern || !windows) return;
    const moving = this.mode !== "still";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L.w, L.h);

    const glow = this.beacon.glow(t);
    this.sky.drawGlow(ctx, L, glow);
    this.sky.drawStars(ctx, t);
    this.sky.drawCloud(ctx, L, t, glow - 1);
    if (moving) this.sky.drawPlane(ctx, L, t);
    this.beacon.drawSky(ctx, lantern, t, this.reach(L), L.h, L.u);

    ctx.drawImage(this.city.c, 0, this.city.top, L.w, this.city.h);
    this.sky.drawReds(ctx, this.reds, t, L.u);
    windows.drawCity(ctx, t);
    this.beacon.drawLantern(ctx, lantern, t);
    if (moving) this.cyclist.draw(ctx, L, t);
    ctx.drawImage(this.front.c, 0, this.front.top, L.w, this.front.h);
    windows.drawCellars(ctx, t);
    this.canal.draw(ctx, L, t, windows, this.lamps, this.beacon.lantern(t));
    this.boats.draw(ctx, L, t);
  }
}
