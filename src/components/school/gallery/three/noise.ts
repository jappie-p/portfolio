import * as THREE from "three";

/** A seeded generator (mulberry32), so the plaster looks the same every visit. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable fractal value noise over a size by size grid, 0..1. */
function fbm(size: number, period: number, octaves: number, seed: number): Float32Array {
  const out = new Float32Array(size * size);
  const rand = rng(seed);
  let amp = 1;
  let total = 0;
  for (let o = 0, p = period; o < octaves; o++, p *= 2) {
    const lattice = Float32Array.from({ length: p * p }, rand);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * p;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * p;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const a = lattice[(y0 % p) * p + (x0 % p)];
        const b = lattice[(y0 % p) * p + ((x0 + 1) % p)];
        const c = lattice[((y0 + 1) % p) * p + (x0 % p)];
        const d = lattice[((y0 + 1) % p) * p + ((x0 + 1) % p)];
        out[y * size + x] += amp * (a + (b - a) * sx + (c - a + (a - b - c + d) * sx) * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** The shared noise: r fine plaster, g broad mottling, b and a the slope of r
 *  (a bump the spots' grazing light picks out). Repeats seamlessly. */
export function noiseTexture(size = 256): THREE.DataTexture {
  const fine = fbm(size, 16, 4, 7);
  const broad = fbm(size, 4, 3, 19);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const dx = fine[y * size + ((x + 1) % size)] - fine[y * size + ((x - 1 + size) % size)];
      const dy = fine[((y + 1) % size) * size + x] - fine[((y - 1 + size) % size) * size + x];
      data[i * 4] = fine[i] * 255;
      data[i * 4 + 1] = broad[i] * 255;
      data[i * 4 + 2] = Math.min(Math.max(128 + dx * 900, 0), 255);
      data[i * 4 + 3] = Math.min(Math.max(128 + dy * 900, 0), 255);
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
