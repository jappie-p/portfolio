import { pack, type Rgb } from "./color";

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

export function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** A pixel buffer we paint one whole pixel at a time, then upload once. */
export class Raster {
  readonly img: ImageData;
  readonly px: Uint32Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.img = new ImageData(Math.max(1, w), Math.max(1, h));
    this.px = new Uint32Array(this.img.data.buffer);
  }

  set(x: number, y: number, c: Rgb, a = 255) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = pack(c, a);
  }

  /** Reads back a pixel's colour, or undefined where nothing is painted. */
  get(x: number, y: number): Rgb | undefined {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    const v = this.px[y * this.w + x];
    return v >>> 24 ? [v & 255, (v >>> 8) & 255, (v >>> 16) & 255] : undefined;
  }

  rect(x: number, y: number, w: number, h: number, c: Rgb) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }

  canvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    context(c).putImageData(this.img, 0, 0);
    return c;
  }
}
