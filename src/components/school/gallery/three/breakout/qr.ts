/** A QR code that scans, small enough to write out: version 3 (29 by 29
 *  modules), error correction M (one block of 44 data and 26 check
 *  codewords), byte mode, so up to 42 bytes of text. After ISO 18004 and
 *  Nayuki's reference encoder. */

const SIZE = 29;
const DATA = 44;
const CHECK = 26;
/** Format bits of level M. */
const LEVEL_M = 0;

/** Multiply in GF(256) over x^8 + x^4 + x^3 + x^2 + 1. */
function mul(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

/** The Reed-Solomon check codewords of `data`, `degree` of them. */
export function reedSolomon(data: number[], degree: number): number[] {
  const divisor = new Array<number>(degree).fill(0);
  divisor[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      divisor[j] = mul(divisor[j], root);
      if (j + 1 < degree) divisor[j] ^= divisor[j + 1];
    }
    root = mul(root, 2);
  }
  const out = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ (out.shift() as number);
    out.push(0);
    divisor.forEach((d, i) => (out[i] ^= mul(d, factor)));
  }
  return out;
}

/** The text's codewords: mode, length, its bytes, then padding. */
function codewords(text: string) {
  const bytes = [...new TextEncoder().encode(text)];
  if (bytes.length > DATA - 2) throw new Error(`QR: ${bytes.length} bytes is more than version 3-M holds`);
  const bits: number[] = [];
  const put = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, DATA * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((v, b) => (v << 1) | b, 0));
  for (let pad = 0xec; data.length < DATA; pad ^= 0xec ^ 0x11) data.push(pad);
  return [...data, ...reedSolomon(data, CHECK)];
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** How bad a mask looks to a scanner: runs, blocks, finder look-alikes, balance. */
function penalty(m: boolean[][]) {
  let score = 0;
  const lines = [...m, ...m[0].map((_, x) => m.map((row) => row[x]))];
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= SIZE; i++) {
      if (i < SIZE && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    const s = line.map((d) => (d ? 1 : 0)).join("");
    for (const p of ["10111010000", "00001011101"]) for (let i = s.indexOf(p); i >= 0; i = s.indexOf(p, i + 1)) score += 40;
  }
  for (let y = 0; y + 1 < SIZE; y++)
    for (let x = 0; x + 1 < SIZE; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
  const dark = m.flat().filter(Boolean).length;
  return score + 10 * Math.floor(Math.abs((dark * 100) / (SIZE * SIZE) - 50) / 5);
}

/** The modules of `text` as rows of dark (true) and light, quiet zone not included. */
export function qrModules(text: string): boolean[][] {
  const m = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));
  const fixed = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    m[y][x] = dark;
    fixed[y][x] = true;
  };
  for (let i = 0; i < SIZE; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [SIZE - 4, 3],
    [3, SIZE - 4],
  ])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) set(x, y, d !== 2 && d !== 4);
      }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(22 + dx, 22 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  const format = (mask: number) => {
    const data = (LEVEL_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(SIZE - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, SIZE - 15 + i, bit(i));
    set(8, SIZE - 8, true);
  };
  format(0);

  // the codewords zigzag up and down two columns at a time from the bottom
  // right, stepping over the vertical timing pattern
  const words = codewords(text);
  let i = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < SIZE; v++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? SIZE - 1 - v : v;
        if (fixed[y][x] || i >= words.length * 8) continue;
        m[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
        i++;
      }
  }

  const flip = (mask: number) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!fixed[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
  };
  let best = 0;
  let least = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    flip(mask);
    format(mask);
    const p = penalty(m);
    if (p < least) [least, best] = [p, mask];
    flip(mask);
  }
  flip(best);
  format(best);
  return m;
}
