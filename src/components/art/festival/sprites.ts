import { rng } from "./math";
import { rgba, type RGB } from "./palette";

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  return ctx;
}

/** A soft round glow in one colour with a gaussian falloff, drawn once and
 *  stamped many times (a gradient per blob per frame would cost far more). */
export function glowSprite(c: RGB, size = 128): HTMLCanvasElement {
  const cv = canvas(size, size);
  const ctx = ctx2d(cv);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    g.addColorStop(t, rgba(c, Math.exp(-t * t * 5) * (1 - t * t)));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

/** Tileable smoke: four octaves of value noise on a torus, stored as alpha.
 *  Carved out of the light layer it turns flat beams into beams through haze. */
export function smokeTexture(size = 128, seed = 11): HTMLCanvasElement {
  const r = rng(seed);
  const cv = canvas(size, size);
  const ctx = ctx2d(cv);
  const img = ctx.createImageData(size, size);
  const acc = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let period = 4; period <= 32; period *= 2) {
    const lattice = new Float32Array(period * period).map(() => r());
    const cell = size / period;
    for (let y = 0; y < size; y++) {
      const gy = y / cell;
      const y0 = Math.floor(gy) % period;
      const y1 = (y0 + 1) % period;
      let fy = gy - Math.floor(gy);
      fy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = x / cell;
        const x0 = Math.floor(gx) % period;
        const x1 = (x0 + 1) % period;
        let fx = gx - Math.floor(gx);
        fx = fx * fx * (3 - 2 * fx);
        const a = lattice[y0 * period + x0] + (lattice[y0 * period + x1] - lattice[y0 * period + x0]) * fx;
        const b = lattice[y1 * period + x0] + (lattice[y1 * period + x1] - lattice[y1 * period + x0]) * fx;
        acc[y * size + x] += (a + (b - a) * fy) * amp;
      }
    }
    total += amp;
    amp *= 0.55;
  }
  for (let i = 0; i < acc.length; i++) {
    const v = acc[i] / total;
    const a = Math.min(1, Math.max(0, (v - 0.32) * 2.4));
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = a * a * 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** Plain white-noise grain, stamped at a whisper of alpha to dither gradients. */
export function grainTile(size = 128, seed = 5): HTMLCanvasElement {
  const r = rng(seed);
  const cv = canvas(size, size);
  const ctx = ctx2d(cv);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** A unit heart (height 1, centred on 0,0) from the classic parametric curve. */
export function heartPath(): Path2D {
  const p = new Path2D();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const px = x / 30;
    const py = (y - 2.2) / 30;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.closePath();
  return p;
}
