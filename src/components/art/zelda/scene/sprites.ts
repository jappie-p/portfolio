import { grade, mix, type Grade, type Rgb } from "./color";
import { ACTOR, GAME, MOONLIGHT } from "./palette";
import { Raster } from "./raster";

/** The game's tall grass (five two-pixel blades on a 16-pixel tile) in three
 *  sway poses, neighbouring blades leaning opposite ways as in the game. At
 *  night each blade gets a lit and a shaded side and a pointed, moonlit tip,
 *  or it would melt into the grass behind it. */
export function tuftFrames(g: Grade): HTMLCanvasElement[] {
  const tip = mix(grade(GAME.bladeHi, g), MOONLIGHT, 0.3);
  const lit = mix(grade(GAME.bladeHi, g), grade(GAME.bladeMid, g), 0.5);
  const low = grade(GAME.tree, g);
  const shade = grade(GAME.treeShadow, g);
  const root = grade(GAME.bushDeep, g);
  const blades = [
    [1, 8],
    [4, 11],
    [7, 9],
    [10, 11],
    [13, 7],
  ];
  return [-1, 0, 1].map((sway) => {
    const r = new Raster(16, 11);
    blades.forEach(([bx, h], i) => {
      const lean = i % 2 ? -sway : sway;
      for (let j = 0; j < h; j++) {
        const y = 10 - j;
        // the top half bends with the breeze, the roots stay put
        const x = Math.max(0, Math.min(14, bx + (j > h / 2 ? lean : 0)));
        const top = j === h - 1;
        const upper = j >= h - 3;
        r.set(x, y, top || upper ? tip : j > h * 0.45 ? lit : low);
        if (!top) r.set(x + 1, y, upper ? lit : j > 2 ? shade : root);
      }
    });
    return r.canvas();
  });
}

function ellipse(r: Raster, x: number, y: number, w: number, h: number, fill: Rgb, line: Rgb) {
  const cx = x + w / 2 - 0.5;
  const cy = y + h / 2 - 0.5;
  const inside = (i: number, j: number) => ((i - cx) / (w / 2)) ** 2 + ((j - cy) / (h / 2)) ** 2 <= 1;
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (!inside(i, j)) continue;
      const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
      r.set(i, j, edge ? line : fill);
    }
  }
}

/** The game's slime (a green blob with white eyes) in its two wobble frames,
 *  plus a stretched pose for mid-hop. A two-pixel gel glint catches the moon. */
export function slimeFrames(): HTMLCanvasElement[] {
  const body = grade(GAME.slime, ACTOR);
  const line = grade(GAME.slimeDark, ACTOR);
  const glint = mix(body, [200, 255, 210], 0.55);
  const eye = grade(GAME.white, ACTOR);
  const poses = [
    { x: 2, y: 4, w: 12, h: 10, eyeY: 6 },
    { x: 2, y: 6, w: 12, h: 8, eyeY: 8 },
    { x: 3, y: 2, w: 10, h: 12, eyeY: 5 },
  ];
  return poses.map(({ x, y, w, h, eyeY }) => {
    const r = new Raster(16, 16);
    ellipse(r, x, y, w, h, body, line);
    r.rect(4, eyeY, 2, 2, eye);
    r.rect(9, eyeY, 2, 2, eye);
    r.set(5, eyeY + 1, GAME.black);
    r.set(10, eyeY + 1, GAME.black);
    r.set(x + 2, y + 2, glint);
    r.set(x + 3, y + 2, glint);
    return r.canvas();
  });
}

/** A pixel shadow for anything standing on the ground: a darker core in a lighter rim. */
export function shadowSprite(w: number, h: number): HTMLCanvasElement {
  const r = new Raster(w, h);
  const cx = w / 2 - 0.5;
  const cy = h / 2 - 0.5;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const d = ((i - cx) / (w / 2)) ** 2 + ((j - cy) / (h / 2)) ** 2;
      if (d <= 1) r.set(i, j, [2, 6, 16], d < 0.45 ? 96 : 56);
    }
  }
  return r.canvas();
}

const RUPEE = [
  "..OOO..",
  ".OLLMO.",
  "OLLLMDO",
  "OLLLMDO",
  "OLLMMDO",
  "OLLMMDO",
  "OLLMMDO",
  "OLLMDDO",
  "OLMMDDO",
  ".OMDDO.",
  "..OOO..",
];
export type RupeeKind = "green" | "blue";
const RUPEE_COLORS: Record<RupeeKind, Record<"O" | "L" | "M" | "D", Rgb>> = {
  green: { O: [16, 72, 36], L: [150, 244, 150], M: [56, 196, 84], D: [26, 128, 56] },
  blue: { O: [18, 30, 100], L: [170, 210, 255], M: [72, 128, 240], D: [36, 76, 176] },
};

/** The ALttP rupee: a hexagonal gem with a light and a dark facet. Frames 1 to
 *  3 run a white glint down the light facet. */
export function rupeeFrames(kind: RupeeKind): HTMLCanvasElement[] {
  const pal = RUPEE_COLORS[kind];
  const glints = [[], [[2, 2]], [[2, 3], [2, 4], [3, 3]], [[2, 6], [2, 7]]];
  return glints.map((glint) => {
    const r = new Raster(7, 11);
    RUPEE.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && r.set(x, y, pal[ch as "O" | "L" | "M" | "D"])));
    for (const [x, y] of glint) r.set(x, y, [255, 255, 255]);
    return r.canvas();
  });
}

/** The four-point sparkle, small to full and back. */
export function sparkleFrames(): HTMLCanvasElement[] {
  const hot: Rgb = [255, 255, 255];
  const soft: Rgb = [176, 255, 206];
  return [1, 2, 3].map((size) => {
    const r = new Raster(7, 7);
    r.set(3, 3, hot);
    for (let d = 1; d < size; d++) {
      const c = d === size - 1 && size > 1 ? soft : hot;
      r.set(3 + d, 3, c);
      r.set(3 - d, 3, c);
      r.set(3, 3 + d, c);
      r.set(3, 3 - d, c);
    }
    if (size === 3) for (const [x, y] of [[2, 2], [4, 2], [2, 4], [4, 4]]) r.set(x, y, soft);
    return r.canvas();
  });
}

/** Chimney smoke: round puffs that grow as they rise. */
export function smokeFrames(): HTMLCanvasElement[] {
  return [2, 3, 4, 5].map((d) => {
    const r = new Raster(d, d);
    const c = (d - 1) / 2;
    for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) if ((i - c) ** 2 + (j - c) ** 2 <= (d / 2) ** 2 + 0.1) r.set(i, j, [150, 152, 184]);
    return r.canvas();
  });
}
