import { aim, BeamPainter, leadColours, type Beam } from "./beams";
import { Confetti } from "./confetti";
import { drawRow, makeCrowd, type Phone, type Row } from "./crowd";
import { computeLayout, type Layout } from "./layout";
import { LedWall } from "./led";
import { between, rng, type Rng } from "./math";
import { LIGHTS, V, VERMILION, W, mix, rgba, type RGB } from "./palette";
import { drawSky } from "./sky";
import { Sparks } from "./sparks";
import { buildStage, drawStage, panelRect, type Stage } from "./stage";
import { canvas, ctx2d, glowSprite, smokeTexture } from "./sprites";
import { DROP, PHRASE, PUFF, dropLevel, hype, kick, toBeat } from "./tempo";

export type Mode = "live" | "paused" | "still";

/** Light is soft, so it is painted at half the CSS resolution and scaled up. */
const LIGHT_SCALE = 0.5;
/** The still frame: just after the first drop, with the confetti in the air. */
const STILL_AT = 1.7;
const PINK: RGB = [255, 96, 120];

type Haze = { x: number; y: number; rx: number; ry: number; sprite: number; a: number; speed: number; phase: number };

/** The whole festival scene on one canvas. Static parts (sky, stage) are
 *  painted once per size into their own canvases; each frame composes them
 *  with the LED wall, the light, the crowd, the sparks and the confetti. */
export class FestivalScene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sky = canvas(1, 1);
  private readonly stage = canvas(1, 1);
  private readonly light = canvas(1, 1);
  private readonly lctx: CanvasRenderingContext2D;
  private readonly glows = [...LIGHTS.map((c) => glowSprite(c)), glowSprite(PINK), glowSprite(VERMILION)];
  private readonly smoke: CanvasPattern | null;
  private readonly confetti = new Confetti();
  private readonly sparks = new Sparks();
  private readonly beams: Beam[] = [];
  private readonly phones: Phone[] = [];

  private L: Layout | null = null;
  private S: Stage | null = null;
  private led: LedWall | null = null;
  private painter: BeamPainter | null = null;
  private rows: Row[] = [];
  private haze: Haze[] = [];
  private calm: CanvasGradient | null = null;
  private dpr = 1;

  private mode: Mode = "paused";
  private t = 0;
  private lastBeat = -1;
  private r: Rng = rng(4242);
  private raf = 0;
  private prev = 0;

  constructor(private readonly el: HTMLCanvasElement) {
    this.ctx = ctx2d(el);
    this.lctx = ctx2d(this.light);
    this.smoke = this.lctx.createPattern(smokeTexture(), "repeat");
  }

  resize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.el.width = Math.round(w * dpr);
    this.el.height = Math.round(h * dpr);
    const L = computeLayout(w, h);
    this.L = L;

    this.sky.width = Math.round(w);
    this.sky.height = Math.round(h);
    drawSky(ctx2d(this.sky), L);

    const S = buildStage(L, dpr);
    this.S = S;
    const bw = S.box.x1 - S.box.x0;
    const bh = S.box.y1 - S.box.y0;
    this.stage.width = Math.round(bw * dpr);
    this.stage.height = Math.round(bh * dpr);
    const sc = ctx2d(this.stage);
    sc.setTransform(dpr, 0, 0, dpr, -S.box.x0 * dpr, -S.box.y0 * dpr);
    drawStage(sc, L, S);

    this.led = new LedWall(S.wall, dpr, this.ctx);
    this.rows = makeCrowd(L);

    this.light.width = Math.round(w * LIGHT_SCALE);
    this.light.height = Math.round(h * LIGHT_SCALE);
    this.painter = new BeamPainter(this.lctx, Math.hypot(w, h));
    const calm = this.lctx.createLinearGradient(L.calm.axis === "x" ? L.calm.from : 0, L.calm.axis === "y" ? L.calm.from : 0, L.calm.axis === "x" ? L.calm.to : 0, L.calm.axis === "y" ? L.calm.to : 0);
    calm.addColorStop(0, "rgba(0,0,0,0)");
    calm.addColorStop(1, "rgba(0,0,0,0.82)");
    this.calm = calm;
    this.haze = makeHaze(L);

    if (this.mode === "still") this.pose();
    if (this.mode !== "live") this.draw();
  }

  setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === "live") return this.start();
    this.stop();
    if (mode === "still") this.pose();
    this.draw();
  }

  dispose() {
    this.stop();
    for (const c of [this.sky, this.stage, this.light]) c.width = c.height = 0;
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
    const dt = Math.min(0.05, Math.max(0, (now - this.prev) / 1000));
    this.prev = now;
    this.advance(dt);
    this.draw();
  };

  /** Replays the opening from silence to the still moment, deterministically. */
  private pose() {
    if (!this.L) return;
    this.t = 0;
    this.lastBeat = -1;
    this.r = rng(4242);
    this.confetti.clear();
    this.sparks.clear();
    while (this.t < STILL_AT - 1e-6) this.advance(Math.min(1 / 60, STILL_AT - this.t));
  }

  private advance(dt: number) {
    const L = this.L;
    if (!L) return;
    this.t += dt;
    const beat = Math.floor(toBeat(this.t));
    for (let b = this.lastBeat + 1; b <= beat; b++) this.onBeat(b, L);
    this.lastBeat = beat;
    this.confetti.step(dt, L);
    // the fountains burn for the first beat and a half after every drop
    const b = toBeat(this.t);
    if (this.S && b >= DROP && (b - DROP) % PHRASE < 1.5) this.sparks.emit(this.r, this.S.fountains, 70, dt, L.u);
    this.sparks.step(dt, L.u);
  }

  private onBeat(b: number, L: Layout) {
    const S = this.S;
    if (!S || b < DROP) return;
    const at = (b - DROP) % PHRASE;
    const [left, right] = S.cannons;
    // on the calm side the right cannon leans in, so the copy stays clear
    const leanR = L.wide ? -0.22 : 0.12;
    if (at === 0) {
      this.confetti.burst(this.r, left.x, left.y, -0.12, 110, L.u);
      this.confetti.burst(this.r, right.x, right.y, leanR, 90, L.u);
      this.confetti.rain(this.r, Math.max(0, L.stageL - 120 * L.u), L.wide ? L.calm.from : L.w, 70, L.u);
    } else if (at === PUFF - DROP) {
      const c = (b / PHRASE) % 2 < 1 ? left : right;
      this.confetti.burst(this.r, c.x, c.y, c === left ? -0.1 : leanR, 45, L.u, 0.85);
    }
  }

  private draw() {
    const { L, S, led, painter } = this;
    if (!L || !S || !led || !painter) return;
    const { ctx, dpr } = this;
    const beat = toBeat(this.t);
    const k = kick(beat - Math.floor(beat));
    const drop = dropLevel(beat);
    const hy = hype(beat);
    aim(S.fixtures, beat, drop, this.beams);
    led.paint(beat, drop);
    this.paintLight(L, S, led, beat, k, drop);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(this.sky, 0, 0, L.w, L.h);
    led.blit(ctx);
    ctx.drawImage(this.stage, S.box.x0, S.box.y0, S.box.x1 - S.box.x0, S.box.y1 - S.box.y0);

    const rim = this.rimFill(L, beat, drop);
    const rimAlpha = 0.7 + 0.3 * k + 0.4 * drop;
    const bottom = L.h + 20;
    this.phones.length = 0;
    // the back row stands in the haze, so the light goes over it
    drawRow(ctx, this.rows[0], beat, hy, rim, rimAlpha, bottom, null);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(this.light, 0, 0, L.w, L.h);
    this.hotSpots(L);
    ctx.globalCompositeOperation = "source-over";
    this.sparks.draw(ctx, L);
    drawRow(ctx, this.rows[1], beat, hy, rim, rimAlpha, bottom, this.phones);
    drawRow(ctx, this.rows[2], beat, hy, rim, rimAlpha, bottom, this.phones);
    this.phoneScreens(L);
    this.confetti.draw(ctx, L, dpr);
  }

  private paintLight(L: Layout, S: Stage, led: LedWall, beat: number, k: number, drop: number) {
    const l = this.lctx;
    const { u, cx, roof, deck } = L;
    const span = L.stageR - L.stageL;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = "source-over";
    l.globalAlpha = 1;
    l.clearRect(0, 0, this.light.width, this.light.height);
    l.setTransform(LIGHT_SCALE, 0, 0, LIGHT_SCALE, 0, 0);
    l.globalCompositeOperation = "lighter";

    // the glow over the stage, breathing with the kick
    this.stamp(l, 4, cx, roof + 70 * u, span * 0.8, span * 0.5, 0.14 + 0.08 * k + 0.3 * drop);
    // the screens' own pixels, blurred by the scaling, bloom into the haze
    const { main, header } = S.wall;
    led.bloom(l, main, 1.2, 0.42 + 0.2 * k);
    led.bloom(l, main, 2, 0.14);
    led.bloom(l, header, 1.35, 0.5 + 0.3 * k);
    const hr = panelRect(S.wall, header);
    this.stamp(l, 5, hr.x + hr.w / 2, hr.y + hr.h / 2, hr.w * 0.95, hr.h * 1.15, 0.3 + 0.25 * k + 0.2 * drop);

    // haze banks drifting through the rig
    const t = this.t;
    for (const hz of this.haze) {
      const x = hz.x + Math.sin(t * hz.speed + hz.phase) * 40 * u;
      this.stamp(l, hz.sprite, x, hz.y, hz.rx, hz.ry, hz.a * (0.85 + 0.15 * k + 0.5 * drop));
    }
    // low fog rolling along the deck
    const lane = span + 160 * u;
    for (let i = 0; i < 6; i++) {
      const x = L.stageL - 80 * u + wrap((i / 6) * lane + t * 9 * u * (i % 2 ? 1 : -1), lane);
      this.stamp(l, i % 2 ? 1 : 4, x, deck - 2 * u, 150 * u, 30 * u, 0.13 + 0.06 * k);
    }

    this.painter?.draw(l, this.beams, u);

    // lens flares where the beams leave the fixtures, with a thin anamorphic
    // streak through the ones on the roof, as a cinema lens draws them
    for (const b of this.beams) {
      this.stamp(l, b.color, b.x, b.y, 22 * u, 22 * u, 0.42 * b.power);
      this.stamp(l, 3, b.x, b.y, 8 * u, 8 * u, 0.6 * b.power);
      if (b.y < roof) this.stamp(l, 1, b.x, b.y, 90 * u, 2.4 * u, 0.3 * b.power);
    }

    // carve the light into drifting smoke, then hush it behind the copy
    l.globalCompositeOperation = "destination-out";
    if (this.smoke) {
      this.smoke.setTransform(new DOMMatrix().translateSelf(-t * 14 * u, -t * 6 * u).scaleSelf((440 * u) / 128, (230 * u) / 128));
      l.globalAlpha = 0.42;
      l.fillStyle = this.smoke;
      l.fillRect(0, 0, L.w, L.h);
    }
    if (this.calm) {
      l.globalAlpha = 1;
      l.fillStyle = this.calm;
      l.fillRect(0, 0, L.w, L.h);
    }
    l.globalCompositeOperation = "source-over";
    l.globalAlpha = 1;
  }

  /** Crisp white points at the lenses, over the soft flares. */
  private hotSpots(L: Layout) {
    const ctx = this.ctx;
    ctx.fillStyle = "#ffffff";
    for (const b of this.beams) {
      ctx.globalAlpha = Math.min(1, 0.8 * b.power);
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.5 * L.u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** The rim light on the crowd: hottest in front of the wall, tinted by the
   *  lead colours toward the wings, fading out behind the copy. */
  private rimFill(L: Layout, beat: number, drop: number): CanvasGradient {
    const [a, b] = leadColours(beat);
    const hot = mix(LIGHTS[V], [255, 255, 255], 0.22 + 0.4 * drop);
    const g = this.ctx.createLinearGradient(0, 0, L.w, 0);
    const at = (x: number) => Math.min(1, Math.max(0, x / L.w));
    const stops: [number, string][] = [
      [0, rgba(LIGHTS[a], 0.12)],
      [at(L.stageL), rgba(LIGHTS[a], 0.55)],
      [at(L.cx), rgba(hot, 1)],
      [at(L.stageR), rgba(LIGHTS[b], 0.55)],
    ];
    if (L.wide) stops.push([at(L.calm.from), rgba(LIGHTS[b], 0.22)], [at(L.calm.to), rgba(LIGHTS[W], 0.04)]);
    stops.push([1, rgba(LIGHTS[b], L.wide ? 0.03 : 0.12)]);
    let last = 0;
    for (const [o, c] of stops) {
      last = Math.max(last, o);
      g.addColorStop(last, c);
    }
    return g;
  }

  private phoneScreens(L: Layout) {
    const ctx = this.ctx;
    if (!this.phones.length) return;
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.phones) this.stamp(ctx, 3, p.x + p.w / 2, p.y + p.h / 2, 16 * L.u, 16 * L.u, 0.22);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(196,216,246,0.82)";
    for (const p of this.phones) ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  private stamp(ctx: CanvasRenderingContext2D, sprite: number, x: number, y: number, rx: number, ry: number, a: number) {
    if (a <= 0.004) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(this.glows[sprite], x - rx, y - ry, rx * 2, ry * 2);
  }
}

const wrap = (v: number, m: number) => ((v % m) + m) % m;

function makeHaze(L: Layout): Haze[] {
  const r = rng(77);
  const { u, cx, roof, deck } = L;
  const span = L.stageR - L.stageL;
  return Array.from({ length: 8 }, (_, i) => ({
    x: cx + between(r, -0.8, 0.8) * span,
    y: between(r, roof - 40 * u, deck),
    rx: between(r, 160, 300) * u,
    ry: between(r, 90, 170) * u,
    sprite: i < 2 ? 5 : i % 3 === 0 ? 1 : i % 3 === 1 ? 3 : 4,
    a: between(r, 0.035, 0.08),
    speed: between(r, 0.08, 0.2),
    phase: r() * 6,
  }));
}
