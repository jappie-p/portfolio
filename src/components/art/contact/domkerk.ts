import { Pen } from "./pen";
import type { Tower } from "./dom";
import { DOM, MINT, STONE, mix, rgba, shade } from "./palette";

// The Domkerk east of the tower, on the tower's own axis and scale. Since the
// nave fell in the storm of 1674 the Domplein lies open between them; here
// that gap is shortened to 12 m so both fit the margin. The north transept
// shows its gable with the great window, the choir runs on behind it with
// buttress piers, and a stair turret rises where they meet.
const R = -9.65 - 12;
const GABLE = 14;
const LEN = 38;
const BAYS = [R - 34, R - 28.5, R - 23, R - 17.5];

/** Leftmost point of the church in metres on the tower's axis. */
export const CHURCH_LEFT = R - LEN - 1;

function shell(s: Pen) {
  s.rect(R - GABLE, 0, R, 31).poly([R - GABLE - 0.2, 31, R - 7, 47.5, R + 0.2, 31]);
  s.rect(R - LEN, 0, R - GABLE, 17).rect(R - 36, 0, R - GABLE, 30);
  s.poly([R - 36.6, 30, R - 32.8, 42.6, R - GABLE - 0.4, 42.6, R - GABLE, 30]);
  for (const x of [R - GABLE - 0.1, R + 0.1]) s.rect(x - 0.85, 0, x + 0.85, 33.4).pinnacle(x, 33, 35.2, 0.6, 2.8);
  s.pinnacle(R - 7, 47, 48.4, 0.34, 1.7);
  for (const x of BAYS) {
    s.rect(x - 0.8, 0, x + 0.8, 22).rect(x - 0.55, 21, x + 0.55, 28.5).pinnacle(x, 28, 30.2, 0.45, 2.6);
    // flying buttress, seen from the side, from the pier to the clerestory
    s.poly([x + 0.4, 26.6, x + 2.7, 28.9, x + 2.7, 30.6, x + 0.4, 28.7]);
  }
  // the stair turret where choir and transept meet
  s.rect(R - 15.9, 0, R - 13.3, 46.5).poly([R - 16.1, 46.4, R - 14.6, 52.2, R - 13.1, 46.4]).circle(R - 14.6, 52.7, 0.32);
}

export function churchOutline(t: Tower): Path2D {
  const s = new Pen(t.x, t.ground, t.m);
  shell(s);
  return s.p;
}

/** Paints the church in the tower's colours, its tall windows glowing a
 *  little from inside, like stained glass on an evening with a concert. */
export function drawChurch(ctx: CanvasRenderingContext2D, t: Tower, outline: Path2D) {
  const Y = (my: number) => t.ground - my * t.m;
  const fill = (color: string | CanvasGradient, build: (s: Pen) => void) => {
    const s = new Pen(t.x, t.ground, t.m);
    build(s);
    ctx.fillStyle = color;
    ctx.fill(s.p);
  };
  ctx.fillStyle = rgba(MINT, 0.07);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) {
    ctx.translate(dx, dy);
    ctx.fill(outline);
    ctx.translate(-dx, -dy);
  }
  const body = ctx.createLinearGradient(0, Y(0), 0, Y(52));
  body.addColorStop(0, rgba(mix(DOM, STONE, 0.28)));
  body.addColorStop(1, rgba(shade(DOM, 0.94)));
  ctx.fillStyle = body;
  ctx.fill(outline);

  // the slate roof reads darker than the stone, the piers lighter
  fill(rgba(shade(DOM, 0.7)), (s) => s.poly([R - 36.6, 30, R - 32.8, 42.6, R - GABLE - 0.4, 42.6, R - GABLE, 30]));
  fill(rgba(mix(DOM, STONE, 0.55)), (s) => {
    for (const x of [R - GABLE - 0.1, R + 0.1]) s.rect(x - 0.85, 0, x + 0.85, 33.4).pinnacle(x, 33, 35.2, 0.6, 2.8);
    for (const x of BAYS) s.rect(x - 0.8, 0, x + 0.8, 22).rect(x - 0.55, 21, x + 0.55, 28.5).pinnacle(x, 28, 30.2, 0.45, 2.6);
    s.rect(R - GABLE, 30.6, R, 31.4);
  });

  const glass = ctx.createLinearGradient(0, Y(26), 0, Y(8));
  glass.addColorStop(0, "rgba(255,190,120,0.1)");
  glass.addColorStop(0.6, "rgba(255,170,96,0.2)");
  glass.addColorStop(1, "rgba(140,120,220,0.12)");
  fill(rgba(shade(DOM, 0.5)), (s) => {
    s.lancet(R - 11.3, R - 2.7, 8, 24.5, 0.78).lancet(R - 8.1, R - 5.9, 35.2, 39.6, 0.8);
    for (const x of BAYS.slice(0, 3)) s.lancet(x + 1.5, x + 4.0, 18.6, 25.6, 0.75);
  });
  fill(glass, (s) => {
    s.lancet(R - 11.3, R - 2.7, 8, 24.5, 0.78);
    for (const x of BAYS.slice(0, 3)) s.lancet(x + 1.5, x + 4.0, 18.6, 25.6, 0.75);
  });
  // tracery: mullions in the great window
  fill(rgba(shade(DOM, 0.85)), (s) => {
    for (const x of [R - 9.2, R - 7.0, R - 4.8]) s.rect(x - 0.12, 8, x + 0.12, 26.5);
    s.rect(R - 11.3, 17.2, R - 2.7, 17.5);
  });
}
