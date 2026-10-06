import * as THREE from "three";

/** A seeded random, so the room is the same every visit. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function texture(c: HTMLCanvasElement, srgb: boolean, anisotropy: number) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}

/** Grain running along a board: long wavering streaks, darker and lighter,
 *  the odd knot. Drawn across `w` by `h` pixels from (x, y). */
function grain(g: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, base: [number, number, number]) {
  const [r, gr, b] = base;
  g.fillStyle = `rgb(${r},${gr},${b})`;
  g.fillRect(x, y, w, h);
  for (let i = 0; i < h * 0.9; i++) {
    const yy = y + rand() * h;
    const dark = rand() < 0.55;
    const k = dark ? -(10 + rand() * 26) : 6 + rand() * 16;
    g.strokeStyle = `rgba(${r + k},${gr + k * 0.85},${b + k * 0.7},${0.12 + rand() * 0.22})`;
    g.lineWidth = 0.6 + rand() * 1.8;
    g.beginPath();
    const amp = 0.6 + rand() * 2.4;
    const f = 0.004 + rand() * 0.01;
    const ph = rand() * 6.3;
    for (let xx = 0; xx <= w; xx += 8) {
      const yv = yy + Math.sin(xx * f + ph) * amp;
      if (xx === 0) g.moveTo(x + xx, yv);
      else g.lineTo(x + xx, yv);
    }
    g.stroke();
  }
  if (rand() < 0.35) {
    const kx = x + rand() * w;
    const ky = y + h * (0.25 + rand() * 0.5);
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = `rgba(${r - 50},${gr - 45},${b - 40},${0.25 - k * 0.03})`;
      g.lineWidth = 1.2;
      g.beginPath();
      g.ellipse(kx, ky, 6 + k * 5, 2 + k * 2.2, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

/** Light oak floorboards, a texture 2 m square: boards 18 cm wide in
 *  staggered lengths, each its own tone, the seams a hair darker. */
export function oakPlanks(anisotropy: number) {
  const S = 1024;
  const { c, g } = canvas(S, S);
  const rand = seeded(1207);
  const board = S * (0.18 / 2);
  for (let row = 0; row * board < S; row++) {
    let x = -rand() * S * 0.5;
    while (x < S) {
      const len = S * (0.45 + rand() * 0.5);
      const t = rand();
      const base: [number, number, number] = [Math.round(206 + t * 22), Math.round(176 + t * 20), Math.round(136 + t * 18)];
      grain(g, rand, x, row * board, len, board, base);
      g.fillStyle = "rgba(70,45,25,0.55)";
      g.fillRect(x, row * board, 2, board);
      x += len;
    }
    g.fillStyle = "rgba(70,45,25,0.5)";
    g.fillRect(0, row * board, S, 1.5);
  }
  return texture(c, true, anisotropy);
}

/** One wide plank of oak, for a desk top or a shelf: 1 m square of grain. */
export function oakBoard(anisotropy: number) {
  const S = 512;
  const { c, g } = canvas(S, S);
  grain(g, seeded(77), 0, 0, S, S, [205, 166, 118]);
  return texture(c, true, anisotropy);
}

/** A leaf's shape on its card, white on clear: an alpha map for foliage,
 *  midrib and veins a touch darker (its colour comes from the material). */
export function leafMask(anisotropy: number) {
  const S = 256;
  const { c, g } = canvas(S, S);
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(S * 0.5, S * 0.02);
  g.bezierCurveTo(S * 0.98, S * 0.25, S * 0.86, S * 0.78, S * 0.5, S * 0.98);
  g.bezierCurveTo(S * 0.14, S * 0.78, S * 0.02, S * 0.25, S * 0.5, S * 0.02);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(S * 0.5, S * 0.06);
  g.lineTo(S * 0.5, S * 0.96);
  g.stroke();
  g.lineWidth = 1.5;
  for (let i = 1; i < 7; i++) {
    const y = S * (0.12 + i * 0.12);
    g.beginPath();
    g.moveTo(S * 0.5, y);
    g.quadraticCurveTo(S * 0.66, y - S * 0.06, S * 0.8, y - S * 0.12);
    g.moveTo(S * 0.5, y);
    g.quadraticCurveTo(S * 0.34, y - S * 0.06, S * 0.2, y - S * 0.12);
    g.stroke();
  }
  const t = texture(c, true, anisotropy);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Fine noise for a matte surface's roughness: plaster, powder coat, fabric. */
export function speckle(anisotropy: number) {
  const S = 256;
  const { c, g } = canvas(S, S);
  const img = g.createImageData(S, S);
  const rand = seeded(31);
  for (let i = 0; i < S * S; i++) {
    const v = 150 + rand() * 105;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return texture(c, false, anisotropy);
}
