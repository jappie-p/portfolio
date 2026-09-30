import * as THREE from "three";
import { mulberry32 } from "./rng";

// Every texture in the scene is drawn here at runtime: nothing to download,
// and it stays sharp because each is sized for how big it gets on screen.

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

export function toTexture(c: HTMLCanvasElement, opts: { color?: boolean; repeat?: number; flipY?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.flipY = opts.flipY ?? true;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat, opts.repeat);
  }
  t.needsUpdate = true;
  return t;
}

/** White-hot impact flare: a soft core with thin radiating rays. */
export function starTexture() {
  const [c, g] = canvas(512);
  const m = 256;
  g.globalCompositeOperation = "lighter";
  const core = g.createRadialGradient(m, m, 0, m, m, m);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.08, "rgba(255,240,240,0.9)");
  core.addColorStop(0.25, "rgba(255,120,130,0.28)");
  core.addColorStop(1, "rgba(255,40,60,0)");
  g.fillStyle = core;
  g.fillRect(0, 0, 512, 512);
  const rnd = mulberry32(7);
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2;
    const len = m * (0.45 + rnd() * 0.55);
    const w = 1 + rnd() * 2.5;
    const grad = g.createLinearGradient(m, m, m + Math.cos(a) * len, m + Math.sin(a) * len);
    grad.addColorStop(0, "rgba(255,235,235,0.95)");
    grad.addColorStop(1, "rgba(255,60,80,0)");
    g.strokeStyle = grad;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(m, m);
    g.lineTo(m + Math.cos(a) * len, m + Math.sin(a) * len);
    g.stroke();
  }
  return toTexture(c, { color: true });
}

/** Round soft glow for halos and light pools. */
export function glowTexture() {
  const [c, g] = canvas(256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.14)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return toTexture(c, { color: true });
}

/** Data-centre floor tiles: albedo plus a roughness map with glossier tile faces than seams. */
export function floorTextures(repeat: number) {
  const size = 1024;
  const tiles = 8;
  const step = size / tiles;
  const [ca, a] = canvas(size);
  const [cr, r] = canvas(size);
  const rnd = mulberry32(21);
  a.fillStyle = "#070b12";
  a.fillRect(0, 0, size, size);
  r.fillStyle = "#b0b0b0";
  r.fillRect(0, 0, size, size);
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const v = 30 + Math.floor(rnd() * 12);
      a.fillStyle = `rgb(${v - 4},${v},${v + 8})`;
      a.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
      const gloss = 40 + Math.floor(rnd() * 40);
      r.fillStyle = `rgb(${gloss},${gloss},${gloss})`;
      r.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
      // faint circuit traces on some tiles
      if (rnd() < 0.35) {
        a.strokeStyle = "rgba(60,110,150,0.35)";
        a.lineWidth = 2;
        a.beginPath();
        const ox = x * step + 16 + rnd() * 40;
        const oy = y * step + 16 + rnd() * 40;
        a.moveTo(ox, oy);
        a.lineTo(ox + 30 + rnd() * 40, oy);
        a.lineTo(ox + 50 + rnd() * 30, oy + 30 + rnd() * 30);
        a.stroke();
        a.fillStyle = "rgba(90,160,210,0.5)";
        a.fillRect(ox - 3, oy - 3, 6, 6);
      }
    }
  }
  return {
    map: toTexture(ca, { color: true, repeat }),
    roughness: toTexture(cr, { repeat }),
  };
}

/** Rack fronts: drive bays (albedo) and status LEDs (emissive). */
export function rackTextures() {
  const w = 256;
  const h = 512;
  const [ca, a] = canvas(w, h);
  const [ce, e] = canvas(w, h);
  const rnd = mulberry32(99);
  a.fillStyle = "#0b1017";
  a.fillRect(0, 0, w, h);
  e.fillStyle = "#000";
  e.fillRect(0, 0, w, h);
  const leds = ["#3dff9a", "#35d6ff", "#2f7dff", "#3dff9a", "#35d6ff"];
  for (let y = 14; y < h - 14; y += 22) {
    a.fillStyle = "#18202b";
    a.fillRect(12, y, w - 24, 17);
    a.fillStyle = "#0e141c";
    for (let x = 60; x < w - 30; x += 9) a.fillRect(x, y + 3, 5, 11);
    for (let k = 0; k < 3; k++) {
      if (rnd() < 0.2) continue;
      e.fillStyle = leds[Math.floor(rnd() * leds.length)];
      e.fillRect(20 + k * 11, y + 6, 6, 5);
    }
    if (rnd() < 0.25) {
      e.fillStyle = "rgba(53,214,255,0.55)";
      e.fillRect(60, y + 7, 40 + rnd() * 90, 2);
    }
  }
  return { map: toTexture(ca, { color: true }), emissive: toTexture(ce, { color: true }) };
}
