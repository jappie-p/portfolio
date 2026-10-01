import { context, makeCanvas } from "./canvas";

/** Box widths whose three passes approximate a Gaussian of `sigma`. */
function boxWidths(sigma: number): number[] {
  const n = 3;
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let lo = Math.floor(ideal);
  if (lo % 2 === 0) lo--;
  const hi = lo + 2;
  const m = Math.round((12 * sigma * sigma - n * lo * lo - 4 * n * lo - 3 * n) / (-4 * lo - 4));
  return [0, 1, 2].map((i) => (i < m ? lo : hi));
}

function passH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      dst[row + x] = acc * norm;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
}

function passV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const norm = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = acc * norm;
      acc += src[Math.min(h - 1, y + r + 1) * w + x] - src[Math.max(0, y - r) * w + x];
    }
  }
}

/** Blur a canvas in place: three box passes over premultiplied pixels, which
 *  looks Gaussian and never fringes dark at transparent edges. */
export function blurCanvas(canvas: HTMLCanvasElement, sigma: number) {
  if (sigma < 0.35) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3] / 255;
    ch[0][i] = d[i * 4] * a;
    ch[1][i] = d[i * 4 + 1] * a;
    ch[2][i] = d[i * 4 + 2] * a;
    ch[3][i] = d[i * 4 + 3];
  }
  const tmp = new Float32Array(n);
  for (const size of boxWidths(sigma)) {
    const r = (size - 1) >> 1;
    if (r < 1) continue;
    for (const c of ch) {
      passH(c, tmp, w, h, r);
      passV(tmp, c, w, h, r);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = ch[3][i];
    const inv = a > 0.01 ? 255 / a : 0;
    d[i * 4] = ch[0][i] * inv;
    d[i * 4 + 1] = ch[1][i] * inv;
    d[i * 4 + 2] = ch[2][i] * inv;
    d[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
}

let gpuBlur: boolean | null = null;

/** Whether canvas `filter` really blurs here (Chrome, Firefox, Safari 18+):
 *  checked once by blurring a dot and looking beside it. */
function canFilter(): boolean {
  if (gpuBlur !== null) return gpuBlur;
  gpuBlur = false;
  if (typeof CanvasRenderingContext2D === "undefined" || !("filter" in CanvasRenderingContext2D.prototype)) return gpuBlur;
  const c = makeCanvas(9, 9);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return gpuBlur;
  ctx.filter = "blur(2px)";
  ctx.fillStyle = "#fff";
  ctx.fillRect(4, 4, 1, 1);
  gpuBlur = ctx.getImageData(1, 4, 1, 1).data[3] > 0;
  return gpuBlur;
}

/** A blurred copy of `src`; draw it scaled back up by 1 / scale. Where the
 *  canvas `filter` works the blur runs on the GPU and nothing is read back
 *  (a readback stalls on the GPU, ~5 ms each, whatever the size). Elsewhere a
 *  CPU box blur runs on a copy shrunk until about 1.25 px of blur is left. */
export function blurred(src: HTMLCanvasElement, sigma: number): { canvas: HTMLCanvasElement; scale: number } {
  if (canFilter()) {
    const scale = sigma > 6 ? Math.max(0.2, 6 / sigma) : 1;
    const c = makeCanvas(src.width * scale, src.height * scale);
    const ctx = context(c);
    ctx.filter = `blur(${(sigma * scale).toFixed(2)}px)`;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return { canvas: c, scale: c.width / src.width };
  }
  const scale = sigma > 1.25 ? Math.max(0.12, 1.25 / sigma) : 1;
  const c = makeCanvas(src.width * scale, src.height * scale);
  const ctx = context(c, { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  blurCanvas(c, sigma * scale);
  return { canvas: c, scale: c.width / src.width };
}
