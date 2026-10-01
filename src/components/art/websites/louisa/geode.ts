import { edgeFade, headerBand, PAGE_BG, paintGrain, radial } from "../lib/canvas";
import { mulberry32 } from "../lib/rng";
import { lip, onLip, type Wall } from "./wall";

type Band = { at: number; fill: string; line?: string };

// from the cavity back into the rock: a quartz lip, agate banding, then crust
const BANDS: Band[] = [
  { at: 1.0, fill: "rgba(190,170,250,0.16)", line: "rgba(237,233,254,0.34)" },
  { at: 0.965, fill: "rgba(70,40,130,0.72)" },
  { at: 0.935, fill: "rgba(150,120,230,0.3)", line: "rgba(221,214,254,0.22)" },
  { at: 0.905, fill: "rgba(40,24,78,0.9)" },
  { at: 0.87, fill: "rgba(110,80,190,0.42)" },
  { at: 0.85, fill: "rgba(30,20,56,0.95)", line: "rgba(196,181,253,0.2)" },
  { at: 0.8, fill: "rgba(88,60,150,0.5)" },
  { at: 0.782, fill: "rgba(226,220,250,0.2)" },
  { at: 0.77, fill: "rgba(24,17,42,0.96)" },
  { at: 0.72, fill: "rgba(64,44,112,0.6)", line: "rgba(196,181,253,0.14)" },
  { at: 0.68, fill: "rgba(20,15,34,0.97)" },
  { at: 0.655, fill: "rgba(120,100,170,0.26)" },
  { at: 0.635, fill: "rgba(17,13,27,1)" },
];

/**
 * One corner of the geode wall: rough crust in the corner, wavy agate bands
 * that follow the cavity, a quartz lip dusted with druzy sparkle where the
 * crystals root.
 */
function paintWall(ctx: CanvasRenderingContext2D, wall: Wall) {
  const rnd = mulberry32(wall.seed);
  const steps = 240;
  const curve = (k: number, jitter: number, ph: number) => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const r = lip(wall, a, k) + Math.sin(a * 9 + ph) * jitter + Math.sin(a * 23 + ph * 2) * jitter * 0.4;
      const x = wall.cx + Math.cos(a) * r;
      const y = wall.cy + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };

  const mid = (wall.from + wall.to) / 2;
  const [gx, gy] = onLip(wall, mid);
  // a soft lilac spill where the crystals catch the light
  radial(ctx, gx, gy, wall.r * 1.5, [
    [0, "rgba(167,139,250,0.14)"],
    [1, "rgba(167,139,250,0)"],
  ]);
  for (const b of BANDS) {
    curve(b.at, wall.r * 0.006, rnd() * 6);
    ctx.fillStyle = b.fill;
    ctx.fill();
    if (b.line) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = b.line;
      ctx.stroke();
    }
  }
  // the fine hairlines agate is known for, between the broad bands
  for (let i = 0; i < 10; i++) {
    curve(0.66 + rnd() * 0.32, wall.r * 0.004, rnd() * 6);
    ctx.lineWidth = 0.5 + rnd() * 0.5;
    ctx.strokeStyle = `rgba(226,218,255,${0.05 + rnd() * 0.12})`;
    ctx.stroke();
  }
  // crust: rough, dark, speckled
  curve(0.61, wall.r * 0.03, 1);
  ctx.fillStyle = "#0c0a10";
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 300; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * lip(wall, a, 0.6);
    ctx.fillStyle = `rgba(${140 + rnd() * 60},${130 + rnd() * 50},${150 + rnd() * 60},${0.03 + rnd() * 0.07})`;
    ctx.fillRect(wall.cx + Math.cos(a) * r, wall.cy + Math.sin(a) * r, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.restore();
  // druzy: tiny crystals glinting all along the lip
  for (let i = 0; i < 520; i++) {
    const a = rnd() * Math.PI * 2;
    const r = lip(wall, a, 0.97 + rnd() * 0.1);
    const s = 0.5 + rnd() * rnd() * 2.2;
    ctx.fillStyle = rnd() < 0.3 ? `rgba(255,255,255,${0.25 + rnd() * 0.6})` : `rgba(200,180,255,${0.15 + rnd() * 0.45})`;
    ctx.fillRect(wall.cx + Math.cos(a) * r, wall.cy + Math.sin(a) * r, s, s);
  }
}

/** Everything that holds still: the velvet dark, the light behind the site,
 *  the walls. Crystals that do not move are painted on top by the scene. */
export function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, walls: Wall[], glow: { x: number; y: number }) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, w, h);
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, "#07060d");
  base.addColorStop(0.5, "#0a0712");
  base.addColorStop(1, "#07060c");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const m = Math.max(w, h);
  radial(ctx, w * glow.x, h * glow.y, m * 0.55, [
    [0, "rgba(124,58,237,0.2)"],
    [0.35, "rgba(88,28,135,0.09)"],
    [1, "rgba(0,0,0,0)"],
  ], 0.75);
  radial(ctx, w * 0.84, h * 0.16, m * 0.34, [
    [0, "rgba(244,114,182,0.09)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  radial(ctx, w * 0.64, h * 0.98, m * 0.3, [
    [0, "rgba(45,212,191,0.06)"],
    [1, "rgba(0,0,0,0)"],
  ], 0.6);
  walls.forEach((wall) => paintWall(ctx, wall));
}

/** Last touches over the finished still layer: edges into the page, grain. */
export function finishBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  edgeFade(ctx, w, h, 0.07, headerBand(w));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintGrain(ctx, w * dpr, h * dpr, 0.06);
}
