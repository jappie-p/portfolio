/** The field's geometry: one flat-top hexagonal prism to instance, and the
 *  grid of column positions covering a rectangle of the floor. Pure maths. */

const SQRT3 = Math.sqrt(3);

/** One column template, circumradius 1, foot at y 0 and top at y 1, as
 *  interleaved floats per vertex: position (3), normal (3), uv (2), top (1).
 *  Sides carry uv = (across the face, up the face); the top is a fan. */
export function prism(): { data: Float32Array; count: number; stride: number } {
  const corners = Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3), Math.sin((i * Math.PI) / 3)]);
  const out: number[] = [];
  const v = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number, top: number) =>
    out.push(x, y, z, nx, ny, nz, u, w, top);
  for (let i = 0; i < 6; i++) {
    const [ax, az] = corners[i];
    const [bx, bz] = corners[(i + 1) % 6];
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const ml = Math.hypot(mx, mz);
    const nx = mx / ml;
    const nz = mz / ml;
    v(ax, 0, az, nx, 0, nz, 0, 0, 0);
    v(bx, 0, bz, nx, 0, nz, 1, 0, 0);
    v(bx, 1, bz, nx, 0, nz, 1, 1, 0);
    v(ax, 0, az, nx, 0, nz, 0, 0, 0);
    v(bx, 1, bz, nx, 0, nz, 1, 1, 0);
    v(ax, 1, az, nx, 0, nz, 0, 1, 0);
    v(0, 1, 0, 0, 1, 0, 0, 0, 1);
    v(ax, 1, az, 0, 1, 0, 0, 0, 1);
    v(bx, 1, bz, 0, 1, 0, 0, 0, 1);
  }
  return { data: new Float32Array(out), count: out.length / 9, stride: 9 };
}

/** A stable 0..1 number per cell. */
export function cellSeed(q: number, r: number): number {
  const n = Math.sin(q * 127.1 + r * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Centres of a flat-top hex grid (centres √3 apart) inside x ∈ [-halfWidth,
 *  halfWidth] and z ∈ [far, near], each with its seed: x, z, seed. */
export function columns(halfWidth: number, far: number, near: number): Float32Array {
  const out: number[] = [];
  const qMax = Math.ceil(halfWidth / 1.5);
  for (let q = -qMax; q <= qMax; q++) {
    const x = 1.5 * q;
    if (Math.abs(x) > halfWidth) continue;
    const rMin = Math.floor(far / SQRT3 - q / 2);
    const rMax = Math.ceil(near / SQRT3 - q / 2);
    for (let r = rMin; r <= rMax; r++) {
      const z = SQRT3 * (r + q / 2);
      if (z < far || z > near) continue;
      out.push(x, z, cellSeed(q, r));
    }
  }
  return new Float32Array(out);
}
