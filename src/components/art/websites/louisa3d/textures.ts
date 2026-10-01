import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { LIP_MAX, lipShape } from "./geometry";

const SIZE = 1024;

// from the lip back into the rock: a quartz lip, agate banding, then crust
const BANDS: [number, string][] = [
  [1.0, "#cfc4f7"],
  [0.976, "#4a2d8c"],
  [0.95, "#a48ae4"],
  [0.922, "#2d1c5a"],
  [0.89, "#7a5cc6"],
  [0.868, "#211540"],
  [0.826, "#6a50ae"],
  [0.806, "#ebe6f8"],
  [0.794, "#1c1332"],
  [0.746, "#584295"],
  [0.7, "#181125"],
  [0.674, "#8678ab"],
  [0.65, "#120d1b"],
];

/**
 * A polished geode slice: quartz at the lip, wavy agate bands following the
 * outline (the same lipShape as the wall geometry, so they line up), fine
 * hairlines, then dark speckled crust. Drawn once per seed.
 */
function paintBands(seed: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  const rnd = mulberry32(seed * 31 + 7);
  const scale = SIZE / 2 / LIP_MAX;
  const m = SIZE / 2;
  // canvas y runs down, the wall's y up: angle a here is -a on the wall
  const curve = (k: number, jitter: number, ph: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const a = (i / 360) * Math.PI * 2;
      const r = scale * k * lipShape(-a, seed) + Math.sin(a * 9 + ph) * jitter + Math.sin(a * 23 + ph * 2) * jitter * 0.4;
      if (i) ctx.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
      else ctx.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  ctx.fillStyle = "#0f0c14";
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (const [k, col] of BANDS) {
    curve(k, scale * 0.004, rnd() * 6);
    ctx.fillStyle = col;
    ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    curve(0.66 + rnd() * 0.33, scale * 0.003, rnd() * 6);
    ctx.lineWidth = 0.8 + rnd() * 1.2;
    ctx.strokeStyle = `rgba(232,226,252,${0.08 + rnd() * 0.2})`;
    ctx.stroke();
  }
  // crust: dark and speckled
  curve(0.62, scale * 0.02, 1);
  ctx.fillStyle = "#0e0b12";
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 2600; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * scale * 0.62 * lipShape(-a, seed);
    ctx.fillStyle = `rgba(${150 + rnd() * 60},${140 + rnd() * 50},${160 + rnd() * 60},${0.04 + rnd() * 0.08})`;
    ctx.fillRect(m + Math.cos(a) * r, m + Math.sin(a) * r, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
  }
  ctx.restore();
  // druzy: a sugar of tiny crystals along the lip
  for (let i = 0; i < 1600; i++) {
    const a = rnd() * Math.PI * 2;
    const r = scale * (0.955 + rnd() * 0.05) * lipShape(-a, seed);
    const s = 0.8 + rnd() * rnd() * 3;
    ctx.fillStyle = rnd() < 0.35 ? `rgba(255,255,255,${0.3 + rnd() * 0.6})` : `rgba(206,188,255,${0.25 + rnd() * 0.5})`;
    ctx.fillRect(m + Math.cos(a) * r, m + Math.sin(a) * r, s, s);
  }
  return c;
}

/** Where the cut face is polished (the bands, dark here) and where it is
 *  raw crust (light): the green channel scales roughness and clear coat. */
function paintPolish(seed: number): HTMLCanvasElement {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const scale = size / 2 / LIP_MAX;
  const m = size / 2;
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(0, 0, size, size);
  const ring = (k: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r = scale * k * lipShape(-a, seed);
      if (i) ctx.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
      else ctx.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  // polished bands: smooth (0.08 of the material's roughness 1)
  ring(1.0);
  ctx.fillStyle = "rgb(20,20,20)";
  ctx.fill();
  // the crust inside stays raw
  ring(0.63);
  ctx.fillStyle = "rgb(235,235,235)";
  ctx.fill();
  return c;
}

/** Labradorite's schiller is patchy: soft blobs of brightness (green
 *  channel, which drives the thin-film thickness) crossed by fine lamellae,
 *  so the colour flashes in patches and streaks. Plain Canvas 2D: a few
 *  gradients, no per-pixel work. */
function paintSchiller(seed: number): HTMLCanvasElement {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const rnd = mulberry32(seed);
  ctx.fillStyle = "rgb(110,110,110)";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 16; i++) {
    const x = rnd() * s;
    const y = rnd() * s;
    const r = s * (0.12 + rnd() * 0.3);
    const v = Math.round(rnd() * 255);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${v},${v},0.85)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  ctx.globalAlpha = 0.07;
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const y = rnd() * s * 1.6 - s * 0.3;
    ctx.strokeStyle = rnd() < 0.5 ? "#fff" : "#000";
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(s + 10, y - s * 0.55);
    ctx.stroke();
  }
  return c;
}

/** Textures for one mount of the scene, made on demand and disposed together. */
export class TextureBank {
  private readonly made = new Map<string, THREE.Texture>();

  bands(seed: number): THREE.Texture {
    return this.get(`bands/${seed}`, () => {
      const t = new THREE.CanvasTexture(paintBands(seed));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    });
  }

  polish(seed: number): THREE.Texture {
    return this.get(`polish/${seed}`, () => new THREE.CanvasTexture(paintPolish(seed)));
  }

  schiller(seed: number): THREE.Texture {
    return this.get(`schiller/${seed}`, () => new THREE.CanvasTexture(paintSchiller(seed)));
  }

  private get(key: string, make: () => THREE.Texture): THREE.Texture {
    let t = this.made.get(key);
    if (!t) {
      t = make();
      this.made.set(key, t);
    }
    return t;
  }

  dispose() {
    for (const t of this.made.values()) t.dispose();
    this.made.clear();
  }
}
