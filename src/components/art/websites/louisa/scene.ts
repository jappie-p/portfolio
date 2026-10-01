import { panelAnchors } from "../lib/anchors";
import { context, fadeTop, headerBand, makeCanvas, sizeCanvas } from "../lib/canvas";
import { mulberry32 } from "../lib/rng";
import type { CanvasScene } from "../lib/types";
import { finishBackdrop, paintBackdrop } from "./geode";
import { louisaLayout, type Bokeh } from "./layout";
import { BodyRenderer, type Glint } from "./render";
import { starSprite } from "./sparkle";
import { onLip } from "./wall";

interface Twinkle {
  x: number;
  y: number;
  size: number;
  rate: number;
  phase: number;
}

const PARALLAX = 18;
const MAX_GLINTS = 12;

const bokehCache = new Map<string, HTMLCanvasElement>();

/** A lens-bokeh disc: even fill, a slightly brighter rim, soft edge. */
function bokehSprite(rgb: string): HTMLCanvasElement {
  const hit = bokehCache.get(rgb);
  if (hit) return hit;
  const s = 128;
  const c = makeCanvas(s, s);
  const ctx = context(c);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, `rgba(${rgb},0.55)`);
  g.addColorStop(0.7, `rgba(${rgb},0.6)`);
  g.addColorStop(0.86, `rgba(${rgb},0.7)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  bokehCache.set(rgb, c);
  return c;
}

/** Louisa's world: inside a geode, amethyst and rose quartz growing from
 *  banded agate walls, labradorite drifting, glints where facets catch light. */
export function createLouisaScene(host: HTMLElement): CanvasScene {
  const bg = host.querySelector<HTMLCanvasElement>('canvas[data-layer="bg"]')!;
  const fx = host.querySelector<HTMLCanvasElement>('canvas[data-layer="fx"]')!;
  const bctx = context(bg, { alpha: false });
  const ctx = context(fx);
  const star = starSprite();
  let bodies: BodyRenderer[] = [];
  let bokeh: Bokeh[] = [];
  let twinkles: Twinkle[] = [];
  let W = 0;
  let R = 1;
  const glints: Glint[] = [];

  const drawStar = (x: number, y: number, size: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(star, x - size / 2, y - size / 2, size, size);
  };

  return {
    resize(w, h, dpr) {
      W = w;
      R = dpr;
      sizeCanvas(bg, w, h, dpr);
      sizeCanvas(fx, w, h, dpr);
      const layout = louisaLayout(w, h, panelAnchors(host));
      paintBackdrop(bctx, w, h, dpr, layout.walls, layout.glow);
      // the dense bed of small crystals holds still, so it is painted once
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const bed of layout.beds) new BodyRenderer(bed).draw(bctx, 0, 0, 0, 0, 0, [], 0.6);
      finishBackdrop(bctx, w, h, dpr);
      bodies = layout.bodies.sort((a, b) => a.depth - b.depth).map((b) => new BodyRenderer(b));
      bokeh = layout.bokeh;
      const rnd = mulberry32(5);
      twinkles = layout.walls.flatMap((wall) =>
        Array.from({ length: 18 }, () => {
          const [x, y] = onLip(wall, wall.from + (wall.to - wall.from) * rnd(), 1 + rnd() * 0.12);
          return { x, y, size: 7 + rnd() * 10, rate: 0.12 + rnd() * 0.25, phase: rnd() * 10 };
        }),
      );
    },
    draw(t, px, py) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, fx.width, fx.height);
      ctx.setTransform(R, 0, 0, R, 0, 0);

      glints.length = 0;
      for (const r of bodies) {
        const d = r.body.depth;
        r.draw(ctx, t, -px * PARALLAX * d, -py * PARALLAX * d * 0.7, px * 0.09, -py * 0.07, glints, 0.75);
      }

      ctx.globalCompositeOperation = "lighter";
      for (const tw of twinkles) {
        const k = Math.max(0, Math.sin(t * tw.rate * Math.PI * 2 + tw.phase)) ** 14;
        if (k > 0.02) drawStar(tw.x - px * PARALLAX * 0.3, tw.y - py * PARALLAX * 0.2, tw.size * (0.5 + k), k * 0.85);
      }
      glints.sort((a, b) => b.k - a.k);
      for (let i = 0; i < Math.min(MAX_GLINTS, glints.length); i++) {
        const g = glints[i];
        drawStar(g.x, g.y, 14 + 30 * g.k, Math.min(1, g.k * 1.2));
      }
      bokeh.forEach((b, i) => {
        const dx = Math.sin(t * 0.07 + i * 1.7) * b.r * 0.3 - px * PARALLAX * 2.2;
        const dy = Math.cos(t * 0.05 + i * 2.3) * b.r * 0.25 - py * PARALLAX * 1.6;
        ctx.globalAlpha = b.alpha * (0.75 + 0.25 * Math.sin(t * 0.3 + i));
        ctx.drawImage(bokehSprite(b.rgb), b.x + dx - b.r, b.y + dy - b.r, b.r * 2, b.r * 2);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      fadeTop(ctx, W, headerBand(W));
    },
  };
}
